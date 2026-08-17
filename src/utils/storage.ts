import { User, Trip, Expense, EmailMessage, CurrencyCode } from '../types';
import { convertToHomeCurrency } from './finance';

const STORAGE_KEYS = {
  USERS: 'rumbio_users_v2',
  TRIPS: 'rumbio_trips_v2',
  EXPENSES: 'rumbio_expenses_v2',
  INBOX: 'rumbio_inbox_v2',
  SESSION: 'rumbio_active_session_v2',
  SEEDED: 'rumbio_system_seeded_v2',
};

// Safe JSON parse helper
function getLocal<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Storage save error:', err);
  }
}

// Simple hash simulation for password safety
export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'rb_' + Math.abs(hash).toString(16) + '_' + password.length;
}

// ===== USERS & AUTH =====
export function getAllUsers(): User[] {
  return getLocal<User[]>(STORAGE_KEYS.USERS, []);
}

export function saveUsers(users: User[]): void {
  setLocal(STORAGE_KEYS.USERS, users);
}

export function findUserByEmail(email: string): User | undefined {
  const users = getAllUsers();
  return users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
}

export function registerUser(name: string, email: string, password: string, homeCurrency: CurrencyCode): { user: User; code: string } {
  const users = getAllUsers();
  const normalizedEmail = email.trim().toLowerCase();
  
  if (users.some(u => u.email === normalizedEmail)) {
    throw new Error('Ya existe una cuenta registrada con este correo electrónico.');
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const newUser: User = {
    id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    isVerified: false,
    verificationCode: code,
    homeCurrency,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  // Send simulated verification email
  addSimulatedEmail({
    id: 'msg_' + Date.now(),
    to: normalizedEmail,
    subject: '✈️ Tu código de verificación para activar Rumbio',
    content: `¡Hola ${name}! Te damos la bienvenida a Rumbio. Tu código seguro de 6 dígitos para verificar tu cuenta y comenzar a gestionar tus finanzas de viaje es:`,
    code: code,
    type: 'verification',
    timestamp: new Date().toISOString(),
    read: false,
  });

  return { user: newUser, code };
}

export function loginUser(email: string, password: string): { user: User; token: string } {
  const users = getAllUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find(u => u.email === normalizedEmail);

  if (!user) {
    throw new Error('Credenciales incorrectas o usuario no registrado.');
  }

  if (user.passwordHash && user.passwordHash !== hashPassword(password)) {
    throw new Error('Contraseña incorrecta.');
  }

  if (!user.isVerified) {
    const error: any = new Error('Tu cuenta requiere activación previa.');
    error.data = { requiresVerification: true };
    throw error;
  }

  // Ensure initial seed data exists for user
  seedUserDataIfEmpty(user.id, user.name, user.homeCurrency);
  saveActiveSession(user.id, user.email);
  const token = 'rumbio_jwt_local_' + btoa(unescape(encodeURIComponent(JSON.stringify({ id: user.id, email: user.email, name: user.name })))) + '.' + Date.now();
  return { user, token };
}

export function verifyUserCode(email: string, code: string): User {
  const users = getAllUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find(u => u.email === normalizedEmail);

  if (!user) {
    throw new Error('Usuario no encontrado.');
  }

  if (user.verificationCode !== code.trim()) {
    throw new Error('El código ingresado es incorrecto. Revisa el simulador de correo abajo a la derecha.');
  }

  user.isVerified = true;
  user.verificationCode = undefined;
  saveUsers(users);

  // Seed sample trips for first time user
  seedUserDataIfEmpty(user.id, user.name, user.homeCurrency);

  return user;
}

export function requestPasswordReset(email: string): string {
  const users = getAllUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find(u => u.email === normalizedEmail);

  if (!user) {
    throw new Error('No encontramos ninguna cuenta asociada a este correo.');
  }

  const tempCode = Math.floor(100000 + Math.random() * 900000).toString();
  user.verificationCode = tempCode;
  saveUsers(users);

  addSimulatedEmail({
    id: 'msg_' + Date.now(),
    to: normalizedEmail,
    subject: '🔒 Restablecimiento de contraseña - Rumbio',
    content: `Has solicitado recuperar tu acceso a Rumbio. Utiliza el siguiente código temporal de recuperación para definir una nueva clave:`,
    code: tempCode,
    type: 'reset',
    timestamp: new Date().toISOString(),
    read: false,
  });

  return tempCode;
}

export function resetPasswordWithCode(email: string, code: string, newPass: string): User {
  const users = getAllUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find(u => u.email === normalizedEmail);

  if (!user || user.verificationCode !== code.trim()) {
    throw new Error('Código de recuperación inválido o expirado.');
  }

  user.passwordHash = hashPassword(newPass);
  user.verificationCode = undefined;
  saveUsers(users);
  return user;
}

export function updateUser(userId: string, updates: Partial<User>): User {
  const users = getAllUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) throw new Error('Usuario no encontrado');
  
  users[index] = { ...users[index], ...updates };
  saveUsers(users);
  return users[index];
}

// ===== SESSION MANAGEMENT =====
export function getActiveSession(): { userId: string; userEmail: string; token: string; expiresAt: number } | null {
  const session = getLocal<{ userId: string; userEmail: string; token: string; expiresAt: number } | null>(STORAGE_KEYS.SESSION, null);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    clearActiveSession();
    return null;
  }
  return session;
}

export function saveActiveSession(userId: string, userEmail: string): void {
  const session = {
    userId,
    userEmail,
    token: 'tok_' + Math.random().toString(36).substring(2) + Date.now(),
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins inactivity
  };
  setLocal(STORAGE_KEYS.SESSION, session);
}

