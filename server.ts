import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { createServer as createViteServer } from 'vite';

// Types
interface UserDoc {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  isVerified: boolean;
  verificationCode?: string;
  verificationCodeExpires?: number;
  homeCurrency: string;
  createdAt: string;
}

interface TripDoc {
  id: string;
  userId: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  exchangeRate: number;
  members: string[];
  plans?: any[];
  checklist?: any[];
  createdAt: string;
}

interface ExpenseDoc {
  id: string;
  tripId: string;
  userId: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  paidBy: string;
  splitBetween: string[];
  notes?: string;
  createdAt: string;
}

interface EmailLogDoc {
  id: string;
  to: string;
  subject: string;
  type: 'verification' | 'reset';
  code: string;
  status: 'sent_resend' | 'simulated_no_key' | 'failed';
  error?: string;
  timestamp: string;
}

interface DatabaseSchema {
  users: UserDoc[];
  trips: TripDoc[];
  expenses: ExpenseDoc[];
  emailLogs: EmailLogDoc[];
}

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rumbio_super_secure_jwt_secret_2026_travel_finance';
const DATA_FILE = path.join(process.cwd(), '.rumbio_db.json');

// Resend lazy initialization
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  return new Resend(apiKey.trim());
}

// Database persistent store helper
function loadDb(): DatabaseSchema {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading DB file, using fresh DB:', err);
  }
  return { users: [], trips: [], expenses: [], emailLogs: [] };
}

function saveDb(db: DatabaseSchema): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving DB file:', err);
  }
}

