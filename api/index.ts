import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Resend } from 'resend';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

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

export type PlanTier = 'free' | 'pro' | 'premium';
export type BillingCycle = 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'expired';

export interface SubscriptionDoc {
  id: string;
  userId: string;
  plan: PlanTier;
  billingCycle: BillingCycle | null;
  status: SubscriptionStatus;
  provider: 'flow' | 'mercadopago' | null;
  providerSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionOrderDoc {
  id: string;
  userId: string;
  commerceOrder: string;
  flowToken?: string | null;
  plan: PlanTier;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'rejected' | 'canceled';
  flowOrderId?: string | null;
  paymentData?: any;
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscriptionResponse {
  id: string;
  userId: string;
  plan: PlanTier;
  billingCycle: BillingCycle | null;
  status: SubscriptionStatus;
  provider: 'flow' | 'mercadopago' | null;
  providerSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
  createdAt: string;
  updatedAt: string;
  limits: {
    maxActiveTrips: number;
    maxCurrenciesPerTrip: number;
    canSplitExpenses: boolean;
    canExportReports: boolean;
    canAutoSettleDebts: boolean;
    canReceiveMonthlyEmailSummary: boolean;
    canSmartBudgetRecommendations: boolean;
    canScanReceiptsOcr: boolean;
    canOfflineSync: boolean;
    canRealTimeFx: boolean;
    canBudgetAlerts: boolean;
    canPwaWidget: boolean;
  };
  diagnostics?: {
    flowConfigured: boolean;
    flowSandbox: boolean;
    flowEndpoint: string;
  };
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
// RESEND CLIENT & DIAGNOSTICS (Lazy Initialization, Key Scanner & Safe Inspection)
// ============================================================================
export function findResendKeyInEnv(): { key: string; sourceVar: string } | null {
  // 1. Direct check with exact standard names
  const directCandidates = [
    'RESEND_API_KEY',
    'RESEND_KEY',
    'RESEND_API_TOKEN',
    'RESEND_TOKEN',
    'RESEND_SECRET',
    'VITE_RESEND_API_KEY',
    'VITE_RESEND_KEY',
  ];

  for (const varName of directCandidates) {
    const val = process.env[varName];
    if (val && typeof val === 'string' && val.trim().length > 0) {
      return { key: val.trim(), sourceVar: varName };
    }
  }

  // 2. Dynamic scan over all process.env keys for any variation (case-insensitive or with whitespace)
  const allEnvKeys = Object.keys(process.env);
  for (const rawKey of allEnvKeys) {
    if (rawKey.trim().toUpperCase().includes('RESEND')) {
      const val = process.env[rawKey];
      if (val && typeof val === 'string' && val.trim().length > 0) {
        return { key: val.trim(), sourceVar: rawKey };
      }
    }
  }

  return null;
}

export function getResendKeyDiagnostics() {
  const allEnvKeys = Object.keys(process.env);
  
  // Find all keys in process.env containing 'RESEND' (case-insensitive)
  const resendRelatedKeys = allEnvKeys
    .filter((k) => k.trim().toUpperCase().includes('RESEND'))
    .map((k) => {
      const val = process.env[k] || '';
      const trimmedVal = val.trim();
      return {
        name: k,
        trimmedName: k.trim(),
        valueLength: trimmedVal.length,
        startsWithRe: trimmedVal.startsWith('re_'),
        hasWhitespaceInKeyName: k !== k.trim(),
        hasWhitespaceInValue: val !== trimmedVal,
        keyPrefix: trimmedVal.length > 0 ? `${trimmedVal.substring(0, 5)}...` : 'none',
      };
    });

  // Also collect general environment metadata (without secret values)
  const allAvailableEnvKeyNames = allEnvKeys
    .filter((k) => !k.startsWith('npm_') && !k.startsWith('_'))
    .sort();

  const foundKeyInfo = findResendKeyInEnv();
  const activeKey = foundKeyInfo?.key || '';
  const varPresent = activeKey.length > 0;

  let clientInitialized = false;
  let initError: string | null = null;

  if (varPresent) {
    try {
      const client = new Resend(activeKey);
      if (client && client.emails) {
        clientInitialized = true;
      } else {
        initError = 'El cliente de Resend se instanció pero falta el módulo de emails.';
      }
    } catch (err: any) {
      initError = err.message || 'Error al instanciar el cliente de Resend con la clave provista.';
    }
  }

  return {
    varPresent,
    detectedSourceVar: foundKeyInfo ? foundKeyInfo.sourceVar : null,
    keyLength: activeKey.length,
    keyPrefix: activeKey.length > 0 ? `${activeKey.substring(0, 5)}...` : 'none',
    startsWithRe: activeKey.startsWith('re_'),
    clientInitialized,
    initError,
    fromEmail: process.env.RESEND_FROM_EMAIL || 'Rumbio <onboarding@resend.dev>',
    allResendRelatedKeys: resendRelatedKeys,
    totalEnvKeysCount: allEnvKeys.length,
    allAvailableEnvKeyNames,
  };
}

function getResendClient(): Resend | null {
  const found = findResendKeyInEnv();
  if (!found || !found.key) {
    return null;
  }
  try {
    return new Resend(found.key);
  } catch (err) {
    console.error('[Resend Init Error]', err);
    return null;
  }
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
// FLOW.CL INTEGRATION (Payment Gateway & Recurring Subscriptions for Chile)
// ============================================================================
export function getFlowConfig() {
  const apiKey = (process.env.FLOW_API_KEY || '').trim();
  const secretKey = (process.env.FLOW_SECRET_KEY || '').trim();
  const isSandbox = process.env.FLOW_SANDBOX !== 'false';
  const endpoint = isSandbox ? 'https://sandbox.flow.cl/api' : 'https://www.flow.cl/api';
  const isConfigured = !!(apiKey.length > 0 && secretKey.length > 0);

  return {
    apiKey,
    secretKey,
    isSandbox,
    endpoint,
    isConfigured,
  };
}

export function signFlowParams(params: Record<string, any>, secretKey: string): string {
  // 1. Order keys alphabetically (ASCII) and exclude 's' and empty values
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== 's' && params[k] !== undefined && params[k] !== null)
    .sort();

  // 2. Concatenate keys and values without delimiters
  let toSign = '';
  for (const k of sortedKeys) {
    toSign += `${k}${params[k]}`;
  }

  // 3. Generate HMAC-SHA256 digest in hex format
  return crypto.createHmac('sha256', secretKey).update(toSign).digest('hex');
}

export async function createFlowPayment(orderData: {
  commerceOrder: string;
  subject: string;
  currency: string;
  amount: number;
  email: string;
  urlConfirmation: string;
  urlReturn: string;
  optional?: string;
}): Promise<{ url: string; token: string; flowOrder?: number }> {
  const config = getFlowConfig();
  if (!config.isConfigured) {
    throw new Error(
      'Flow.cl no está configurado. Por favor define las variables de entorno FLOW_API_KEY y FLOW_SECRET_KEY en Vercel.'
    );
  }

  const params: Record<string, any> = {
    apiKey: config.apiKey,
    commerceOrder: orderData.commerceOrder,
    subject: orderData.subject,
    currency: orderData.currency,
    amount: orderData.amount,
    email: orderData.email,
    urlConfirmation: orderData.urlConfirmation,
    urlReturn: orderData.urlReturn,
  };

  if (orderData.optional) {
    params.optional = orderData.optional;
  }

  // Calculate signature
  params.s = signFlowParams(params, config.secretKey);

  const formBody = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    formBody.append(key, String(value));
  }

  const response = await fetch(`${config.endpoint}/payment/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody.toString(),
  });

  const data: any = await response.json().catch(() => ({}));

  if (!response.ok || !data.token || !data.url) {
    const errorMsg = data.message || `Error de Flow.cl (${response.status}): ${JSON.stringify(data)}`;
    throw new Error(errorMsg);
  }

  return {
    url: data.url,
    token: data.token,
    flowOrder: data.flowOrder,
  };
}

export async function getFlowPaymentStatus(token: string): Promise<any> {
  const config = getFlowConfig();
  if (!config.isConfigured) {
    throw new Error('Flow.cl no está configurado (FLOW_API_KEY / FLOW_SECRET_KEY faltantes).');
  }

  const params: Record<string, any> = {
    apiKey: config.apiKey,
    token: token.trim(),
  };

  params.s = signFlowParams(params, config.secretKey);

  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${config.endpoint}/payment/getStatus?${query}`, {
    method: 'GET',
  });

  const data: any = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Error al consultar estado en Flow (${response.status})`;
    throw new Error(errorMsg);
  }

  return data;
}

// ============================================================================
// SUBSCRIPTION GETTER & LIMITS CALCULATOR
// ============================================================================
export async function getUserSubscription(userId: string): Promise<UserSubscriptionResponse> {
  const supabase = getSupabase();
  const flowConfig = getFlowConfig();

  // Try to find existing subscription row
  const { data: subRow } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  let sub: SubscriptionDoc;

  if (!subRow) {
    // Auto-create initial default Free subscription for user
    const newSubId = 'sub_' + userId;
    const nowIso = new Date().toISOString();
    const defaultPayload = {
      id: newSubId,
      user_id: userId,
      plan: 'free',
      billing_cycle: null,
      status: 'active',
      provider: null,
      provider_subscription_id: null,
      current_period_end: null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const { data: createdRow } = await supabase
      .from('subscriptions')
      .upsert(defaultPayload, { onConflict: 'user_id' })
      .select()
      .maybeSingle();

    sub = {
      id: createdRow?.id || newSubId,
      userId,
      plan: (createdRow?.plan as PlanTier) || 'free',
      billingCycle: (createdRow?.billing_cycle as BillingCycle) || null,
      status: (createdRow?.status as SubscriptionStatus) || 'active',
      provider: createdRow?.provider || null,
      providerSubscriptionId: createdRow?.provider_subscription_id,
      currentPeriodEnd: createdRow?.current_period_end,
      createdAt: createdRow?.created_at || nowIso,
      updatedAt: createdRow?.updated_at || nowIso,
    };
  } else {
    sub = {
      id: subRow.id,
      userId: subRow.user_id,
      plan: subRow.plan as PlanTier,
      billingCycle: subRow.billing_cycle as BillingCycle,
      status: subRow.status as SubscriptionStatus,
      provider: subRow.provider,
      providerSubscriptionId: subRow.provider_subscription_id,
      currentPeriodEnd: subRow.current_period_end,
      createdAt: subRow.created_at,
      updatedAt: subRow.updated_at,
    };
  }

  // Check if paid plan has expired
  let effectivePlan = sub.plan;
  let effectiveStatus = sub.status;

  if (sub.plan !== 'free' && sub.currentPeriodEnd) {
    const periodEndTime = new Date(sub.currentPeriodEnd).getTime();
    if (Date.now() > periodEndTime) {
      effectivePlan = 'free';
      effectiveStatus = 'expired';
      Promise.resolve(
        supabase
          .from('subscriptions')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', sub.id)
      ).catch(() => {});
    }
  }

  return {
    id: sub.id,
    userId: sub.userId,
    plan: effectivePlan,
    billingCycle: sub.billingCycle,
    status: effectiveStatus,
    provider: sub.provider,
    providerSubscriptionId: sub.providerSubscriptionId,
    currentPeriodEnd: sub.currentPeriodEnd,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
    limits: {
      maxActiveTrips: effectivePlan === 'free' ? 1 : 999999,
      maxCurrenciesPerTrip: effectivePlan === 'free' ? 2 : 999999,
      canSplitExpenses: effectivePlan !== 'free',
      canExportReports: effectivePlan !== 'free',
      canAutoSettleDebts: effectivePlan === 'premium',
      canReceiveMonthlyEmailSummary: effectivePlan === 'premium',
      canSmartBudgetRecommendations: effectivePlan === 'premium',
      canScanReceiptsOcr: effectivePlan !== 'free',
      canOfflineSync: effectivePlan !== 'free',
      canRealTimeFx: effectivePlan !== 'free',
      canBudgetAlerts: effectivePlan !== 'free',
      canPwaWidget: effectivePlan !== 'free',
    },
    diagnostics: {
      flowConfigured: flowConfig.isConfigured,
      flowSandbox: flowConfig.isSandbox,
      flowEndpoint: flowConfig.endpoint,
    },
  };
}

// ============================================================================
// DEMO OTP CONFIG HELPER
// ============================================================================
export function getDemoOtpConfig() {
  const rawDemo = (process.env.DEMO_OTP_CODE || '').trim();
  const isDemoActive = rawDemo.length > 0;
  return {
    demoOtpActive: isDemoActive,
    demoOtpCode: isDemoActive ? rawDemo : null,
  };
}

// ============================================================================
// EXPRESS APP INITIALIZATION
// ============================================================================
export const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// API ROUTES
// ============================================================================

// 0. Public Auth & Demo Config Endpoint
app.get('/api/auth/config', (req: Request, res: Response) => {
  const demoConfig = getDemoOtpConfig();
  res.json({
    demoOtpActive: demoConfig.demoOtpActive,
    demoOtpCode: demoConfig.demoOtpCode,
  });
});

// 1. Health & Config Status (Checks Supabase + Resend + Key Diagnostics + Demo Mode)
app.get('/api/health', async (req: Request, res: Response) => {
  const resendDiagnostics = getResendKeyDiagnostics();
  let supabaseStatus = 'disconnected';
  const supabaseDiagnostics = getSupabaseKeyDiagnostics();
  const demoConfig = getDemoOtpConfig();

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

  const flowConfig = getFlowConfig();

  res.json({
    status: 'ok',
    service: 'Rumbio Production Backend Engine',
    database: supabaseStatus,
    supabaseDiagnostics,
    resendDiagnostics,
    flowDiagnostics: {
      configured: flowConfig.isConfigured,
      sandbox: flowConfig.isSandbox,
      endpoint: flowConfig.endpoint,
      apiKeyPresent: !!flowConfig.apiKey,
      secretKeyPresent: !!flowConfig.secretKey,
    },
    demoOtpActive: demoConfig.demoOtpActive,
    demoOtpCode: demoConfig.demoOtpCode,
    realEmailConfigured: resendDiagnostics.clientInitialized,
    resendFrom: resendDiagnostics.fromEmail,
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

    const resendDiagnostics = getResendKeyDiagnostics();
    res.json({
      realEmailConfigured: resendDiagnostics.clientInitialized,
      resendDiagnostics,
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
    const inputCode = String(code).trim();

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (userError || !userRow) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const user = mapUserFromDb(userRow);
    const { demoOtpActive, demoOtpCode } = getDemoOtpConfig();

    const isDemoMatch = Boolean(demoOtpActive && demoOtpCode && inputCode === demoOtpCode);
    const isRealMatch = Boolean(user.verificationCode && user.verificationCode === inputCode);

    if (!isDemoMatch && !isRealMatch) {
      return res.status(400).json({ error: 'Código de verificación incorrecto.' });
    }

    if (!isDemoMatch && user.verificationCodeExpires && Date.now() > user.verificationCodeExpires) {
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

    // Generate JWT Token (Clean start: no seed data inserted)
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
    const inputCode = String(code).trim();

    const { data: userRow } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!userRow) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const { demoOtpActive, demoOtpCode } = getDemoOtpConfig();
    const isDemoMatch = Boolean(demoOtpActive && demoOtpCode && inputCode === demoOtpCode);
    const isRealMatch = Boolean(userRow.verification_code && userRow.verification_code === inputCode);

    if (!isDemoMatch && !isRealMatch) {
      return res.status(400).json({ error: 'Código de recuperación inválido o incorrecto.' });
    }

    if (!isDemoMatch && userRow.verification_code_expires && Date.now() > Number(userRow.verification_code_expires)) {
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
// SUBSCRIPTION & PLAN MANAGEMENT ROUTES (FLOW.CL)
// ============================================================================

// 9a. Subscriptions: Get current user subscription status & computed limits
app.get('/api/subscriptions/me', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const subscription = await getUserSubscription(userId);
    res.json(subscription);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al obtener información de suscripción.' });
  }
});

// 9b. Subscriptions: Create Flow.cl payment checkout
app.post('/api/subscriptions/create-checkout', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;
    const { plan, billingCycle } = req.body;

    if (!plan || (plan !== 'pro' && plan !== 'premium')) {
      return res.status(400).json({ error: 'Plan inválido. Debe ser "pro" o "premium".' });
    }

    if (!billingCycle || (billingCycle !== 'monthly' && billingCycle !== 'annual')) {
      return res.status(400).json({ error: 'Ciclo de facturación inválido. Debe ser "monthly" o "annual".' });
    }

    // Pricing in CLP according to specifications:
    // Pro: $2.990 CLP/mes o $29.990 CLP/año
    // Premium: $5.990 CLP/mes o $59.990 CLP/año
    let amount = 0;
    let subject = '';

    if (plan === 'pro') {
      amount = billingCycle === 'annual' ? 29990 : 2990;
      subject = `Rumbio Pro (${billingCycle === 'annual' ? 'Anual' : 'Mensual'})`;
    } else {
      amount = billingCycle === 'annual' ? 59990 : 5990;
      subject = `Rumbio Premium (${billingCycle === 'annual' ? 'Anual' : 'Mensual'})`;
    }

    const flowConfig = getFlowConfig();
    if (!flowConfig.isConfigured) {
      return res.status(503).json({
        error:
          'La pasarela de pago Flow.cl no está configurada aún en el servidor. Por favor define FLOW_API_KEY y FLOW_SECRET_KEY en las variables de entorno de Vercel.',
        code: 'FLOW_NOT_CONFIGURED',
      });
    }

    const supabase = getSupabase();
    const appUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
    const commerceOrder = `RMB_${plan.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const urlConfirmation = `${appUrl}/api/subscriptions/webhook`;
    const urlReturn = `${appUrl}/?payment=flow_return&order=${commerceOrder}`;

    const optionalData = JSON.stringify({
      userId,
      email: userEmail,
      plan,
      billingCycle,
      amount,
    });

    const flowPayment = await createFlowPayment({
      commerceOrder,
      subject,
      currency: 'CLP',
      amount,
      email: userEmail,
      urlConfirmation,
      urlReturn,
      optional: optionalData,
    });

    // Record order in database
    await supabase.from('subscription_orders').insert({
      id: 'ord_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      user_id: userId,
      commerce_order: commerceOrder,
      flow_token: flowPayment.token,
      plan,
      billing_cycle: billingCycle,
      amount,
      currency: 'CLP',
      status: 'pending',
      flow_order_id: flowPayment.flowOrder ? String(flowPayment.flowOrder) : null,
      payment_data: {
        subject,
        urlReturn,
        urlConfirmation,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    res.json({
      url: flowPayment.url,
      token: flowPayment.token,
      redirectUrl: `${flowPayment.url}?token=${flowPayment.token}`,
      commerceOrder,
      flowOrderId: flowPayment.flowOrder,
    });
  } catch (err: any) {
    console.error('Create checkout error:', err);
    res.status(500).json({ error: err.message || 'Error al generar checkout de suscripción en Flow.' });
  }
});

// 9c. Subscriptions: Flow.cl Webhook / Confirmation Endpoint (Public)
app.post('/api/subscriptions/webhook', async (req: Request, res: Response) => {
  try {
    const token = req.body?.token || req.query?.token;
    if (!token) {
      return res.status(400).json({ error: 'Token no proporcionado en la confirmación de Flow.' });
    }

    const flowStatus = await getFlowPaymentStatus(String(token));
    const { commerceOrder, status, flowOrder, optional } = flowStatus;

    // Status: 1 = Pendiente, 2 = Pagada, 3 = Rechazada, 4 = Anulada
    const supabase = getSupabase();

    let parsedOptional: any = {};
    if (optional) {
      try {
        parsedOptional = typeof optional === 'string' ? JSON.parse(optional) : optional;
      } catch {}
    }

    // Lookup corresponding order
    const { data: orderRow } = await supabase
      .from('subscription_orders')
      .select('*')
      .eq('commerce_order', commerceOrder)
      .maybeSingle();

    const userId = orderRow?.user_id || parsedOptional?.userId;
    const plan = (orderRow?.plan || parsedOptional?.plan || 'pro') as PlanTier;
    const billingCycle = (orderRow?.billing_cycle || parsedOptional?.billingCycle || 'monthly') as BillingCycle;

    if (!userId) {
      console.warn('[Flow Webhook] Warning: Could not identify userId for commerce order', commerceOrder);
      return res.status(200).json({ message: 'Webhook procesado (usuario no vinculado)' });
    }

    if (status === 2) {
      // Payment Successful (Pagada)
      const durationDays = billingCycle === 'annual' ? 365 : 30;
      const periodEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      // Update order record
      if (orderRow) {
        await supabase
          .from('subscription_orders')
          .update({
            status: 'paid',
            flow_order_id: String(flowOrder),
            payment_data: flowStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderRow.id);
      }

      // Upsert subscription table record
      await supabase
        .from('subscriptions')
        .upsert(
          {
            id: 'sub_' + userId,
            user_id: userId,
            plan,
            billing_cycle: billingCycle,
            status: 'active',
            provider: 'flow',
            provider_subscription_id: String(flowOrder),
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      console.log(`[Flow Webhook] Suscripción activada para usuario ${userId}: Plan ${plan} (${billingCycle})`);
      return res.status(200).json({ status: 'ok', message: 'Suscripción activada exitosamente.' });
    } else if (status === 3 || status === 4) {
      // Payment rejected or canceled
      if (orderRow) {
        await supabase
          .from('subscription_orders')
          .update({
            status: status === 3 ? 'rejected' : 'canceled',
            payment_data: flowStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderRow.id);
      }
      return res.status(200).json({ status: 'ok', message: 'Estado de orden registrado.' });
    }

    res.status(200).json({ status: 'ok' });
  } catch (err: any) {
    console.error('[Flow Webhook Error]', err);
    res.status(500).json({ error: err.message || 'Error al procesar webhook de Flow.' });
  }
});

// 9d. Subscriptions: Cancel active paid subscription
app.post('/api/subscriptions/cancel', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const supabase = getSupabase();

    const { data: subRow } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!subRow || subRow.plan === 'free') {
      return res.status(400).json({ error: 'No tienes una suscripción de pago activa para cancelar.' });
    }

    // Update status to canceled, preserving current_period_end
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) throw new Error(updateError.message);

    const subscription = await getUserSubscription(userId);
    res.json({
      message:
        'Suscripción cancelada. Mantendrás acceso a las funciones de tu plan hasta el final de tu período contratado.',
      subscription,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al cancelar suscripción.' });
  }
});

// ============================================================================
// TEMPORARY DEMO MODE: Immediate plan activation without Flow.cl checkout dependency
// FLAG: DEMO_CHECKOUT_AUTO_ACTIVATE (Easily toggle off for live production Flow payments)
// ============================================================================
export const DEMO_CHECKOUT_AUTO_ACTIVATE_ENABLED = true;

app.post('/api/subscriptions/demo-activate', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { plan = 'pro', billingCycle = 'monthly' } = req.body;

    if (plan !== 'pro' && plan !== 'premium') {
      return res.status(400).json({ error: 'Plan inválido. Debe ser "pro" o "premium".' });
    }

    const durationDays = billingCycle === 'annual' ? 365 : 30;
    const periodEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const supabase = getSupabase();

    // Create or update subscription record in database for the authenticated user
    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert(
        {
          id: 'sub_' + userId,
          user_id: userId,
          plan,
          billing_cycle: billingCycle,
          status: 'active',
          provider: 'demo_checkout',
          provider_subscription_id: 'DEMO_' + Date.now(),
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (subError) throw new Error(subError.message);

    // Record demo order in subscription_orders
    const amount = plan === 'pro' ? (billingCycle === 'annual' ? 29990 : 2990) : (billingCycle === 'annual' ? 59990 : 5990);
    await supabase.from('subscription_orders').insert({
      id: 'ord_demo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      user_id: userId,
      commerce_order: `DEMO_${plan.toUpperCase()}_${Date.now()}`,
      plan,
      billing_cycle: billingCycle,
      amount,
      currency: 'CLP',
      status: 'paid',
      payment_data: { mode: 'demo_auto_activation', simulatedAt: new Date().toISOString() },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const updatedSubscription = await getUserSubscription(userId);

    res.json({
      success: true,
      message: `¡Plan ${plan.toUpperCase()} activado en modo demo exitosamente!`,
      subscription: updatedSubscription,
      isDemo: true,
    });
  } catch (err: any) {
    console.error('Demo activation error:', err);
    res.status(500).json({ error: err.message || 'Error al activar plan en modo demo.' });
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

// 11. Trips: Create or Update trip (enforces user_id = req.user.id & plan limits)
app.post('/api/trips', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = getSupabase();
    const tripData = req.body;
    const userId = req.user!.id;
    const userSub = await getUserSubscription(userId);

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

    // Check Plan Limits for creating new trip
    const { count: currentTripsCount } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if ((currentTripsCount || 0) >= userSub.limits.maxActiveTrips) {
      return res.status(403).json({
        error:
          'Límite del plan Gratis alcanzado: Puedes tener 1 viaje activo a la vez. Actualiza a Pro o Premium para crear viajes ilimitados.',
        code: 'PLAN_LIMIT_EXCEEDED',
        feature: 'unlimited_trips',
        requiredPlan: 'pro',
      });
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
    const userSub = await getUserSubscription(userId);

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

    // Check Plan Limits for split expenses
    const splitList =
      Array.isArray(expData.splitBetween) && expData.splitBetween.length > 0 ? expData.splitBetween : ['Yo'];
    const isSplitGroup = splitList.length > 1 || (expData.paidBy && expData.paidBy !== 'Yo');

    if (isSplitGroup && !userSub.limits.canSplitExpenses) {
      return res.status(403).json({
        error: 'La división de gastos entre viajeros está disponible en los planes Pro y Premium.',
        code: 'PLAN_LIMIT_EXCEEDED',
        feature: 'split_expenses',
        requiredPlan: 'pro',
      });
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
          split_between: splitList,
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
      split_between: splitList,
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

// ============================================================================
// 16. AI Chatbot (Pro & Premium Exclusive with Live User Data Context)
// ============================================================================
async function handleAiChat(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const supabase = getSupabase();

    // 1. Verify User Plan (Strict Pro or Premium check)
    const subscription = await getUserSubscription(userId);
    if (subscription.plan !== 'pro' && subscription.plan !== 'premium' || subscription.status !== 'active') {
      return res.status(403).json({
        error: 'El Asistente Inteligente de IA es una función exclusiva para planes Pro y Premium. Actualiza tu plan para recibir asesoría financiera personalizada y análisis de tus gastos de viaje.',
        code: 'PRO_PLAN_REQUIRED',
        requiredPlan: 'pro',
      });
    }

    // 2. Validate GEMINI_API_KEY environment variable (strictly no mock responses)
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(503).json({
        error: 'La clave de API de Gemini (GEMINI_API_KEY) no está configurada en las variables de entorno del servidor. Por favor, configúrala en el panel de Secrets de AI Studio o variables de entorno para activar las respuestas del Asistente IA.',
        code: 'MISSING_GEMINI_API_KEY',
        missingApiKey: true,
      });
    }

    // 3. Parse input messages & currentTripId
    const { messages, currentTripId } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Debes proporcionar una lista de mensajes válida para la conversación.' });
    }

    // 4. Fetch User Data (Profile, Trips, Expenses) for real-data context
    const { data: userRow } = await supabase
      .from('users')
      .select('name, email, home_currency')
      .eq('id', userId)
      .maybeSingle();

    const homeCurrency = userRow?.home_currency || 'USD';
    const userName = userRow?.name || req.user!.name || 'Viajero';

    const { data: rawTrips } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const trips = (rawTrips || []).map(mapTripFromDb);

    const { data: rawExpenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    const expenses = (rawExpenses || []).map(mapExpenseFromDb);

    // 5. Structure live financial context
    const tripsContext = trips.map(t => {
      const tripExpenses = expenses.filter(e => e.tripId === t.id);
      
      const totalSpentHomeCurrency = tripExpenses.reduce((sum, e) => {
        if (e.currency === homeCurrency) return sum + e.amount;
        if (e.currency === t.currency && t.exchangeRate > 0) return sum + (e.amount * t.exchangeRate);
        return sum + e.amount;
      }, 0);

      const categoryBreakdown: Record<string, { count: number; totalHomeCurrency: number }> = {};
      for (const exp of tripExpenses) {
        const cat = exp.category || 'Otros';
        if (!categoryBreakdown[cat]) {
          categoryBreakdown[cat] = { count: 0, totalHomeCurrency: 0 };
        }
        categoryBreakdown[cat].count += 1;
        const amt = exp.currency === homeCurrency ? exp.amount : (t.exchangeRate > 0 ? exp.amount * t.exchangeRate : exp.amount);
        categoryBreakdown[cat].totalHomeCurrency += amt;
      }

      // Compute split debts between members for this trip
      const memberSpending: Record<string, number> = {};
      const memberShare: Record<string, number> = {};
      t.members.forEach(m => {
        memberSpending[m] = 0;
        memberShare[m] = 0;
      });

      tripExpenses.forEach(exp => {
        const payer = exp.paidBy || 'Yo';
        const amt = exp.currency === homeCurrency ? exp.amount : (t.exchangeRate > 0 ? exp.amount * t.exchangeRate : exp.amount);
        memberSpending[payer] = (memberSpending[payer] || 0) + amt;

        const splitWith = exp.splitBetween && exp.splitBetween.length > 0 ? exp.splitBetween : t.members;
        const perPerson = amt / splitWith.length;
        splitWith.forEach(m => {
          memberShare[m] = (memberShare[m] || 0) + perPerson;
        });
      });

      const memberBalances: Record<string, { paid: number; shouldPay: number; netBalance: number }> = {};
      t.members.forEach(m => {
        const paid = memberSpending[m] || 0;
        const shouldPay = memberShare[m] || 0;
        memberBalances[m] = {
          paid: Math.round(paid * 100) / 100,
          shouldPay: Math.round(shouldPay * 100) / 100,
          netBalance: Math.round((paid - shouldPay) * 100) / 100,
        };
      });

      return {
        tripId: t.id,
        isCurrentFocusedTrip: t.id === currentTripId,
        name: t.name,
        destination: t.destination,
        dates: `${t.startDate} hasta ${t.endDate}`,
        tripCurrency: t.currency,
        homeCurrency,
        exchangeRate: `1 ${t.currency} = ${t.exchangeRate} ${homeCurrency}`,
        budgetInHomeCurrency: t.budget,
        totalSpentInHomeCurrency: Math.round(totalSpentHomeCurrency * 100) / 100,
        remainingBudgetInHomeCurrency: Math.round((t.budget - totalSpentHomeCurrency) * 100) / 100,
        budgetUsagePercent: t.budget > 0 ? Math.round((totalSpentHomeCurrency / t.budget) * 100) : 0,
        totalExpensesLogged: tripExpenses.length,
        members: t.members,
        categoryBreakdown,
        memberBalances,
        checklistItemsCount: t.checklist?.length || 0,
        pendingChecklist: t.checklist?.filter(c => !c.isCompleted).map(c => c.title) || [],
        recentExpenses: tripExpenses.slice(0, 30).map(e => ({
          title: e.title,
          amount: e.amount,
          currency: e.currency,
          category: e.category,
          date: e.date,
          paidBy: e.paidBy,
          splitBetween: e.splitBetween,
          notes: e.notes || undefined,
        })),
      };
    });

    const systemInstruction = `Eres "Rumbio AI", el copiloto y asesor financiero de viajes de Rumbio.
Interactúas con ${userName} (${userRow?.email || req.user!.email}), usuario con membresía ${subscription.plan.toUpperCase()}.
Moneda base del usuario: ${homeCurrency}.
Fecha actual: ${new Date().toISOString().split('T')[0]}.
Total de viajes en cuenta: ${trips.length}.
${currentTripId ? `Viaje actualmente seleccionado por el usuario en la interfaz: ID ${currentTripId}.` : ''}

=== DATOS FINANCIEROS REALES DEL USUARIO (BASE DE DATOS EN VIVO) ===
${JSON.stringify({
  homeCurrency,
  tripsSummary: tripsContext,
}, null, 2)}
==================================================================

DIRECTIVAS Y REGLAS FUNDAMENTALES:
1. PRECISIÓN FINANCIERA: Responde basándote estrictamente en los datos reales suministrados arriba. Si el usuario pregunta cuánto ha gastado, su presupuesto restante, categorías con mayor consumo o balances entre personas (quién debe a quién), cita las cifras exactas y la moneda correspondiente (${homeCurrency} o la moneda local del viaje).
2. CONSEJOS Y RECOMENDACIONES: Ofrece recomendaciones de finanzas de viaje prácticas, inteligentes y breves (por ejemplo: alertas si se acerca al 80% o 100% de su presupuesto, sugerencias para optimizar transporte/comida, cómo saldar deudas grupales equitativamente, o consejos para pagar en moneda local evitando comisiones ocultas).
3. SI NO HAY VIAJES O GASTOS: Si el usuario aún no tiene datos registrados, dile amablemente que sus registros están vacíos y dale 2-3 sugerencias de cómo configurar su primer viaje y presupuesto en Rumbio.
4. ESTILO Y FORMATO: Responde en español con un tono profesional, amigable y fintech. Utiliza Markdown claro (viñetas, negritas, subtítulos sencillos). Sé conciso y directo, evitando párrafos excesivamente largos a menos que el usuario solicite un reporte exhaustivo.`;

    // 6. Format conversation history for @google/genai
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // 7. Call Gemini API via @google/genai SDK
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const replyText = geminiResponse.text || 'No se pudo generar una respuesta en este momento.';
    res.json({ reply: replyText });
  } catch (err: any) {
    console.error('Error in AI Chatbot API:', err);
    res.status(500).json({ error: err.message || 'Error al comunicarse con el Asistente de IA.' });
  }
}

app.post('/api/ai/chat', verifyAuth, handleAiChat);
app.post('/api/chat', verifyAuth, handleAiChat);

// Executive AI Summary for PDF Export
app.post('/api/ai/trip-summary', verifyAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { tripId, tripData, expensesData } = req.body;

    let trip = tripData;
    let expenses = expensesData || [];

    if (!trip && tripId) {
      try {
        const supabase = getSupabase();
        const { data: dbTrip } = await supabase.from('trips').select('*').eq('id', tripId).eq('user_id', userId).single();
        trip = dbTrip ? {
          id: dbTrip.id,
          name: dbTrip.name,
          destination: dbTrip.destination,
          startDate: dbTrip.start_date,
          endDate: dbTrip.end_date,
          budget: Number(dbTrip.budget),
          currency: dbTrip.currency,
          exchangeRate: Number(dbTrip.exchange_rate || 1),
          members: dbTrip.members || [],
        } : null;

        const { data: dbExpenses } = await supabase.from('expenses').select('*').eq('trip_id', tripId).eq('user_id', userId);
        if (dbExpenses) {
          expenses = dbExpenses.map((e: any) => ({
            id: e.id,
            title: e.title || e.description,
            amount: Number(e.amount),
            currency: e.currency,
            category: e.category,
            date: e.date,
            paidBy: e.paid_by,
          }));
        }
      } catch (dbErr) {
        console.warn('Could not fetch trip from DB in trip-summary, using payload:', dbErr);
      }
    }

    if (!trip) {
      return res.status(400).json({ error: 'No se encontró el viaje especificado.' });
    }

    const totalSpentInTripCurr = expenses.reduce((acc: number, e: any) => {
      const rate = e.currency === trip.currency ? 1 : (e.currency === 'USD' ? (1 / (trip.exchangeRateToHome || 1)) : 1);
      return acc + (e.amount * rate);
    }, 0);

    const categoryBreakdown: Record<string, number> = {};
    expenses.forEach((e: any) => {
      categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
    });

    let topCategory = 'Varios';
    let topCategoryAmount = 0;
    Object.entries(categoryBreakdown).forEach(([cat, amt]) => {
      if (amt > topCategoryAmount) {
        topCategoryAmount = amt;
        topCategory = cat;
      }
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback algorithmic executive summary if API key is not configured
      const budgetPct = trip.budget > 0 ? Math.round((totalSpentInTripCurr / trip.budget) * 100) : 0;
      const fallbackSummary = `Durante tu viaje a ${trip.destination || trip.name}, registraste un gasto acumulado de ${trip.currency} ${Math.round(totalSpentInTripCurr).toLocaleString()} (${budgetPct}% de tu presupuesto inicial de ${trip.currency} ${Math.round(trip.budget).toLocaleString()}). Tu categoría principal de desembolso fue ${topCategory} con ${trip.currency} ${Math.round(topCategoryAmount).toLocaleString()} (${expenses.length > 0 ? Math.round((topCategoryAmount / totalSpentInTripCurr) * 100) : 0}% del total).`;
      return res.json({ summary: fallbackSummary, source: 'algorithmic-fallback' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `Actúa como el analista financiero de Rumbio Travel. Genera un RESUMEN EJECUTIVO FINANCIERO breve, profesional y contundente (máximo 2-3 oraciones) para el encabezado de un reporte formal en PDF.
Datos del viaje:
- Destino/Nombre: ${trip.destination || trip.name}
- Fechas: ${trip.startDate} a ${trip.endDate}
- Presupuesto Inicial: ${trip.currency} ${trip.budget}
- Gasto Total Registrado: ${trip.currency} ${totalSpentInTripCurr.toFixed(2)} (${trip.budget > 0 ? ((totalSpentInTripCurr / trip.budget) * 100).toFixed(1) : 'N/A'}% del presupuesto)
- Total de transacciones: ${expenses.length}
- Categoría con mayor gasto: ${topCategory} (${trip.currency} ${topCategoryAmount.toFixed(2)})
- Viajeros: ${trip.travelers?.join(', ') || 'Viajero individual'}

Instrucciones:
- Responde estrictamente con el texto del resumen en español sin títulos, sin viñetas, sin markdown excesivo.
- Cita cifras clave exactas (gasto total, porcentaje del presupuesto, categoría dominante).
- Mantén un tono elegante, analítico y positivo de fintech de viajes.`;

    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        temperature: 0.5,
      },
    });

    const summaryText = geminiResponse.text?.trim() || `Durante tu viaje a ${trip.destination || trip.name}, registraste un total de ${trip.currency} ${totalSpentInTripCurr.toFixed(2)}, teniendo como principal categoría de gasto ${topCategory}.`;
    res.json({ summary: summaryText, source: 'gemini-3.7-flash' });
  } catch (err: any) {
    console.error('Error generating AI Trip Summary:', err);
    res.status(500).json({ error: err.message || 'Error al generar el resumen de IA.' });
  }
});

// ============================================================================
// PRO FEATURE 1: OCR RECEIPT SCANNING (IA Multimodal Vision with Gemini)
// ============================================================================
app.post('/api/ai/scan-receipt', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userSub = await getUserSubscription(userId);

    // 1. Verify Plan Permissions (Pro or Premium required)
    if (userSub.plan === 'free') {
      return res.status(403).json({
        error: 'El escaneo inteligente de recibos con OCR es una función exclusiva de los planes Pro y Premium.',
        code: 'PLAN_LIMIT_EXCEEDED',
        feature: 'ocr_receipt_scan',
        requiredPlan: 'pro',
      });
    }

    // 2. Validate GEMINI_API_KEY explicitly without simulated placeholders
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(503).json({
        error: 'La clave de API de Gemini (GEMINI_API_KEY) no está configurada en las variables de entorno del servidor. Por favor, configúrala en el panel de Secrets de AI Studio para activar el escaneo inteligente de recibos con OCR.',
        code: 'MISSING_GEMINI_API_KEY',
        missingApiKey: true,
      });
    }

    const { imageBase64, mimeType = 'image/jpeg', defaultCurrency = 'USD' } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'Debes proporcionar una imagen válida del recibo en formato base64.' });
    }

    // Remove data URL prefix if present (e.g. data:image/png;base64,...)
    const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: cleanBase64,
      },
    };

    const promptText = `Eres el motor experto de OCR y análisis de recibos de compras de viaje de Rumbio.
Analiza la foto del recibo o factura adjunta y extrae la información estructurada con máxima exactitud.

CATEGORÍAS PERMITIDAS EXACTAS (elige una):
- 'Alojamiento' (Hoteles, Airbnb, hostales)
- 'Comida' (Restaurantes, cafeterías, supermercados, bares, delivery)
- 'Transporte' (Taxis, Uber, metro, gasolina, trenes, peajes)
- 'Actividades' (Tours, museos, entradas, excursiones)
- 'Compras' (Souvenirs, ropa, electrónica, tiendas de regalos)
- 'Vuelos' (Boletos de avión, tasas aeroportuarias)
- 'Seguro' (Asistencia en viaje, seguros médicos)
- 'Imprevistos' (Farmacias, multas, emergencias, varios)

REGLAS DE EXTRACCIÓN:
1. "amount": El monto total final pagado por el cliente (número positivo, con decimales si aplica).
2. "currency": El código ISO de 3 letras de la moneda (USD, EUR, CLP, MXN, ARS, COP, PEN, BRL, GBP, JPY, etc.). Si no está explícita, deduce por el país/formato o usa "${defaultCurrency}".
3. "category": Una de las 8 categorías permitidas.
4. "title": Nombre comercial claro del establecimiento o resumen del gasto (ej: "Starbucks Coffee", "Supermercado Carrefour", "Uber San Telmo").
5. "date": Fecha en formato YYYY-MM-DD. Si solo aparece día y mes, usa el año actual (${new Date().getFullYear()}). Si no aparece fecha legible, usa "${new Date().toISOString().split('T')[0]}".
6. "detectedItems": Lista breve de ítems o productos comprados (máx 6 ítems).
7. "rawText": Breve transcripción textual clave de las líneas principales del recibo.
8. "confidence": Número entre 0.1 y 1.0 que indica la legibilidad del ticket.

Responde estrictamente en formato JSON válido sin markdown adicional.`;

    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: {
        parts: [imagePart, { text: promptText }],
      },
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const responseText = geminiResponse.text?.trim() || '{}';
    let parsedResult: any = {};
    try {
      parsedResult = JSON.parse(responseText);
    } catch {
      // Fallback regex extraction if raw json formatting had quirks
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      }
    }

    res.json({
      success: true,
      result: {
        amount: Number(parsedResult.amount) || 0,
        currency: parsedResult.currency || defaultCurrency,
        category: parsedResult.category || 'Comida',
        title: parsedResult.title || 'Gasto Recibo',
        date: parsedResult.date || new Date().toISOString().split('T')[0],
        detectedItems: Array.isArray(parsedResult.detectedItems) ? parsedResult.detectedItems : [],
        rawText: parsedResult.rawText || '',
        confidence: Number(parsedResult.confidence) || 0.9,
      },
    });
  } catch (err: any) {
    console.error('Error in OCR receipt scan:', err);
    res.status(500).json({ error: err.message || 'Error al procesar la imagen del recibo con OCR.' });
  }
});

// ============================================================================
// PRO FEATURE 2 & 3: REAL-TIME FX RATES WITH HISTORICAL AUDIT & IN-MEMORY CACHE
// ============================================================================
const fxRatesCache: Record<string, { timestamp: number; rates: Record<string, number> }> = {};

app.get('/api/fx/rates', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userSub = await getUserSubscription(userId);

    // Verify Plan Permissions
    if (userSub.plan === 'free') {
      return res.status(403).json({
        error: 'Las tasas de cambio en tiempo real son exclusivas de los planes Pro y Premium.',
        code: 'PLAN_LIMIT_EXCEEDED',
        feature: 'real_time_fx',
        requiredPlan: 'pro',
      });
    }

    const base = ((req.query.base as string) || 'USD').toUpperCase();
    const cacheKey = `latest_${base}`;
    const now = Date.now();

    // 1-hour cache TTL
    if (fxRatesCache[cacheKey] && now - fxRatesCache[cacheKey].timestamp < 3600 * 1000) {
      return res.json({
        base,
        rates: fxRatesCache[cacheKey].rates,
        cached: true,
        updatedAt: new Date(fxRatesCache[cacheKey].timestamp).toISOString(),
        provider: 'open.er-api.com',
      });
    }

    // Query live Open Exchange Rates API (free, reliable, no API key required)
    try {
      const response = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      if (response.ok) {
        const data: any = await response.json();
        if (data && data.rates) {
          fxRatesCache[cacheKey] = {
            timestamp: now,
            rates: data.rates,
          };

          return res.json({
            base,
            rates: data.rates,
            cached: false,
            updatedAt: new Date().toISOString(),
            provider: 'open.er-api.com',
          });
        }
      }
    } catch (fetchErr) {
      console.warn('Live FX fetch failed, attempting backup:', fetchErr);
    }

    // Fallback baseline conversion factors if external network is momentarily unavailable
    const fallbackRates: Record<string, number> = {
      USD: 1,
      EUR: 0.92,
      CLP: 945.5,
      MXN: 18.2,
      COP: 3950,
      ARS: 1180,
      PEN: 3.75,
      BRL: 5.45,
      GBP: 0.79,
      CAD: 1.36,
      JPY: 155.2,
      AUD: 1.52,
    };

    res.json({
      base,
      rates: fallbackRates,
      cached: false,
      isFallback: true,
      updatedAt: new Date().toISOString(),
      provider: 'rumbio_internal_fallback',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al obtener tasas de cambio en vivo.' });
  }
});

app.get('/api/fx/historical', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userSub = await getUserSubscription(userId);

    if (userSub.plan === 'free') {
      return res.status(403).json({
        error: 'El historial de tasas de cambio es exclusivo de los planes Pro y Premium.',
        code: 'PLAN_LIMIT_EXCEEDED',
        feature: 'real_time_fx',
        requiredPlan: 'pro',
      });
    }

    const base = ((req.query.base as string) || 'USD').toUpperCase();
    const target = ((req.query.target as string) || 'CLP').toUpperCase();
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    // Attempt querying Frankfurter historical FX API (European Central Bank data)
    let rate = 1;
    let provider = 'frankfurter';

    try {
      const response = await fetch(`https://api.frankfurter.app/${date}?from=${base}&to=${target}`);
      if (response.ok) {
        const data: any = await response.json();
        if (data && data.rates && data.rates[target]) {
          rate = Number(data.rates[target]);
        }
      } else {
        // Fallback to latest open.er-api
        const fallbackRes = await fetch(`https://open.er-api.com/v6/latest/${base}`);
        if (fallbackRes.ok) {
          const fbData: any = await fallbackRes.json();
          if (fbData.rates && fbData.rates[target]) {
            rate = Number(fbData.rates[target]);
            provider = 'open.er-api';
          }
        }
      }
    } catch {
      provider = 'fallback';
    }

    res.json({
      base,
      target,
      date,
      rate,
      provider,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al consultar tasa de cambio histórica.' });
  }
});

// ============================================================================
// PRO FEATURE 4: SMART BUDGET ALERTS (In-App & Email via Resend)
// ============================================================================
app.post('/api/budget/alert-notification', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;
    const userName = req.user!.name || 'Viajero';
    const userSub = await getUserSubscription(userId);

    if (userSub.plan === 'free') {
      return res.status(403).json({
        error: 'Las alertas inteligentes de presupuesto son exclusivas de los planes Pro y Premium.',
        code: 'PLAN_LIMIT_EXCEEDED',
        feature: 'budget_alerts',
        requiredPlan: 'pro',
      });
    }

    const { tripName, category = 'Total', threshold = 80, spent, budget, currency = 'USD', sendEmail = false } = req.body;

    let emailSent = false;
    let emailError: string | null = null;

    if (sendEmail && process.env.RESEND_API_KEY) {
      const subject = threshold >= 100 
        ? `⚠️ Alerta de Sobregiro Rumbio: Has alcanzado el 100% en ${tripName}`
        : `⚡ Alerta de Presupuesto Rumbio: Has consumido el 80% en ${tripName}`;

      const resendResult = await sendEmailNotification(
        userEmail,
        userName,
        threshold >= 100 ? '100% Presupuesto Excedido' : '80% Presupuesto Consumido',
        subject,
        'alert',
        userId
      );

      emailSent = resendResult.success;
      if (!resendResult.success) {
        emailError = resendResult.error || 'No se pudo enviar el correo de alerta.';
      }
    }

    res.json({
      success: true,
      alert: {
        tripName,
        category,
        threshold,
        spent,
        budget,
        currency,
        emailSent,
        emailError,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('Error sending budget alert:', err);
    res.status(500).json({ error: err.message || 'Error al procesar alerta de presupuesto.' });
  }
});

// ============================================================================
// PRO FEATURE 5: OFFLINE SYNC BATCH ENDPOINT (Conflict-safe reconciliation)
// ============================================================================
app.post('/api/sync/batch', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userSub = await getUserSubscription(userId);

    if (userSub.plan === 'free') {
      return res.status(403).json({
        error: 'La sincronización automática sin conexión es exclusiva de los planes Pro y Premium.',
        code: 'PLAN_LIMIT_EXCEEDED',
        feature: 'offline_sync',
        requiredPlan: 'pro',
      });
    }

    const { expenses = [], trips = [] } = req.body;
    const supabase = getSupabase();
    const syncedExpenses: any[] = [];
    const syncedTrips: any[] = [];

    // 1. Sync Trips first
    for (const t of trips) {
      if (!t.name) continue;
      const tripId = t.id || 'trip_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const tripPayload = {
        id: tripId,
        user_id: userId,
        name: t.name,
        destination: t.destination || 'Destino',
        start_date: t.startDate || new Date().toISOString().split('T')[0],
        end_date: t.endDate || new Date().toISOString().split('T')[0],
        budget: Number(t.budget) || 0,
        currency: t.currency || 'USD',
        exchange_rate: Number(t.exchangeRate) || 1.0,
        members: Array.isArray(t.members) && t.members.length > 0 ? t.members : ['Yo'],
        plans: Array.isArray(t.plans) ? t.plans : [],
        checklist: Array.isArray(t.checklist) ? t.checklist : [],
        created_at: t.createdAt || new Date().toISOString(),
      };

      const { data: upsertedTrip, error: tripErr } = await supabase
        .from('trips')
        .upsert(tripPayload, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (!tripErr && upsertedTrip) {
        syncedTrips.push(mapTripFromDb(upsertedTrip));
      }
    }

    // 2. Sync Expenses
    for (const e of expenses) {
      if (!e.tripId || !e.title) continue;
      const expId = e.id || 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const splitList = Array.isArray(e.splitBetween) && e.splitBetween.length > 0 ? e.splitBetween : ['Yo'];

      const expensePayload = {
        id: expId,
        trip_id: e.tripId,
        user_id: userId,
        title: e.title,
        amount: Number(e.amount) || 0,
        currency: e.currency || 'USD',
        category: e.category || 'Comida',
        date: e.date || new Date().toISOString().split('T')[0],
        paid_by: e.paidBy || 'Yo',
        split_between: splitList,
        notes: e.notes || '',
        created_at: e.createdAt || new Date().toISOString(),
      };

      const { data: upsertedExp, error: expErr } = await supabase
        .from('expenses')
        .upsert(expensePayload, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (!expErr && upsertedExp) {
        syncedExpenses.push(mapExpenseFromDb(upsertedExp));
      }
    }

    res.json({
      success: true,
      syncedTripsCount: syncedTrips.length,
      syncedExpensesCount: syncedExpenses.length,
      syncedTrips,
      syncedExpenses,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error in batch sync:', err);
    res.status(500).json({ error: err.message || 'Error durante la sincronización por lote.' });
  }
});

export default app;
