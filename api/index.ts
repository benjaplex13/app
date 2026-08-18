import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types
export interface UserDoc {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  isVerified: boolean;
  verificationCode?: string | null;
  verificationCodeExpires?: number | null;
  homeCurrency: string;
  createdAt: string;
}

export interface TripDoc {
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

export interface ExpenseDoc {
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

const JWT_SECRET = process.env.JWT_SECRET || 'rumbio_super_secure_jwt_secret_2026_travel_finance';

// ============================================================================
// SUPABASE CLIENT (Lazy Initialization & Safe Diagnostics)
// ============================================================================
let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseKeyDiagnostics() {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  const rawKey = serviceRoleKey || anonKey;

  const isServiceRoleEnvSet = !!(serviceRoleKey && serviceRoleKey.length > 0);
  const isAnonEnvSet = !!(anonKey && anonKey.length > 0);

  if (!rawKey) {
    return {
      configured: false,
      serviceRoleVarPresent: isServiceRoleEnvSet,
      anonVarPresent: isAnonEnvSet,
      detectedRole: 'none',
      message: 'SUPABASE_SERVICE_ROLE_KEY no está configurada en las variables de entorno.',
    };
  }

  let detectedRole = 'unknown';
  try {
    const parts = rawKey.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      detectedRole = payload.role || 'jwt_without_role';
    } else if (rawKey.startsWith('sbp_')) {
      detectedRole = 'service_role_token';
    }
  } catch {
    detectedRole = 'opaque_token';
  }

  return {
    configured: true,
    serviceRoleVarPresent: isServiceRoleEnvSet,
    anonVarPresent: isAnonEnvSet,
    keyLength: rawKey.length,
    keyPrefix: rawKey.substring(0, 10) + '...',
    detectedRole: detectedRole,
    isProperServiceRole: detectedRole === 'service_role' || detectedRole === 'service_role_token',
    urlHost: url ? (() => { try { return new URL(url).hostname; } catch { return url; } })() : 'missing_url',
    warning: detectedRole === 'anon'
      ? 'ALERTA: La clave configurada tiene rol "anon". Debes copiar la clave "service_role (secret)" desde Supabase > Project Settings > API > service_role.'
      : null,
  };
}

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    // Strictly require SUPABASE_SERVICE_ROLE_KEY (never use anon key)
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY)?.trim();

    if (!supabaseUrl) {
      throw new Error(
        'La variable de entorno SUPABASE_URL no está configurada en el servidor. Configúrala en tu panel de Vercel y AI Studio.'
      );
    }

    if (!supabaseKey) {
      throw new Error(
        'La variable de entorno SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor. Configúrala en tu panel de Vercel y AI Studio con la clave secreta service_role de Supabase.'
      );
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseInstance;
}

// ============================================================================
// RESEND CLIENT (Lazy Initialization)
// ============================================================================
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  return new Resend(apiKey.trim());
}

// ============================================================================
// DATA MAPPERS (Database snake_case <-> Application camelCase)
// ============================================================================
function mapUserFromDb(row: any): UserDoc {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    isVerified: Boolean(row.is_verified),
    verificationCode: row.verification_code,
    verificationCodeExpires: row.verification_code_expires ? Number(row.verification_code_expires) : null,
    homeCurrency: row.home_currency || 'USD',
    createdAt: row.created_at,
  };
}

function mapTripFromDb(row: any): TripDoc {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    budget: Number(row.budget) || 0,
    currency: row.currency || 'USD',
    exchangeRate: Number(row.exchange_rate) || 1.0,
    members: Array.isArray(row.members) ? row.members : ['Yo'],
    plans: Array.isArray(row.plans) ? row.plans : [],
    checklist: Array.isArray(row.checklist) ? row.checklist : [],
    createdAt: row.created_at,
  };
}

