import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Mail, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  ShieldCheck, 
  KeyRound, 
  RefreshCw, 
  Sparkles, 
  DollarSign, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CurrencyCode, User } from '../types';
import { CURRENCIES, CURRENCIES_BY_REGION } from '../data/currencies';
import { api } from '../utils/api';
import { RumbioLogo } from '../components/RumbioLogo';
import { OtpInput } from '../components/OtpInput';
import { LegalTab } from '../components/LegalModal';
import { RegistrationWelcomeModal } from '../components/RegistrationWelcomeModal';

interface AuthViewProps {
  onLoginSuccess: (user: User) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onOpenLegal?: (tab: LegalTab) => void;
}

type AuthMode = 'login' | 'register' | 'verify' | 'forgot' | 'reset-password';

export const AuthView: React.FC<AuthViewProps> = ({
  onLoginSuccess,
  onShowToast,
  onOpenLegal,
}) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [homeCurrency, setHomeCurrency] = useState<CurrencyCode>('USD');
  const [isLoading, setIsLoading] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [welcomeUser, setWelcomeUser] = useState<User | null>(null);
  const [isQuickAddIntent, setIsQuickAddIntent] = useState(false);

  useEffect(() => {
    try {
      const path = window.location.pathname.toLowerCase();
      const search諮 = window.location.search.toLowerCase();
      if (
        path.startsWith('/quick-add') ||
        path.startsWith('/quick') ||
        search諮.includes('quick-add') ||
        sessionStorage.getItem('rumbio_pending_quick_add') === 'true'
      ) {
        setIsQuickAddIntent(true);
        sessionStorage.setItem('rumbio_pending_quick_add', 'true');
      }
    } catch {}
  }, []);

  const handleLogoEasterEgg = () => {
    const next = logoClicks + 1;
    setLogoClicks(next);
    if (next >= 5) {
      setLogoClicks(0);
      confetti({
        particleCount: 160,
        spread: 80,
        origin: { y: 0.5 },
      });
      onShowToast('🎉 ¡Modo Fiesta de Viajeros Desbloqueado desde el inicio!', 'success');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      onShowToast('Ingresa tu correo y contraseña.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.login(email.trim(), password);
      onShowToast(`¡Bienvenido a bordo, ${response.user.name}!`, 'success');
      onLoginSuccess(response.user);
    } catch (err: any) {
      if (err.data?.requiresVerification) {
        onShowToast('Tu cuenta requiere activación previa.', 'warning');
        setMode('verify');
      } else {
        onShowToast(err.message || 'Error al iniciar sesión.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      onShowToast('Por favor completa todos los campos requeridos.', 'warning');
      return;
    }

    if (password.length < 6) {
      onShowToast('La contraseña debe tener al menos 6 caracteres.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      await api.register(name.trim(), email.trim(), password, homeCurrency);
      onShowToast('✉️ ¡Código OTP enviado a tu correo! Revisa tu bandeja de entrada o spam.', 'success');
      setMode('verify');
    } catch (err: any) {
      onShowToast(err.message || 'Error al registrar la cuenta.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) {
      onShowToast('Ingresa el código de 6 dígitos recibido por correo.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const result = await api.verifyOtp(email.trim(), verifyCode.trim());
      onShowToast('¡Cuenta verificada y protegida exitosamente!', 'success');
      setWelcomeUser(result.user);
    } catch (err: any) {
      onShowToast(err.message || 'Código de verificación incorrecto.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email.trim()) {
      onShowToast('Ingresa tu correo primero.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      await api.resendOtp(email.trim());
      onShowToast('✉️ Nuevo código OTP enviado a tu correo.', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Error al reenviar código.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      onShowToast('Ingresa tu correo registrado.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      await api.forgotPassword(email.trim());
      onShowToast('🔒 Código de recuperación enviado a tu correo.', 'success');
      setMode('reset-password');
    } catch (err: any) {
      onShowToast(err.message || 'Error al solicitar recuperación.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim() || !password) {
      onShowToast('Completa el código y la nueva contraseña.', 'warning');
      return;
    }

    if (password.length < 6) {
      onShowToast('La nueva contraseña debe tener al menos 6 caracteres.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      await api.resetPassword(email.trim(), verifyCode.trim(), password);
      onShowToast('¡Contraseña actualizada con cifrado seguro! Ya puedes ingresar.', 'success');
      setMode('login');
      setPassword('');
      setVerifyCode('');
    } catch (err: any) {
      onShowToast(err.message || 'Código incorrecto o expirado.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#050811] relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl rounded-[32px] p-8 sm:p-10 shadow-2xl relative border border-white/10">
        {/* Brand Header */}
        {/* Brand Header with Easter Egg */}
        <div className="text-center mb-8">
          <div
            onClick={handleLogoEasterEgg}
            className="inline-flex items-center justify-center p-3 rounded-3xl bg-slate-900/90 border border-white/10 shadow-2xl shadow-blue-600/30 mb-4 cursor-pointer select-none transform hover:scale-105 active:scale-95 transition-all group"
            title="Rumbio - Presiona 5 veces"
          >
            <RumbioLogo concept="growth-compass" variant="icon" size={54} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white font-display flex items-center justify-center gap-1">
            Rumbio<span className="text-cyan-400">.</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-1">
            Finanzas de Viaje • Control Total de Presupuesto
          </p>
        </div>

        {/* Quick Add Intent Notice */}
        {isQuickAddIntent && (
          <div className="mb-6 bg-gradient-to-r from-cyan-950/90 to-blue-950/90 border border-cyan-500/40 rounded-2xl p-3.5 flex items-center space-x-3 shadow-lg shadow-cyan-500/10 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400 animate-pulse" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                Atajo de Registro Rápido
                <span className="text-[9px] bg-cyan-400/20 text-cyan-300 px-1.5 py-0.5 rounded-full font-mono">10s</span>
              </div>
              <p className="text-[11px] text-cyan-200/80 leading-snug">
                Inicia sesión para abrir directamente la hoja de registro de gastos.
              </p>
            </div>
          </div>
        )}

        {/* ================= LOGIN FORM ================= */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-4 top-3.5 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@viaje.com"
                  className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white text-xs sm:text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                  Contraseña (Hash bcrypt)
                </label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  ¿Olvidaste tu clave?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-3.5 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white text-xs sm:text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 text-sm mt-4 active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Iniciar Viaje Seguro</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-4 text-xs text-slate-400 border-t border-white/5 mt-6">
              ¿No tienes cuenta aún?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-cyan-400 font-bold hover:underline"
              >
                Regístrate gratis
              </button>
            </div>
          </form>
        )}

        {/* ================= REGISTER FORM ================= */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Nombre Completo
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-4 top-3.5 text-slate-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Sofía Valenzuela"
                  className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white text-xs sm:text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Correo Electrónico Real
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-4 top-3.5 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sofia@viaje.com"
                  className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white text-xs sm:text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Contraseña (Cifrado con bcrypt)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-3.5 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white text-xs sm:text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-cyan-400" /> Moneda Base de Cuenta
              </label>
              <select
                value={homeCurrency}
                onChange={(e) => setHomeCurrency(e.target.value as CurrencyCode)}
                className="w-full bg-slate-900 border border-white/10 rounded-2xl py-3 px-4 text-white text-xs focus:border-blue-500 focus:outline-none"
              >
                {CURRENCIES_BY_REGION.map((group) => (
                  <optgroup key={group.region} label={group.region} className="bg-slate-900 text-slate-300 font-semibold">
                    {group.currencies.map((c) => (
                      <option key={c.code} value={c.code} className="bg-slate-950 text-white">
                        {c.flag} {c.code} - {c.name} ({c.symbol})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 text-sm mt-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando código seguro...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Crear Cuenta y Recibir Código</span>
                </>
              )}
            </button>

            <div className="text-center pt-3 text-xs text-slate-400">
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-cyan-400 font-bold hover:underline"
              >
                Inicia sesión
              </button>
            </div>
          </form>
        )}

        {/* ================= OTP VERIFICATION FORM ================= */}
        {mode === 'verify' && (
          <form onSubmit={handleVerifySubmit} className="space-y-5">
            <div className="p-4 bg-blue-950/40 border border-blue-500/30 rounded-2xl text-xs text-cyan-200 flex items-start space-x-3">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 text-cyan-400 mt-0.5" />
              <div>
                <span className="font-bold block text-white">Código de Verificación OTP</span>
                <span>
                  Revisa tu bandeja de entrada o spam en <b>{email}</b> e introduce el código de 6 dígitos enviado por correo.
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest text-center">
                Ingresa el código de 6 dígitos
              </label>
              
              <OtpInput
                length={6}
                value={verifyCode}
                onChange={setVerifyCode}
                onComplete={(code) => {
                  setVerifyCode(code);
                }}
                disabled={isLoading}
                autoFocus={true}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || verifyCode.length < 6}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-emerald-600/25 transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verificar y Activar Cuenta</span>
                </>
              )}
            </button>

            <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
              <button
                type="button"
                onClick={() => setMode('register')}
                className="hover:text-slate-200 cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isLoading}
                className="text-cyan-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Reenviar código
              </button>
            </div>
          </form>
        )}

        {/* ================= FORGOT PASSWORD FORM ================= */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div className="text-xs text-slate-300">
              Ingresa el correo registrado de tu cuenta. Te enviaremos un código seguro para restablecer tu contraseña.
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Correo Registrado
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-4 top-3.5 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@viaje.com"
                  className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white text-xs sm:text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-blue-600/20 transition-all text-sm cursor-pointer active:scale-95"
            >
              {isLoading ? 'Enviando código...' : 'Enviar Código de Recuperación'}
            </button>

            <div className="text-center pt-3 text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-cyan-400 font-bold hover:underline cursor-pointer"
              >
                Volver al inicio de sesión
              </button>
            </div>
          </form>
        )}

        {/* ================= RESET PASSWORD WITH CODE FORM ================= */}
        {mode === 'reset-password' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest text-center">
                Código de 6 dígitos recibido
              </label>
              <OtpInput
                length={6}
                value={verifyCode}
                onChange={setVerifyCode}
                onComplete={(code) => {
                  setVerifyCode(code);
                }}
                disabled={isLoading}
                autoFocus={true}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Nueva Contraseña (bcrypt)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-4 top-3.5 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white text-xs placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || verifyCode.length < 6}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-emerald-600/25 transition-all text-sm cursor-pointer active:scale-95"
            >
              {isLoading ? 'Actualizando contraseña...' : 'Restablecer y Cifrar Contraseña'}
            </button>

            <div className="text-center pt-3 text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-cyan-400 font-bold hover:underline cursor-pointer"
              >
                Cancelar y volver
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Landing Legal & Trust Footer */}
      <footer className="w-full max-w-2xl mt-8 text-center z-10 px-4 space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
          <button
            type="button"
            onClick={() => onOpenLegal && onOpenLegal('privacy')}
            className="hover:text-cyan-300 transition underline underline-offset-4 cursor-pointer"
          >
            Política de Privacidad
          </button>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <button
            type="button"
            onClick={() => onOpenLegal && onOpenLegal('terms')}
            className="hover:text-cyan-300 transition underline underline-offset-4 cursor-pointer"
          >
            Términos y Condiciones
          </button>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <button
            type="button"
            onClick={() => onOpenLegal && onOpenLegal('contact')}
            className="hover:text-cyan-300 transition underline underline-offset-4 cursor-pointer"
          >
            Contacto & Soporte
          </button>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <button
            type="button"
            onClick={() => onOpenLegal && onOpenLegal('cookies')}
            className="hover:text-cyan-300 transition underline underline-offset-4 cursor-pointer"
          >
            Cookies
          </button>
        </div>

        <div className="text-[11px] text-slate-400 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span>🔒 Cifrado SSL / TLS</span>
          <span>•</span>
          <span>💾 Base de datos Supabase</span>
          <span>•</span>
          <span>🚫 Cero venta de datos personales</span>
        </div>
      </footer>

      {/* Post-Registration Thank You & Welcome Onboarding Screen */}
      {welcomeUser && (
        <RegistrationWelcomeModal
          user={welcomeUser}
          onContinue={() => {
            const u = welcomeUser;
            setWelcomeUser(null);
            onLoginSuccess(u);
          }}
        />
      )}
    </div>
  );
};