// Seed sample trip for new user
function seedInitialTrip(userId: string, userName: string, homeCurrency: string, db: DatabaseSchema) {
  const sampleTripId = 'trip_' + Date.now();
  const today = new Date().toISOString().split('T')[0];
  const sampleTrip: TripDoc = {
    id: sampleTripId,
    userId,
    name: 'Aventura en Japón 🇯🇵',
    destination: 'Tokio, Kioto & Osaka',
    startDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 24 * 86400000).toISOString().split('T')[0],
    budget: homeCurrency === 'USD' ? 3200 : homeCurrency === 'EUR' ? 2950 : 2500000,
    currency: 'JPY',
    exchangeRate: homeCurrency === 'USD' ? 0.0066 : homeCurrency === 'EUR' ? 0.0061 : 5.8,
    members: ['Yo', 'Carlos', 'Valeria'],
    checklist: [
      { id: 'chk_1', title: 'Pasaporte vigente (mínimo 6 meses)', category: 'Documentos', isCompleted: true },
      { id: 'chk_2', title: 'Comprar pase de tren JR Pass', category: 'Pagos', amount: 350, dueDate: '2026-08-25', isCompleted: true },
      { id: 'chk_3', title: 'Contratar seguro médico internacional', category: 'Salud', amount: 95, dueDate: '2026-08-20', isCompleted: true },
      { id: 'chk_4', title: 'Activar tarjeta eSIM de datos ilimitados', category: 'Reservas', amount: 30, isCompleted: false },
      { id: 'chk_5', title: 'Reservar entrada a teamLab Planets', category: 'Reservas', amount: 38, isCompleted: false },
    ],
    plans: [
      { id: 'pl_1', category: 'Alojamiento', estimatedAmount: 1100, notes: 'Hoteles en Shinjuku y Ryokan tradicional en Kioto' },
      { id: 'pl_2', category: 'Comida', estimatedAmount: 850, notes: 'Ramen, sushi en Tsukiji y comida callejera en Dotonbori' },
      { id: 'pl_3', category: 'Transporte', estimatedAmount: 450, notes: 'Shinkansen bala y metro de Tokio' },
      { id: 'pl_4', category: 'Actividades', estimatedAmount: 380, notes: 'Templos, museos y mirador Shibuya Sky' },
      { id: 'pl_5', category: 'Compras', estimatedAmount: 300, notes: 'Souvenirs en Akihabara y té matcha' },
      { id: 'pl_6', category: 'Imprevistos', estimatedAmount: 120, notes: 'Fondo de emergencia' },
    ],
    createdAt: new Date().toISOString(),
  };

  const sampleExpenses: ExpenseDoc[] = [
    {
      id: 'exp_1',
      tripId: sampleTripId,
      userId,
      title: 'Hotel Gracery Shinjuku (3 Noches)',
      amount: 68000,
      currency: 'JPY',
      category: 'Alojamiento',
      date: today,
      paidBy: 'Yo',
      splitBetween: ['Yo', 'Carlos', 'Valeria'],
      notes: 'Habitación triple con vista a la ciudad',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'exp_2',
      tripId: sampleTripId,
      userId,
      title: 'Cena de Bienvenida: Ramen Ichiran & Gyoza',
      amount: 5400,
      currency: 'JPY',
      category: 'Comida',
      date: today,
      paidBy: 'Carlos',
      splitBetween: ['Yo', 'Carlos', 'Valeria'],
      notes: 'Ramen tonkotsu clásico con extras',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'exp_3',
      tripId: sampleTripId,
      userId,
      title: 'Boletos Tren Shinkansen Tokio - Kioto',
      amount: 42000,
      currency: 'JPY',
      category: 'Transporte',
      date: today,
      paidBy: 'Valeria',
      splitBetween: ['Yo', 'Carlos', 'Valeria'],
      notes: 'Asientos reservados en tren bala',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'exp_4',
      tripId: sampleTripId,
      userId,
      title: 'Entradas Museo Digital teamLab Planets',
      amount: 11400,
      currency: 'JPY',
      category: 'Actividades',
      date: today,
      paidBy: 'Yo',
      splitBetween: ['Yo', 'Carlos', 'Valeria'],
      notes: 'Horario estelar 18:00 hrs',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'exp_5',
      tripId: sampleTripId,
      userId,
      title: 'Té Matcha Ceremonial & Dulces Wagashi en Uji',
      amount: 3200,
      currency: 'JPY',
      category: 'Comida',
      date: today,
      paidBy: 'Yo',
      splitBetween: ['Yo'],
      notes: 'Experiencia tradicional japonesa',
      createdAt: new Date().toISOString(),
    },
  ];

  db.trips.unshift(sampleTrip);
  sampleExpenses.forEach(exp => db.expenses.unshift(exp));
}