function mapExpenseFromDb(row: any): ExpenseDoc {
  return {
    id: row.id,
    tripId: row.trip_id,
    userId: row.user_id,
    title: row.title,
    amount: Number(row.amount) || 0,
    currency: row.currency || 'USD',
    category: row.category || 'Comida',
    date: row.date,
    paidBy: row.paid_by || 'Yo',
    splitBetween: Array.isArray(row.split_between) ? row.split_between : ['Yo'],
    notes: row.notes || '',
    createdAt: row.created_at,
  };
}

// ============================================================================
// INITIAL SEEDING HELPER IN SUPABASE (For Brand New Users)
// ============================================================================
async function seedInitialTripInSupabase(userId: string, userName: string, homeCurrency: string) {
  const supabase = getSupabase();
  const sampleTripId = 'trip_' + Date.now();
  const today = new Date().toISOString().split('T')[0];

  const sampleTrip = {
    id: sampleTripId,
    user_id: userId,
    name: 'Aventura en Japón 🇯🇵',
    destination: 'Tokio, Kioto & Osaka',
    start_date: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    end_date: new Date(Date.now() + 24 * 86400000).toISOString().split('T')[0],
    budget: homeCurrency === 'USD' ? 3200 : homeCurrency === 'EUR' ? 2950 : 2500000,
    currency: 'JPY',
    exchange_rate: homeCurrency === 'USD' ? 0.0066 : homeCurrency === 'EUR' ? 0.0061 : 5.8,
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
    created_at: new Date().toISOString(),
  };

  await supabase.from('trips').insert(sampleTrip);

  const sampleExpenses = [
    {
      id: 'exp_1',
      trip_id: sampleTripId,
      user_id: userId,
      title: 'Hotel Gracery Shinjuku (3 Noches)',
      amount: 68000,
      currency: 'JPY',
      category: 'Alojamiento',
      date: today,
      paid_by: 'Yo',
      split_between: ['Yo', 'Carlos', 'Valeria'],
      notes: 'Habitación triple con vista a la ciudad',
      created_at: new Date().toISOString(),
    },
    {
      id: 'exp_2',
      trip_id: sampleTripId,
      user_id: userId,
      title: 'Cena de Bienvenida: Ramen Ichiran & Gyoza',
      amount: 5400,
      currency: 'JPY',
      category: 'Comida',
      date: today,
      paid_by: 'Carlos',
      split_between: ['Yo', 'Carlos', 'Valeria'],
      notes: 'Ramen tonkotsu clásico con extras',
      created_at: new Date().toISOString(),
    },
    {
      id: 'exp_3',
      trip_id: sampleTripId,
      user_id: userId,
      title: 'Boletos Tren Shinkansen Tokio - Kioto',
      amount: 42000,
      currency: 'JPY',
      category: 'Transporte',
      date: today,
      paid_by: 'Valeria',
      split_between: ['Yo', 'Carlos', 'Valeria'],
      notes: 'Asientos reservados en tren bala',
      created_at: new Date().toISOString(),
    },
    {
      id: 'exp_4',
      trip_id: sampleTripId,
      user_id: userId,
      title: 'Entradas Museo Digital teamLab Planets',
      amount: 11400,
      currency: 'JPY',
      category: 'Actividades',
      date: today,
      paid_by: 'Yo',
      split_between: ['Yo', 'Carlos', 'Valeria'],
      notes: 'Horario estelar 18:00 hrs',
      created_at: new Date().toISOString(),
    },
    {
      id: 'exp_5',
      trip_id: sampleTripId,
      user_id: userId,
      title: 'Té Matcha Ceremonial & Dulces Wagashi en Uji',
      amount: 3200,
      currency: 'JPY',
      category: 'Comida',
      date: today,
      paid_by: 'Yo',
      split_between: ['Yo'],
      notes: 'Experiencia tradicional japonesa',
      created_at: new Date().toISOString(),
    },
  ];

  await supabase.from('expenses').insert(sampleExpenses);
}

