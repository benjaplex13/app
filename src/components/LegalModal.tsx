import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  FileText, 
  Mail, 
  Cookie, 
  Copy, 
  Check, 
  ExternalLink, 
  Trash2, 
  Lock, 
  Database, 
  CreditCard, 
  HelpCircle,
  Sparkles,
  Send
} from 'lucide-react';

export type LegalTab = 'privacy' | 'terms' | 'contact' | 'cookies';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'privacy',
  onClose,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Quick contact form state
  const [contactSubject, setContactSubject] = useState('Consulta general sobre Rumbio');
  const [contactMessage, setContactMessage] = useState('');

  // Sync initial tab when modal opens
  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const officialEmail = 'benchomateosa@gmail.com';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(officialEmail);
    setCopiedEmail(true);
    if (onShowToast) {
      onShowToast('📋 Correo copiado al portapapeles: ' + officialEmail, 'success');
    }
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleSendContactEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoUrl = `mailto:${officialEmail}?subject=${encodeURIComponent(
      contactSubject
    )}&body=${encodeURIComponent(contactMessage || 'Hola Bencho,\n\nEscribo desde Rumbio para...')}`;
    window.location.href = mailtoUrl;
    if (onShowToast) {
      onShowToast('Abriendo tu cliente de correo para enviar el mensaje...', 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-3xl max-h-[90vh] bg-[#070b16] border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-200 relative">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-cyan-400">
              {activeTab === 'privacy' && <ShieldCheck className="w-5 h-5" />}
              {activeTab === 'terms' && <FileText className="w-5 h-5" />}
              {activeTab === 'contact' && <Mail className="w-5 h-5" />}
              {activeTab === 'cookies' && <Cookie className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-display">
                {activeTab === 'privacy' && 'Política de Privacidad'}
                {activeTab === 'terms' && 'Términos y Condiciones'}
                {activeTab === 'contact' && 'Contacto y Soporte Oficial'}
                {activeTab === 'cookies' && 'Uso de Cookies y Almacenamiento'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Rumbio • Transparencia, Seguridad y Confianza
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 pb-0 border-b border-white/5 flex space-x-1 sm:space-x-2 overflow-x-auto bg-slate-900/40">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-3 sm:px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'privacy'
                ? 'text-cyan-400 border-cyan-400 bg-white/5'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacidad</span>
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`px-3 sm:px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'terms'
                ? 'text-cyan-400 border-cyan-400 bg-white/5'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Términos</span>
          </button>

          <button
            onClick={() => setActiveTab('contact')}
            className={`px-3 sm:px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'contact'
                ? 'text-cyan-400 border-cyan-400 bg-white/5'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Contacto</span>
          </button>

          <button
            onClick={() => setActiveTab('cookies')}
            className={`px-3 sm:px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'cookies'
                ? 'text-cyan-400 border-cyan-400 bg-white/5'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            <Cookie className="w-3.5 h-3.5" />
            <span>Cookies</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 text-xs sm:text-sm text-slate-300 space-y-6 leading-relaxed">
          
          {/* ================= 1. POLÍTICA DE PRIVACIDAD ================= */}
          {activeTab === 'privacy' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl text-emerald-200 text-xs flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <b className="text-white block mb-0.5">Resumen de Privacidad Honesta</b>
                  Guardamos únicamente lo indispensable para que gestiones tus viajes. No vendemos tus datos a nadie, y puedes pedir la eliminación de tu cuenta en cualquier momento.
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" /> 1. ¿Qué datos recopilamos y guardamos?
                </h3>
                <p>
                  Para poder ofrecerte la experiencia completa de planificación y control de gastos en Rumbio, almacenamos:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300 text-xs">
                  <li>
                    <b className="text-white">Datos de cuenta:</b> Tu nombre completo y correo electrónico (para autenticación segura y envío de códigos OTP de acceso).
                  </li>
                  <li>
                    <b className="text-white">Datos de tus viajes:</b> Nombres de destinos, fechas de viaje, moneda de origen, moneda local y presupuesto total configurado.
                  </li>
                  <li>
                    <b className="text-white">Registro de gastos y notas:</b> Montos, monedas, categorías (alojamiento, comida, transporte, etc.), método de pago, fecha del gasto, notas y nombres de acompañantes para la división de cuentas.
                  </li>
                  <li>
                    <b className="text-white">Listas y preferencias:</b> Items de checklist de equipaje, moneda base de visualización y configuración de suscripción.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-400" /> 2. ¿Dónde se almacenan tus datos?
                </h3>
                <p>
                  Toda tu información se almacena de forma segura en <b className="text-white">Supabase</b>, una plataforma de base de datos PostgreSQL de nivel empresarial que cuenta con:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-300 text-xs">
                  <li>Aislamiento estricto por usuario (Row Level Security / vinculación directa por <span className="font-mono text-cyan-400">user_id</span>).</li>
                  <li>Cifrado de datos en tránsito mediante protocolos seguros HTTPS / SSL (TLS 1.3).</li>
                  <li>Contraseñas cifradas mediante algoritmos irreversibles (bcrypt) en los servidores.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> 3. No vendemos ni compartimos tu información
                </h3>
                <p>
                  <b className="text-white">Rumbio no vende, no comercializa ni comparte tus datos personales o financieros</b> con anunciantes, empresas de marketing, intermediarios ni corredores de datos. La información que ingresas es únicamente para tu uso y control de tus viajes.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" /> 4. Funciones de Inteligencia Artificial (IA)
                </h3>
                <p className="text-xs">
                  Las funciones como el escáner de boletas (OCR) y el asesor de presupuesto utilizan modelos de procesamiento puntuales. Tus datos se envían únicamente para generar la respuesta solicitada en tiempo real y no se utilizan para entrenar modelos públicos de terceros.
                </p>
              </section>

              <section className="space-y-2.5 p-4 bg-slate-900/70 rounded-2xl border border-white/10">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-400" /> 5. ¿Cómo solicitar la eliminación de tu cuenta y datos?
                </h3>
                <p className="text-xs">
                  Tienes pleno derecho a solicitar la eliminación permanente de tu cuenta y de todos tus viajes y gastos registrados en cualquier momento.
                </p>
                <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <a
                    href={`mailto:${officialEmail}?subject=Solicitud%20de%20Eliminaci%C3%B3n%20de%20Cuenta%20Rumbio&body=Hola%20Bencho,%0A%0ASolicito%20la%20eliminaci%C3%B3n%20total%20y%20definitiva%20de%20mi%20cuenta%20de%20Rumbio%20asociada%20a%20este%20correo.%0A%0AGracias.`}
                    className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Pedir eliminación vía email ({officialEmail})</span>
                  </a>
                  <span className="text-[11px] text-slate-400">
                    Procesamiento en menos de 48 horas sin copias residuales.
                  </span>
                </div>
              </section>
            </div>
          )}

          {/* ================= 2. TÉRMINOS Y CONDICIONES ================= */}
          {activeTab === 'terms' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 bg-blue-950/30 border border-blue-500/30 rounded-2xl text-cyan-200 text-xs flex items-start space-x-3">
                <FileText className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <b className="text-white block mb-0.5">Términos Claros y Directos</b>
                  Reglas de uso honestas: suscripciones cancelables cuando quieras, uso personal respetuoso y claridad sobre la información de divisas.
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  1. Uso Aceptable del Servicio
                </h3>
                <p className="text-xs">
                  Rumbio es una plataforma diseñada para el control financiero, planificación de itinerarios y división de gastos durante viajes. Al utilizar Rumbio, te comprometes a usar la plataforma con fines lícitos y no intentar vulnerar la seguridad, autenticación o integridad de los servicios.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-cyan-400" /> 2. Planes de Suscripción y Pagos Recurrentes
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300 text-xs">
                  <li>
                    <b className="text-white">Plan Gratis:</b> Permite gestionar hasta 2 viajes activos con funciones esenciales de presupuesto y control de gastos sin costo alguno.
                  </li>
                  <li>
                    <b className="text-white">Planes Pro y Premium:</b> Son suscripciones periódicas (mensuales o anuales) que desbloquean viajes ilimitados, escaneo OCR de recibos, modo sin conexión PWA, analítica multidivisa y funciones avanzadas.
                  </li>
                  <li>
                    <b className="text-white">Cancelación libre en cualquier momento:</b> Puedes cancelar tu suscripción cuando desees directamente desde la sección "Perfil" de la app. Mantendrás todos los beneficios contratados hasta que finalice el período ya pagado, sin cobros sorpresa posteriores.
                  </li>
                  <li>
                    <b className="text-white">Procesamiento seguro:</b> Los pagos se procesan a través de pasarelas de pago seguras (como Flow.cl / Webpay). Rumbio nunca almacena directamente los números completos de tus tarjetas bancarias.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  3. Información de Monedas y Tasas de Cambio
                </h3>
                <p className="text-xs">
                  Las tasas de cambio se obtienen en tiempo real a través de servicios de referencia internacionales y se proporcionan con carácter <b className="text-white">exclusivamente informativo</b> para facilitar tus cálculos de viaje. Ten presente que las tasas efectivas aplicadas por tus bancos o tarjetas de crédito pueden diferir ligeramente según las comisiones de tu entidad emisora.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  4. Disponibilidad y Límite de Responsabilidad
                </h3>
                <p className="text-xs">
                  Nos esforzamos por ofrecer la máxima estabilidad y precisión en la plataforma. Rumbio se suministra "tal cual" y no se responsabiliza por diferencias bancarias de terceros, fluctuaciones imprevistas de tipo de cambio en comercios locales o pérdida de acceso debida a problemas de conectividad de tu proveedor de internet.
                </p>
              </section>
            </div>
          )}

          {/* ================= 3. CONTACTO ================= */}
          {activeTab === 'contact' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 bg-gradient-to-r from-blue-950/40 via-slate-900/80 to-[#070b16] border border-blue-500/30 rounded-2xl flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-cyan-300 shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Canal de Contacto Directo</h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    ¿Tienes dudas, sugerencias para nuevas funciones, problemas con tu suscripción o deseas solicitar soporte? Estoy a tu disposición.
                  </p>
                </div>
              </div>

              {/* Official Email Badge */}
              <div className="p-4 bg-slate-900/70 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                    Correo Electrónico Oficial de Soporte
                  </span>
                  <span className="text-sm sm:text-base font-mono font-bold text-cyan-400 select-all">
                    {officialEmail}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyEmail}
                    className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copiar correo</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`mailto:${officialEmail}?subject=Consulta%20Rumbio`}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-blue-600/20 transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Escribir ahora</span>
                  </a>
                </div>
              </div>

              {/* Direct Quick Form */}
              <form onSubmit={handleSendContactEmail} className="space-y-3.5 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Enviar Mensaje Rápido
                </h4>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Asunto de tu consulta
                  </label>
                  <select
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl p-2.5 text-white text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Consulta general sobre Rumbio">Consulta general o dudas</option>
                    <option value="Sugerencia de nueva función o moneda">Sugerencia de nueva función o moneda</option>
                    <option value="Soporte con mi suscripción o pago">Soporte con mi suscripción o pago</option>
                    <option value="Reporte de error técnico">Reporte de error técnico</option>
                    <option value="Solicitud de Eliminación de Cuenta">Solicitud de eliminación de cuenta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Mensaje o detalles (opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Escribe brevemente tu consulta o sugerencia..."
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl p-2.5 text-white text-xs placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-blue-600/25 cursor-pointer active:scale-98"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Abrir cliente de correo con este mensaje</span>
                </button>
              </form>

              <div className="p-3 bg-slate-900/40 rounded-xl text-center text-[11px] text-slate-400">
                ⏱️ Tiempo estimado de respuesta: <b className="text-slate-200">24 a 48 horas hábiles</b>.
              </div>
            </div>
          )}

          {/* ================= 4. COOKIES Y ALMACENAMIENTO ================= */}
          {activeTab === 'cookies' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-2xl text-amber-200 text-xs flex items-start space-x-3">
                <Cookie className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <b className="text-white block mb-0.5">Uso Técnico y Limpio de Almacenamiento</b>
                  En Rumbio no utilizamos cookies de terceros para rastrearte por internet ni para mostrar publicidad intrusiva.
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  ¿Qué almacenamiento local utilizamos y para qué?
                </h3>
                <p className="text-xs">
                  Utilizamos las capacidades de almacenamiento seguro de tu navegador (<code className="font-mono text-cyan-400">localStorage</code> y memoria de sesión) únicamente para fines técnicos indispensables:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 bg-slate-900/60 border border-white/5 rounded-2xl space-y-1">
                    <b className="text-white text-xs flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-cyan-400" /> Sesión Autenticada
                    </b>
                    <p className="text-[11px] text-slate-400">
                      Guarda de forma encriptada tu token de acceso para que no tengas que ingresar tus credenciales cada vez que recargues la app.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-900/60 border border-white/5 rounded-2xl space-y-1">
                    <b className="text-white text-xs flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-400" /> Caché Local Offline PWA
                    </b>
                    <p className="text-[11px] text-slate-400">
                      Permite que tus viajes y gastos se mantengan visibles en tu teléfono o computadora incluso cuando estés en un avión o sin conexión a internet.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-900/60 border border-white/5 rounded-2xl space-y-1">
                    <b className="text-white text-xs flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-400" /> Preferencias de Viaje
                    </b>
                    <p className="text-[11px] text-slate-400">
                      Recuerda tu moneda base preferida y el concepto visual del logo seleccionado.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-900/60 border border-white/5 rounded-2xl space-y-1">
                    <b className="text-white text-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Sin Rastreadores de Publicidad
                    </b>
                    <p className="text-[11px] text-slate-400">
                      Cero píxeles de remarketing o scripts de terceros para venta de perfiles de navegación.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-2 pt-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Control en tu navegador
                </h3>
                <p className="text-xs text-slate-300">
                  Puedes borrar el almacenamiento local o cookies técnicas en cualquier momento desde los ajustes de privacidad de tu navegador web. Al hacerlo, la sesión se cerrará de forma segura y podrás volver a iniciar sesión cuando gustes.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-900/60 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Rumbio • Última actualización: <span className="text-slate-200">Agosto 2026</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-xs transition cursor-pointer active:scale-95"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
