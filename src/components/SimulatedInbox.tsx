import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  X, 
  Check, 
  Copy, 
  Bell, 
  ArrowRight, 
  ShieldCheck, 
  Trash2, 
  Radio, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Key
} from 'lucide-react';
import { api } from '../utils/api';

interface SimulatedInboxProps {
  userEmail?: string;
  onApplyCode?: (code: string) => void;
}

interface EmailLogItem {
  id: string;
  to: string;
  subject: string;
  type: 'verification' | 'reset';
  code: string;
  status: 'sent_resend' | 'simulated_no_key' | 'failed';
  error?: string;
  timestamp: string;
}

export const SimulatedInbox: React.FC<SimulatedInboxProps> = ({ userEmail, onApplyCode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfigHelp, setShowConfigHelp] = useState(false);
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [isResendActive, setIsResendActive] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      const data = await api.getEmailLogs();
      setIsResendActive(data.realEmailConfigured);
      setLogs(data.logs || []);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [userEmail]);

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleQuickApply = (code: string) => {
    if (onApplyCode) {
      onApplyCode(code);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          id="inbox-toggle-btn"
          onClick={() => {
            setIsOpen(true);
            fetchLogs();
          }}
          className="group relative flex items-center space-x-2.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-2xl shadow-2xl shadow-blue-600/30 border border-white/10 transition-all transform hover:scale-105 active:scale-95"
        >
          <div className="relative">
            <Mail className="w-5 h-5" />
            {isResendActive ? (
              <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950" title="Resend Conectado (Envíos Reales)" />
            ) : (
              <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-400 rounded-full border-2 border-slate-950 animate-pulse" title="Modo Local" />
            )}
          </div>
          <div className="text-left">
            <span className="text-xs font-bold tracking-wide block leading-none">
              Monitor de Correos & OTP
            </span>
            <span className="text-[10px] text-cyan-200 font-medium">
              {isResendActive ? '🟢 Resend Real Activo' : '🟡 Modo Desarrollo'}
            </span>
          </div>
          {logs.length > 0 && (
            <span className="text-[10px] bg-slate-950/60 px-2 py-0.5 rounded-full border border-white/10 text-cyan-300 ml-1">
              {logs.length}
            </span>
          )}
        </button>
      )}

      {/* Expanded Monitor Panel */}
      {isOpen && (
        <div className="w-96 max-w-[calc(100vw-2rem)] bg-[#0b101e] rounded-[28px] shadow-2xl overflow-hidden border border-white/10 flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="p-4 bg-slate-900/90 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  Monitor de Correos & OTP
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                </h4>
                <p className="text-[10px] text-slate-400">
                  {isResendActive ? 'Servicio Resend Conectado (Envíos Reales)' : 'Modo desarrollo con auditoría de OTP'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setShowConfigHelp(!showConfigHelp)}
                className="text-slate-400 hover:text-cyan-400 p-1.5 rounded-lg hover:bg-white/5 transition"
                title="Ver configuración de Resend"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Resend Status Banner */}
          <div className={`px-4 py-2.5 text-xs flex items-center justify-between border-b border-white/5 ${
            isResendActive ? 'bg-emerald-950/40 text-emerald-300' : 'bg-amber-950/30 text-amber-300'
          }`}>
            <div className="flex items-center space-x-1.5">
              {isResendActive ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold text-[11px]">Envíos reales a bandeja externa activos</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold text-[11px]">RESEND_API_KEY no detectada aún</span>
                </>
              )}
            </div>
            <button
              onClick={() => setShowConfigHelp(!showConfigHelp)}
              className="text-[10px] underline font-bold hover:opacity-80"
            >
              {showConfigHelp ? 'Cerrar guía' : 'Configurar'}
            </button>
          </div>

          {/* Config Instructions Modal/Panel */}
          {showConfigHelp && (
            <div className="p-4 bg-slate-900/95 border-b border-white/10 text-xs text-slate-300 space-y-2.5">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs">
                <Key className="w-4 h-4" />
                <span>Cómo activar envíos reales con Resend:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300 pl-1 leading-relaxed">
                <li>Crea tu cuenta gratuita en <span className="text-cyan-400 font-mono">resend.com</span> (100 emails/día gratis).</li>
                <li>Ve a <b>API Keys</b> &gt; <b>Create API Key</b> y copia la clave (<code className="text-cyan-300">re_...</code>).</li>
                <li>En el menú <b>Settings / Secrets</b> de AI Studio, añade la variable:
                  <div className="bg-slate-950 p-2 rounded-lg font-mono text-[10px] text-cyan-300 mt-1 border border-white/10">
                    RESEND_API_KEY=re_tu_clave_aqui
                  </div>
                </li>
                <li>¡Listo! El servidor enviará inmediatamente los correos reales a la bandeja del usuario.</li>
              </ol>
            </div>
          )}

          {/* Email/OTP Log List */}
          <div className="max-h-80 overflow-y-auto p-3.5 space-y-3 divide-y divide-white/5">
            {logs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Bell className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p className="font-medium text-slate-300">Sin envíos registrados</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Al registrar una cuenta o solicitar recuperar contraseña, verás la trazabilidad en tiempo real aquí.
                </p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="pt-3 first:pt-0 rounded-2xl p-3.5 transition bg-white/[0.02] border border-white/5"
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-[10px] font-mono text-cyan-400 bg-slate-900 px-2 py-0.5 rounded-md border border-white/5">
                      Para: {log.to}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mb-2">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      log.status === 'sent_resend'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                        : log.status === 'failed'
                        ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                    }`}>
                      {log.status === 'sent_resend' ? '✉️ Enviado Real' : log.status === 'failed' ? '❌ Error Resend' : '⚡ Código Generado'}
                    </span>
                    <span className="text-[11px] text-slate-300 font-medium truncate">
                      {log.subject}
                    </span>
                  </div>

                  {log.error && (
                    <div className="p-2 bg-rose-950/40 border border-rose-500/30 rounded-lg text-[10px] text-rose-300 mb-2">
                      {log.error}
                    </div>
                  )}

                  {/* Highlighted OTP Code Badge */}
                  {log.code && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between mt-1">
                      <div>
                        <span className="text-[9px] uppercase tracking-widest text-slate-400 block font-semibold">
                          Código OTP Generado
                        </span>
                        <span className="text-lg font-mono font-black text-cyan-300 tracking-widest">
                          {log.code}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleCopyCode(log.code, log.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium border border-white/10 flex items-center space-x-1 transition"
                          title="Copiar código"
                        >
                          {copiedId === log.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="text-cyan-400 text-[11px]">¡Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Copiar</span>
                            </>
                          )}
                        </button>
                        {onApplyCode && (
                          <button
                            onClick={() => handleQuickApply(log.code)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center space-x-1 shadow-sm transition"
                            title="Autocompletar en el formulario"
                          >
                            <span className="text-[11px]">Pegar</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