// ============================================================================
// REAL EMAIL SENDER WITH RESEND & AUDIT LOG IN SUPABASE
// ============================================================================
async function sendEmailNotification(
  to: string,
  subject: string,
  type: 'verification' | 'reset',
  code: string,
  userName: string
): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Rumbio <onboarding@resend.dev>';

  if (!resend) {
    const errorMsg =
      'El servicio de correo no está disponible: la variable RESEND_API_KEY no está configurada en las variables de entorno de Vercel/Servidor.';
    console.error(`[Resend Error] ${errorMsg}`);

    try {
      const supabase = getSupabase();
      await supabase.from('email_logs').insert({
        id: 'email_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        to_email: to,
        subject,
        type,
        code,
        status: 'failed',
        error: errorMsg,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Ignore log error if supabase is down
    }

    return { success: false, error: errorMsg };
  }

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
            Rumbio • Finanzas de Viajes Seguras en Supabase PostgreSQL
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const response = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject,
      html: htmlContent,
    });

    if (response.error) {
      const errorMsg = `Error de Resend (${response.error.name}): ${response.error.message}`;
      console.warn('[Resend API Error]', response.error);

      try {
        const supabase = getSupabase();
        await supabase.from('email_logs').insert({
          id: 'email_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          to_email: to,
          subject,
          type,
          code,
          status: 'failed',
          error: errorMsg,
          created_at: new Date().toISOString(),
        });
      } catch {}

      return { success: false, error: errorMsg };
    }

    console.log(`[Resend] Real email dispatched successfully to ${to} (ID: ${response.data?.id})`);

    try {
      const supabase = getSupabase();
      await supabase.from('email_logs').insert({
        id: 'email_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        to_email: to,
        subject,
        type,
        code,
        status: 'sent_resend',
        created_at: new Date().toISOString(),
      });
    } catch {}

    return { success: true };
  } catch (err: any) {
    const errorMsg = err.message || 'Error de comunicación con el servicio de correo Resend.';
    console.error('[Resend Exception]', err);

    try {
      const supabase = getSupabase();
      await supabase.from('email_logs').insert({
        id: 'email_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        to_email: to,
        subject,
        type,
        code,
        status: 'failed',
        error: errorMsg,
        created_at: new Date().toISOString(),
      });
    } catch {}

    return { success: false, error: errorMsg };
  }
}

// ============================================================================
// AUTH MIDDLEWARE: Strict Token Verification
// ============================================================================
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export function verifyAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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

// ============================================================================
// EXPRESS APP INITIALIZATION
// ============================================================================
export const app = express();
app.use(express.json());

// ============================================================================
// API ROUTES
// ============================================================================

// 1. Health & Config Status (Checks Supabase + Resend + Key Diagnostics)
app.get('/api/health', async (req: Request, res: Response) => {
  const hasResend = !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0;
  let supabaseStatus = 'disconnected';
  const diagnostics = getSupabaseKeyDiagnostics();

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('users').select('*', { count: 'exact', head: true });
    if (!error) {
      supabaseStatus = 'connected (PostgreSQL)';
    } else {
      supabaseStatus = `error: ${error.message}`;
    }
  } catch (err: any) {
    supabaseStatus = `not configured: ${err.message}`;
  }

  res.json({
    status: 'ok',
    service: 'Rumbio Production Backend Engine',
    database: supabaseStatus,
    supabaseDiagnostics: diagnostics,
    realEmailConfigured: hasResend,
    resendFrom: process.env.RESEND_FROM_EMAIL || 'Rumbio <onboarding@resend.dev>',
    timestamp: new Date().toISOString(),
  });
});

// 2. Email Delivery Diagnostic Logs from Supabase
app.get('/api/email-logs', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { data: logs } = await supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    const hasResend = !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0;
    res.json({
      realEmailConfigured: hasResend,
      logs: logs || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al obtener logs de correo.' });
  }
});

