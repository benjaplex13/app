-- ============================================================================
-- RUMBIO - ESQUEMA DE BASE DE DATOS SUPABASE (POSTGRESQL)
-- ============================================================================
-- Copia y pega este script completo en el SQL Editor de tu proyecto en Supabase.
-- Crea las tablas optimizadas, índices y políticas de seguridad (RLS).
-- ============================================================================

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_code TEXT,
  verification_code_expires BIGINT,
  home_currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Viajes
CREATE TABLE IF NOT EXISTS public.trips (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  budget NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  exchange_rate NUMERIC NOT NULL DEFAULT 1.0,
  members JSONB NOT NULL DEFAULT '["Yo"]'::jsonb,
  plans JSONB NOT NULL DEFAULT '[]'::jsonb,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Gastos
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  category TEXT NOT NULL DEFAULT 'Comida',
  date TEXT NOT NULL,
  paid_by TEXT NOT NULL DEFAULT 'Yo',
  split_between JSONB NOT NULL DEFAULT '["Yo"]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Auditoría de Correos y OTP
CREATE TABLE IF NOT EXISTS public.email_logs (
  id TEXT PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  type TEXT NOT NULL,
  code TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES PARA RENDIMIENTO RÁPIDO EN CONSULTAS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON public.expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at DESC);

-- ============================================================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- El backend de Rumbio utiliza la clave `SUPABASE_SERVICE_ROLE_KEY` en el servidor,
-- permitiéndole realizar operaciones autenticadas de forma segura y aislar los
-- datos por `user_id`.
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para acceso por Service Role
CREATE POLICY "Service Role Full Access Users" ON public.users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service Role Full Access Trips" ON public.trips
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service Role Full Access Expenses" ON public.expenses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service Role Full Access EmailLogs" ON public.email_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