// Send Real Email with Resend Helper
async function sendEmailNotification(
  to: string,
  subject: string,
  type: 'verification' | 'reset',
  code: string,
  userName: string
): Promise<{ success: boolean; simulated: boolean; error?: string }> {
  const db = loadDb();
  const resend = getResendClient();
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Rumbio <onboarding@resend.dev>';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050811; color: #ffffff; padding: 24px; margin: 0; }
          .container { max-width: 520px; margin: 0 auto; background-color: #0e1526; border: 1px solid #1e293b; border-radius: 24px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
          .logo { font-size: 26px; font-weight: 900; color: #38bdf8; text-align: center; margin-bottom: 24px; }
          .code-box { background: #050811; border: 2px dashed #0284c7; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0; }
          .code { font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #38bdf8; }
          .badge { display: inline-block; padding: 4px 12px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border-radius: 999px; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 12px; }
          .text { color: #94a3b8; font-size: 14px; line-height: 1.6; }
          .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">✈️ Rumbio<span style="color:#0284c7;">.</span></div>
          <div style="text-align:center;">
            <span class="badge">${type === 'verification' ? 'Verificación de Cuenta' : 'Recuperación de Acceso'}</span>
          </div>
          <h2 style="color:#ffffff; font-size:20px; text-align:center; margin-top:4px;">
            ${type === 'verification' ? '¡Activa tu cuenta de viajero!' : 'Código para restablecer tu contraseña'}
          </h2>
          <p class="text">
            ¡Hola <b>${userName}</b>! ${
              type === 'verification'
                ? 'Te damos la bienvenida a Rumbio, tu gestor de finanzas y presupuestos de viaje. Para completar tu registro de forma segura, introduce el siguiente código OTP de 6 dígitos:'
                : 'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Rumbio. Utiliza el siguiente código temporal de 6 dígitos:'
            }
          </p>
          <div class="code-box">
            <div class="code">${code}</div>
            <p style="margin:8px 0 0 0; font-size:11px; color:#64748b;">Este código expira en 15 minutos.</p>
          </div>
          <p class="text">
            Si no solicitaste esta acción, puedes ignorar este mensaje con total tranquilidad. Tu cuenta e información financiera se mantienen protegidas.
          </p>
          <div class="footer">
            Rumbio • Finanzas de Viajes Seguras • Multi-moneda & División de Gastos
          </div>
        </div>
      </body>
    </html>
  `;

  let logStatus: 'sent_resend' | 'simulated_no_key' | 'failed' = 'simulated_no_key';
  let errorMsg: string | undefined;

  if (resend) {
    try {
      const response = await resend.emails.send({
        from: fromEmail,
        to: [to],
        subject: subject,
        html: htmlContent,
      });

      if (response.error) {
        logStatus = 'failed';
        errorMsg = response.error.message;
        console.warn('Resend API returned error:', response.error);
      } else {
        logStatus = 'sent_resend';
        console.log(`[Resend] Real email dispatched successfully to ${to} (ID: ${response.data?.id})`);
      }
    } catch (err: any) {
      logStatus = 'failed';
      errorMsg = err.message || 'Error communicating with Resend';
      console.error('[Resend] Exception sending email:', err);
    }
  } else {
    console.log(`[Resend] RESEND_API_KEY is not configured. Email code logged for testing: ${code} (recipient: ${to})`);
  }

  // Record audit in email logs
  db.emailLogs.unshift({
    id: 'email_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    to,
    subject,
    type,
    code,
    status: logStatus,
    error: errorMsg,
    timestamp: new Date().toISOString(),
  });
  saveDb(db);

  return {
    success: logStatus === 'sent_resend',
    simulated: logStatus === 'simulated_no_key',
    error: errorMsg,
  };
}

// Auth Middleware: Strict Token Verification
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

function verifyAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso no autorizado. Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string };
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión expirada o token inválido.' });
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // ==========================================
  // API ROUTES
  // ==========================================

  // 1. Health & Config Status
  app.get('/api/health', (req: Request, res: Response) => {
    const hasResend = !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0;
    res.json({
      status: 'ok',
      service: 'Rumbio Financial Engine',
      realEmailConfigured: hasResend,
      resendFrom: process.env.RESEND_FROM_EMAIL || 'Rumbio <onboarding@resend.dev>',
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Email Delivery Diagnostic Logs
  app.get('/api/email-logs', (req: Request, res: Response) => {
    const db = loadDb();
    const hasResend = !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0;
    res.json({
      realEmailConfigured: hasResend,
      logs: db.emailLogs.slice(0, 30),
    });
  });

  // 3. Register User (Hashes password with bcrypt, sends real OTP via Resend)
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { name, email, password, homeCurrency } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener mínimo 6 caracteres.' });
      }

      const db = loadDb();
      const normalizedEmail = email.trim().toLowerCase();

      const existingUser = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
      if (existingUser && existingUser.isVerified) {
        return res.status(400).json({ error: 'Ya existe una cuenta activa con este correo electrónico.' });
      }

      // Cryptographic Password Hashing with real bcrypt (10 rounds)
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

      let user: UserDoc;
      if (existingUser && !existingUser.isVerified) {
        existingUser.name = name.trim();
        existingUser.passwordHash = passwordHash;
        existingUser.verificationCode = code;
        existingUser.verificationCodeExpires = expiresAt;
        existingUser.homeCurrency = homeCurrency || 'USD';
        user = existingUser;
      } else {
        user = {
          id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          isVerified: false,
          verificationCode: code,
          verificationCodeExpires: expiresAt,
          homeCurrency: homeCurrency || 'USD',
          createdAt: new Date().toISOString(),
        };
        db.users.push(user);
      }

      saveDb(db);

      // Send real email via Resend
      const emailResult = await sendEmailNotification(
        normalizedEmail,
        '✈️ Tu código de verificación para activar Rumbio',
        'verification',
        code,
        user.name
      );

      res.status(201).json({
        message: 'Código de verificación generado.',
        email: normalizedEmail,
        realEmailSent: emailResult.success,
        simulated: emailResult.simulated,
        resendConfigured: !emailResult.simulated,
        devCode: emailResult.simulated ? code : undefined,
      });
    } catch (err: any) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Error interno al registrar usuario.' });
    }
  });

  // 4. Verify OTP Code & Activate Account
  app.post('/api/auth/verify-otp', async (req: Request, res: Response) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ error: 'Correo y código de verificación requeridos.' });
      }

      const db = loadDb();
      const normalizedEmail = email.trim().toLowerCase();
      const user = db.users.find(u => u.email === normalizedEmail);

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      if (!user.verificationCode || user.verificationCode !== code.trim()) {
        return res.status(400).json({ error: 'Código de verificación inválido.' });
      }

      if (user.verificationCodeExpires && Date.now() > user.verificationCodeExpires) {
        return res.status(400).json({ error: 'El código ha expirado. Por favor solicita uno nuevo.' });
      }

      user.isVerified = true;
      user.verificationCode = undefined;
      user.verificationCodeExpires = undefined;

      // Seed initial trip if user has none
      const userTrips = db.trips.filter(t => t.userId === user.id);
      if (userTrips.length === 0) {
        seedInitialTrip(user.id, user.name, user.homeCurrency, db);
      }

      saveDb(db);

      // Generate JWT Token
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          homeCurrency: user.homeCurrency,
          createdAt: user.createdAt,
        },
      });
    } catch (err: any) {
      console.error('Verify error:', err);
      res.status(500).json({ error: 'Error al verificar código.' });
    }
  });

  // 5. Resend OTP Code
  app.post('/api/auth/resend-otp', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Correo es obligatorio.' });
      }

      const db = loadDb();
      const normalizedEmail = email.trim().toLowerCase();
      const user = db.users.find(u => u.email === normalizedEmail);

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      user.verificationCode = code;
      user.verificationCodeExpires = Date.now() + 15 * 60 * 1000;
      saveDb(db);

      const emailResult = await sendEmailNotification(
        normalizedEmail,
        '✈️ Nuevo código de verificación - Rumbio',
        'verification',
        code,
        user.name
      );

      res.json({
        message: 'Nuevo código enviado.',
        realEmailSent: emailResult.success,
        simulated: emailResult.simulated,
        devCode: emailResult.simulated ? code : undefined,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al reenviar código.' });
    }
  });

  // 6. Login User (bcrypt compare)
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Correo y contraseña requeridos.' });
      }

      const db = loadDb();
      const normalizedEmail = email.trim().toLowerCase();
      const user = db.users.find(u => u.email === normalizedEmail);

      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas.' });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Credenciales inválidas.' });
      }

      if (!user.isVerified) {
        return res.status(403).json({
          error: 'Cuenta no verificada. Por favor introduce tu código OTP.',
          requiresVerification: true,
          email: user.email,
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          homeCurrency: user.homeCurrency,
          createdAt: user.createdAt,
        },
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Error al iniciar sesión.' });
    }
  });

  // 7. Request Password Reset (Real email via Resend)
  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Correo requerido.' });
      }

      const db = loadDb();
      const normalizedEmail = email.trim().toLowerCase();
      const user = db.users.find(u => u.email === normalizedEmail);

      if (!user) {
        return res.status(404).json({ error: 'No encontramos ninguna cuenta con este correo.' });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      user.verificationCode = code;
      user.verificationCodeExpires = Date.now() + 15 * 60 * 1000;
      saveDb(db);

      const emailResult = await sendEmailNotification(
        normalizedEmail,
        '🔒 Código para restablecer tu contraseña - Rumbio',
        'reset',
        code,
        user.name
      );

      res.json({
        message: 'Código de recuperación enviado.',
        realEmailSent: emailResult.success,
        simulated: emailResult.simulated,
        devCode: emailResult.simulated ? code : undefined,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al solicitar recuperación.' });
    }
  });

  // 8. Reset Password (with bcrypt hash)
  app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      }

      const db = loadDb();
      const normalizedEmail = email.trim().toLowerCase();
      const user = db.users.find(u => u.email === normalizedEmail);

      if (!user || user.verificationCode !== code.trim()) {
        return res.status(400).json({ error: 'Código de recuperación inválido o expirado.' });
      }

      if (user.verificationCodeExpires && Date.now() > user.verificationCodeExpires) {
        return res.status(400).json({ error: 'El código ha expirado.' });
      }

      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      user.verificationCode = undefined;
      user.verificationCodeExpires = undefined;
      user.isVerified = true;
      saveDb(db);

      res.json({ message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al restablecer contraseña.' });
    }
  });

  // 9. Current Authenticated User Profile
  app.get('/api/auth/me', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = loadDb();
    const user = db.users.find(u => u.id === req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      homeCurrency: user.homeCurrency,
      createdAt: user.createdAt,
    });
  });

  app.put('/api/auth/me', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
    const { homeCurrency, name } = req.body;
    const db = loadDb();
    const user = db.users.find(u => u.id === req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    if (homeCurrency) user.homeCurrency = homeCurrency;
    if (name) user.name = name.trim();
    saveDb(db);
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      homeCurrency: user.homeCurrency,
      createdAt: user.createdAt,
    });
  });

  // =========================================================================
  // STRICT DATA ISOLATION ROUTES (TRIPS & EXPENSES)
  // The server enforces: WHERE userId === req.user.id
  // No user can read, create, update, or delete another user's financial data.
  // =========================================================================

  // 10. Trips: Get only user's trips
  app.get('/api/trips', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = loadDb();
    const userTrips = db.trips.filter(t => t.userId === req.user!.id);
    res.json(userTrips);
  });

  // 11. Trips: Create or Update trip (enforces userId = req.user.id)
  app.post('/api/trips', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = loadDb();
    const tripData = req.body;
    const userId = req.user!.id;

    const existingIndex = db.trips.findIndex(t => t.id === tripData.id);

    if (existingIndex >= 0) {
      // Security check: Must belong to current user
      if (db.trips[existingIndex].userId !== userId) {
        return res.status(403).json({ error: 'Acceso denegado. No puedes modificar viajes de otro usuario.' });
      }
      db.trips[existingIndex] = {
        ...db.trips[existingIndex],
        ...tripData,
        userId, // Strictly locked
      };
      saveDb(db);
      return res.json(db.trips[existingIndex]);
    } else {
      const newTrip: TripDoc = {
        id: tripData.id || 'trip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        userId,
        name: tripData.name || 'Nuevo Viaje',
        destination: tripData.destination || 'Destino',
        startDate: tripData.startDate || new Date().toISOString().split('T')[0],
        endDate: tripData.endDate || new Date().toISOString().split('T')[0],
        budget: Number(tripData.budget) || 2000,
        currency: tripData.currency || 'EUR',
        exchangeRate: Number(tripData.exchangeRate) || 1.0,
        members: Array.isArray(tripData.members) && tripData.members.length > 0 ? tripData.members : ['Yo'],
        plans: tripData.plans || [],
        checklist: tripData.checklist || [],
        createdAt: tripData.createdAt || new Date().toISOString(),
      };
      db.trips.unshift(newTrip);
      saveDb(db);
      return res.status(201).json(newTrip);
    }
  });

  // 12. Trips: Delete trip (and cascading expenses)
  app.delete('/api/trips/:id', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = loadDb();
    const tripId = req.params.id;
    const userId = req.user!.id;

    const trip = db.trips.find(t => t.id === tripId);
    if (!trip) {
      return res.status(404).json({ error: 'Viaje no encontrado.' });
    }

    if (trip.userId !== userId) {
      return res.status(403).json({ error: 'Acceso denegado. No puedes eliminar viajes de otro usuario.' });
    }

    db.trips = db.trips.filter(t => t.id !== tripId);
    // Delete all expenses for this trip
    db.expenses = db.expenses.filter(e => !(e.tripId === tripId && e.userId === userId));
    saveDb(db);

    res.json({ message: 'Viaje y gastos asociados eliminados correctamente.' });
  });

  // 13. Expenses: Get only user's expenses
  app.get('/api/expenses', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = loadDb();
    const userId = req.user!.id;
    const tripId = req.query.tripId as string | undefined;

    let userExpenses = db.expenses.filter(e => e.userId === userId);
    if (tripId) {
      userExpenses = userExpenses.filter(e => e.tripId === tripId);
    }

    res.json(userExpenses);
  });

  // 14. Expenses: Create or Update Expense
  app.post('/api/expenses', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = loadDb();
    const expData = req.body;
    const userId = req.user!.id;

    // Check that target trip belongs to user
    const targetTrip = db.trips.find(t => t.id === expData.tripId && t.userId === userId);
    if (!targetTrip) {
      return res.status(403).json({ error: 'El viaje especificado no existe o no te pertenece.' });
    }

    const existingIndex = db.expenses.findIndex(e => e.id === expData.id);

    if (existingIndex >= 0) {
      if (db.expenses[existingIndex].userId !== userId) {
        return res.status(403).json({ error: 'Acceso denegado. No puedes modificar gastos de otro usuario.' });
      }
      db.expenses[existingIndex] = {
        ...db.expenses[existingIndex],
        ...expData,
        userId, // Strictly locked
      };
      saveDb(db);
      return res.json(db.expenses[existingIndex]);
    } else {
      const newExpense: ExpenseDoc = {
        id: expData.id || 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        tripId: expData.tripId,
        userId,
        title: expData.title || 'Gasto',
        amount: Number(expData.amount) || 0,
        currency: expData.currency || targetTrip.currency,
        category: expData.category || 'Comida',
        date: expData.date || new Date().toISOString().split('T')[0],
        paidBy: expData.paidBy || 'Yo',
        splitBetween: Array.isArray(expData.splitBetween) && expData.splitBetween.length > 0 ? expData.splitBetween : ['Yo'],
        notes: expData.notes,
        createdAt: expData.createdAt || new Date().toISOString(),
      };
      db.expenses.unshift(newExpense);
      saveDb(db);
      return res.status(201).json(newExpense);
    }
  });

  // 15. Expenses: Delete Expense
  app.delete('/api/expenses/:id', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
    const db = loadDb();
    const expId = req.params.id;
    const userId = req.user!.id;

    const expense = db.expenses.find(e => e.id === expId);
    if (!expense) {
      return res.status(404).json({ error: 'Gasto no encontrado.' });
    }

    if (expense.userId !== userId) {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }

    db.expenses = db.expenses.filter(e => e.id !== expId);
    saveDb(db);
    res.json({ message: 'Gasto eliminado.' });
  });

  // ==========================================
  // VITE MIDDLEWARE & STATIC ASSET SERVING
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Rumbio Server] Running securely on port ${PORT}`);
    console.log(`[Rumbio Server] Resend status: ${process.env.RESEND_API_KEY ? 'ACTIVE (Real Emails)' : 'UNCONFIGURED (Simulated)'}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start Rumbio server:', err);
});