// 3. Register User (Inserts into Supabase & Dispatches Real Resend OTP)
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, homeCurrency } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener mínimo 6 caracteres.' });
    }

    const supabase = getSupabase();
    const normalizedEmail = email.trim().toLowerCase();

    // Check existing user
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingUser && existingUser.is_verified) {
      return res.status(400).json({ error: 'Ya existe una cuenta activa con este correo electrónico.' });
    }

    // Cryptographic Password Hashing with bcrypt (10 rounds)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate real cryptographically random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    let userId: string;
    let userName = name.trim();

    if (existingUser && !existingUser.is_verified) {
      userId = existingUser.id;
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: userName,
          password_hash: passwordHash,
          verification_code: code,
          verification_code_expires: expiresAt,
          home_currency: homeCurrency || 'USD',
        })
        .eq('id', userId);

      if (updateError) {
        throw new Error(`Error al actualizar usuario: ${updateError.message}`);
      }
    } else {
      userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const { error: insertError } = await supabase.from('users').insert({
        id: userId,
        name: userName,
        email: normalizedEmail,
        password_hash: passwordHash,
        is_verified: false,
        verification_code: code,
        verification_code_expires: expiresAt,
        home_currency: homeCurrency || 'USD',
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        throw new Error(`Error al registrar usuario en Supabase: ${insertError.message}`);
      }
    }

    // Dispatch real email via Resend
    const emailResult = await sendEmailNotification(
      normalizedEmail,
      '✈️ Tu código de verificación para activar Rumbio',
      'verification',
      code,
      userName
    );

    if (!emailResult.success) {
      return res.status(503).json({
        error:
          emailResult.error ||
          'No fue posible enviar el correo de verificación. Verifica que RESEND_API_KEY esté configurada.',
      });
    }

    res.status(201).json({
      message: 'Código de verificación enviado a tu correo.',
      email: normalizedEmail,
      realEmailSent: true,
    });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message || 'Error interno al registrar usuario.' });
  }
});

// 4. Verify OTP Code & Activate Account in Supabase
app.post('/api/auth/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Correo y código de verificación requeridos.' });
    }

    const supabase = getSupabase();
    const normalizedEmail = email.trim().toLowerCase();

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (userError || !userRow) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const user = mapUserFromDb(userRow);

    if (!user.verificationCode || user.verificationCode !== code.trim()) {
      return res.status(400).json({ error: 'Código de verificación incorrecto.' });
    }

    if (user.verificationCodeExpires && Date.now() > user.verificationCodeExpires) {
      return res.status(400).json({ error: 'El código ha expirado. Por favor solicita uno nuevo.' });
    }

    // Mark as verified and clear verification code
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_verified: true,
        verification_code: null,
        verification_code_expires: null,
      })
      .eq('id', user.id);

    if (updateError) {
      throw new Error(`Error al activar cuenta: ${updateError.message}`);
    }

    // Check if user has trips in Supabase; if 0, seed sample trip
    const { count: tripCount } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (!tripCount || tripCount === 0) {
      await seedInitialTripInSupabase(user.id, user.name, user.homeCurrency);
    }

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
    res.status(500).json({ error: err.message || 'Error al verificar código.' });
  }
});

// 5. Resend OTP Code
app.post('/api/auth/resend-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Correo es obligatorio.' });
    }

    const supabase = getSupabase();
    const normalizedEmail = email.trim().toLowerCase();

    const { data: userRow } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!userRow) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000;

    await supabase
      .from('users')
      .update({
        verification_code: code,
        verification_code_expires: expiresAt,
      })
      .eq('id', userRow.id);

    const emailResult = await sendEmailNotification(
      normalizedEmail,
      '✈️ Nuevo código de verificación - Rumbio',
      'verification',
      code,
      userRow.name
    );

    if (!emailResult.success) {
      return res.status(503).json({
        error: emailResult.error || 'No se pudo enviar el correo de verificación.',
      });
    }

    res.json({
      message: 'Nuevo código enviado exitosamente a tu correo.',
      realEmailSent: true,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al reenviar código.' });
  }
});