export function touchSession(): void {
  const session = getActiveSession();
  if (session) {
    session.expiresAt = Date.now() + 15 * 60 * 1000;
    setLocal(STORAGE_KEYS.SESSION, session);
  }
}

export function clearActiveSession(): void {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

// ===== SIMULATED INBOX =====
export function getSimulatedEmails(forEmail?: string): EmailMessage[] {
  const emails = getLocal<EmailMessage[]>(STORAGE_KEYS.INBOX, []);
  if (!forEmail) return emails;
  return emails.filter(e => e.to.toLowerCase() === forEmail.toLowerCase());
}

export function addSimulatedEmail(email: EmailMessage): void {
  const emails = getLocal<EmailMessage[]>(STORAGE_KEYS.INBOX, []);
  emails.unshift(email);
  setLocal(STORAGE_KEYS.INBOX, emails);
}

export function markEmailAsRead(id: string): void {
  const emails = getLocal<EmailMessage[]>(STORAGE_KEYS.INBOX, []);
  const updated = emails.map(e => e.id === id ? { ...e, read: true } : e);
  setLocal(STORAGE_KEYS.INBOX, updated);
}

export function clearAllEmails(): void {
  setLocal(STORAGE_KEYS.INBOX, []);
}

// ===== TRIPS & EXPENSES (STRICT PER-USER ISOLATION) =====
export function getUserTrips(userId: string): Trip[] {
  const allTrips = getLocal<Trip[]>(STORAGE_KEYS.TRIPS, []);
  return allTrips.filter(t => t.userId === userId);
}

export function saveUserTrip(userId: string, trip: Trip): void {
  const allTrips = getLocal<Trip[]>(STORAGE_KEYS.TRIPS, []);
  const idx = allTrips.findIndex(t => t.id === trip.id && t.userId === userId);
  if (idx >= 0) {
    allTrips[idx] = { ...trip, userId };
  } else {
    allTrips.unshift({ ...trip, userId });
  }
  setLocal(STORAGE_KEYS.TRIPS, allTrips);
}

export function deleteUserTrip(userId: string, tripId: string): void {
  const allTrips = getLocal<Trip[]>(STORAGE_KEYS.TRIPS, []);
  const filteredTrips = allTrips.filter(t => !(t.id === tripId && t.userId === userId));
  setLocal(STORAGE_KEYS.TRIPS, filteredTrips);

  // Delete all associated expenses
  const allExpenses = getLocal<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  const filteredExpenses = allExpenses.filter(e => !(e.tripId === tripId && e.userId === userId));
  setLocal(STORAGE_KEYS.EXPENSES, filteredExpenses);
}

export function getUserExpenses(userId: string, tripId?: string): Expense[] {
  const allExpenses = getLocal<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  return allExpenses.filter(e => {
    if (e.userId !== userId) return false;
    if (tripId && e.tripId !== tripId) return false;
    return true;
  });
}

export function saveUserExpense(userId: string, expense: Expense): void {
  const allExpenses = getLocal<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  const idx = allExpenses.findIndex(e => e.id === expense.id && e.userId === userId);
  if (idx >= 0) {
    allExpenses[idx] = { ...expense, userId };
  } else {
    allExpenses.unshift({ ...expense, userId });
  }
  setLocal(STORAGE_KEYS.EXPENSES, allExpenses);
}

export function deleteUserExpense(userId: string, expenseId: string): void {
  const allExpenses = getLocal<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  const filtered = allExpenses.filter(e => !(e.id === expenseId && e.userId === userId));
  setLocal(STORAGE_KEYS.EXPENSES, filtered);
}

// ===== EXPORT HELPERS =====
export function exportUserDataToJSON(userId: string): string {
  const user = getAllUsers().find(u => u.id === userId);
  const trips = getUserTrips(userId);
  const expenses = getUserExpenses(userId);

  const payload = {
    user: user ? { id: user.id, name: user.name, email: user.email, homeCurrency: user.homeCurrency } : null,
    exportedAt: new Date().toISOString(),
    trips,
    expenses,
  };

  return JSON.stringify(payload, null, 2);
}

export function exportTripExpensesToCSV(userId: string, tripId: string, trip: Trip, homeCurrency: CurrencyCode): string {
  const expenses = getUserExpenses(userId, tripId);
  const headers = ['ID', 'Fecha', 'Concepto', 'Categoría', 'Pagador', 'Dividido Entre', 'Monto Original', 'Moneda Original', `Monto en ${homeCurrency}`, 'Notas'];

  const rows = expenses.map(e => {
    const homeAmount = convertToHomeCurrency(e.amount, e.currency, trip, homeCurrency);
    return [
      `"${e.id}"`,
      `"${e.date}"`,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${e.category}"`,
      `"${e.paidBy}"`,
      `"${(e.splitBetween || []).join('; ')}"`,
      e.amount,
      `"${e.currency}"`,
      homeAmount.toFixed(2),
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

// ===== SEED DATA FOR NEW USERS =====
export function seedUserDataIfEmpty(userId: string, userName: string, homeCurrency: CurrencyCode): void {
  const trips = getUserTrips(userId);
  if (trips.length > 0) return;

  const sampleTripId = 'trip_' + Date.now();
  const sampleTrip: Trip = {
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

  saveUserTrip(userId, sampleTrip);

  const today = new Date().toISOString().split('T')[0];
  const sampleExpenses: Expense[] = [
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

  sampleExpenses.forEach(exp => saveUserExpense(userId, exp));
}