// 6. Login User (bcrypt compare against Supabase hash)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña requeridos.' });
    }

    const supabase = getSupabase();
    const normalizedEmail = email.trim().toLowerCase();

    const { data: userRow } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!userRow) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const isMatch = await bcrypt.compare(password, userRow.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    if (!userRow.is_verified) {
      return res.status(403).json({
        error: 'Cuenta no verificada. Por favor introduce tu código OTP.',
        requiresVerification: true,
        email: userRow.email,
      });
    }

    const token = jwt.sign(
      { id: userRow.id, email: userRow.email, name: userRow.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
        homeCurrency: userRow.home_currency || 'USD',
        createdAt: userRow.created_at,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Error al iniciar sesión.' });
  }
});

// 7. Request Password Reset (Dispatches Real OTP via Resend)
app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Correo requerido.' });
    }

    const supabase = getSupabase();
    const normalizedEmail = email.trim().toLowerCase();

    const { data: userRow } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!userRow) {
      return res.status(404).json({ error: 'No encontramos ninguna cuenta con este correo.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000;

    await supabase
      .from('users')
      .update({
        verification_code: code,
        verification_code_expires: expiresAt,
      })
      .eq('id', userRow.id);

    const emailResult = await sendEmailNotification(
      normalizedEmail,
      '🔒 Código para restablecer tu contraseña - Rumbio',
      'reset',
      code,
      userRow.name
    );

    if (!emailResult.success) {
      return res.status(503).json({
        error: emailResult.error || 'No se pudo enviar el correo de recuperación.',
      });
    }

    res.json({
      message: 'Código de recuperación enviado.',
      realEmailSent: true,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al solicitar recuperación.' });
  }
});

// 8. Reset Password (with bcrypt hash in Supabase)
app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    const supabase = getSupabase();
    const normalizedEmail = email.trim().toLowerCase();

    const { data: userRow } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!userRow || userRow.verification_code !== code.trim()) {
      return res.status(400).json({ error: 'Código de recuperación inválido o expirado.' });
    }

    if (userRow.verification_code_expires && Date.now() > Number(userRow.verification_code_expires)) {
      return res.status(400).json({ error: 'El código ha expirado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        verification_code: null,
        verification_code_expires: null,
        is_verified: true,
      })
      .eq('id', userRow.id);

    if (updateError) {
      throw new Error(`Error al actualizar contraseña: ${updateError.message}`);
    }

    res.json({ message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al restablecer contraseña.' });
  }
});

// 9. Current Authenticated User Profile
app.get('/api/auth/me', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = getSupabase();
    const { data: userRow } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user!.id)
      .maybeSingle();

    if (!userRow) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const user = mapUserFromDb(userRow);
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      homeCurrency: user.homeCurrency,
      createdAt: user.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al obtener perfil.' });
  }
});

app.put('/api/auth/me', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { homeCurrency, name } = req.body;
    const supabase = getSupabase();

    const updates: any = {};
    if (homeCurrency) updates.home_currency = homeCurrency;
    if (name) updates.name = name.trim();

    const { data: updatedRow, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user!.id)
      .select()
      .single();

    if (error || !updatedRow) {
      return res.status(500).json({ error: error?.message || 'Error al actualizar perfil.' });
    }

    const user = mapUserFromDb(updatedRow);
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      homeCurrency: user.homeCurrency,
      createdAt: user.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al actualizar perfil.' });
  }
});

// ============================================================================
// STRICT USER DATA ISOLATION ROUTES (TRIPS & EXPENSES IN SUPABASE)
// Enforces `WHERE user_id = req.user.id` on every query.
// ============================================================================

// 10. Trips: Get only authenticated user's trips
app.get('/api/trips', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = getSupabase();
    const { data: tripRows, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const trips = (tripRows || []).map(mapTripFromDb);
    res.json(trips);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al cargar viajes.' });
  }
});

// 10b. Trips: Get a single specific trip (enforces user_id = req.user.id)
app.get('/api/trips/:id', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = getSupabase();
    const tripId = req.params.id;
    const userId = req.user!.id;

    const { data: tripRow, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!tripRow) {
      return res.status(404).json({ error: 'Viaje no encontrado o no tienes permiso para acceder a él.' });
    }

    res.json(mapTripFromDb(tripRow));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al cargar el viaje.' });
  }
});

// 11. Trips: Create or Update trip (enforces user_id = req.user.id)
app.post('/api/trips', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = getSupabase();
    const tripData = req.body;
    const userId = req.user!.id;

    if (tripData.id) {
      // Check ownership
      const { data: existingTrip } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripData.id)
        .maybeSingle();

      if (existingTrip) {
        if (existingTrip.user_id !== userId) {
          return res.status(403).json({ error: 'Acceso denegado. No puedes modificar viajes de otro usuario.' });
        }

        const updatePayload = {
          name: tripData.name || existingTrip.name,
          destination: tripData.destination || existingTrip.destination,
          start_date: tripData.startDate || existingTrip.start_date,
          end_date: tripData.endDate || existingTrip.end_date,
          budget: Number(tripData.budget) || existingTrip.budget,
          currency: tripData.currency || existingTrip.currency,
          exchange_rate: Number(tripData.exchangeRate) || existingTrip.exchange_rate,
          members: Array.isArray(tripData.members) ? tripData.members : existingTrip.members,
          plans: Array.isArray(tripData.plans) ? tripData.plans : existingTrip.plans,
          checklist: Array.isArray(tripData.checklist) ? tripData.checklist : existingTrip.checklist,
        };

        const { data: updatedRow, error: updateError } = await supabase
          .from('trips')
          .update(updatePayload)
          .eq('id', tripData.id)
          .eq('user_id', userId)
          .select()
          .single();

        if (updateError) throw new Error(updateError.message);
        return res.json(mapTripFromDb(updatedRow));
      }
    }

    // Insert brand new trip
    const newTripId = tripData.id || 'trip_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const insertPayload = {
      id: newTripId,
      user_id: userId,
      name: tripData.name || 'Nuevo Viaje',
      destination: tripData.destination || 'Destino',
      start_date: tripData.startDate || new Date().toISOString().split('T')[0],
      end_date: tripData.endDate || new Date().toISOString().split('T')[0],
      budget: Number(tripData.budget) || 2000,
      currency: tripData.currency || 'EUR',
      exchange_rate: Number(tripData.exchangeRate) || 1.0,
      members: Array.isArray(tripData.members) && tripData.members.length > 0 ? tripData.members : ['Yo'],
      plans: Array.isArray(tripData.plans) ? tripData.plans : [],
      checklist: Array.isArray(tripData.checklist) ? tripData.checklist : [],
      created_at: tripData.createdAt || new Date().toISOString(),
    };

    const { data: insertedRow, error: insertError } = await supabase
      .from('trips')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);
    res.status(201).json(mapTripFromDb(insertedRow));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al guardar viaje.' });
  }
});

// 12. Trips: Delete trip (Cascades expenses in PostgreSQL)
app.delete('/api/trips/:id', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = getSupabase();
    const tripId = req.params.id;
    const userId = req.user!.id;

    const { data: trip } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .maybeSingle();

    if (!trip) {
      return res.status(404).json({ error: 'Viaje no encontrado.' });
    }

    if (trip.user_id !== userId) {
      return res.status(403).json({ error: 'Acceso denegado. No puedes eliminar viajes de otro usuario.' });
    }

    const { error: deleteError } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId)
      .eq('user_id', userId);

    if (deleteError) throw new Error(deleteError.message);

    res.json({ message: 'Viaje y gastos asociados eliminados correctamente.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al eliminar viaje.' });
  }
});

// 13. Expenses: Get only authenticated user's expenses
app.get('/api/expenses', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = getSupabase();
    const userId = req.user!.id;
    const tripId = req.query.tripId as string | undefined;

    let query = supabase.from('expenses').select('*').eq('user_id', userId);
    if (tripId) {
      query = query.eq('trip_id', tripId);
    }
    query = query.order('created_at', { ascending: false });

    const { data: expenseRows, error } = await query;
    if (error) throw new Error(error.message);

    const expenses = (expenseRows || []).map(mapExpenseFromDb);
    res.json(expenses);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al cargar gastos.' });
  }
});

// 14. Expenses: Create or Update Expense
app.post('/api/expenses', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = getSupabase();
    const expData = req.body;
    const userId = req.user!.id;

    // Verify trip belongs to user
    const { data: targetTrip } = await supabase
      .from('trips')
      .select('*')
      .eq('id', expData.tripId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!targetTrip) {
      return res.status(403).json({ error: 'El viaje especificado no existe o no te pertenece.' });
    }

    if (expData.id) {
      const { data: existingExp } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', expData.id)
        .maybeSingle();

      if (existingExp) {
        if (existingExp.user_id !== userId) {
          return res.status(403).json({ error: 'Acceso denegado. No puedes modificar gastos de otro usuario.' });
        }

        const updatePayload = {
          title: expData.title || existingExp.title,
          amount: Number(expData.amount) !== undefined ? Number(expData.amount) : existingExp.amount,
          currency: expData.currency || existingExp.currency,
          category: expData.category || existingExp.category,
          date: expData.date || existingExp.date,
          paid_by: expData.paidBy || existingExp.paid_by,
          split_between: Array.isArray(expData.splitBetween) ? expData.splitBetween : existingExp.split_between,
          notes: expData.notes !== undefined ? expData.notes : existingExp.notes,
        };

        const { data: updatedRow, error: updateError } = await supabase
          .from('expenses')
          .update(updatePayload)
          .eq('id', expData.id)
          .eq('user_id', userId)
          .select()
          .single();

        if (updateError) throw new Error(updateError.message);
        return res.json(mapExpenseFromDb(updatedRow));
      }
    }

    // Insert new expense
    const newExpId = expData.id || 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const insertPayload = {
      id: newExpId,
      trip_id: expData.tripId,
      user_id: userId,
      title: expData.title || 'Gasto',
      amount: Number(expData.amount) || 0,
      currency: expData.currency || targetTrip.currency,
      category: expData.category || 'Comida',
      date: expData.date || new Date().toISOString().split('T')[0],
      paid_by: expData.paidBy || 'Yo',
      split_between:
        Array.isArray(expData.splitBetween) && expData.splitBetween.length > 0 ? expData.splitBetween : ['Yo'],
      notes: expData.notes || '',
      created_at: expData.createdAt || new Date().toISOString(),
    };

    const { data: insertedRow, error: insertError } = await supabase
      .from('expenses')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);
    res.status(201).json(mapExpenseFromDb(insertedRow));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al guardar gasto.' });
  }
});

// 15. Expenses: Delete Expense
app.delete('/api/expenses/:id', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = getSupabase();
    const expId = req.params.id;
    const userId = req.user!.id;

    const { data: expense } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expId)
      .maybeSingle();

    if (!expense) {
      return res.status(404).json({ error: 'Gasto no encontrado.' });
    }

    if (expense.user_id !== userId) {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }

    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expId)
      .eq('user_id', userId);

    if (deleteError) throw new Error(deleteError.message);
    res.json({ message: 'Gasto eliminado.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al eliminar gasto.' });
  }
});

export default app;
