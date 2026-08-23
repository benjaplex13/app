import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User as UserIcon, 
  Trash2, 
  AlertCircle, 
  Lock, 
  ArrowRight, 
  Crown, 
  Zap, 
  RefreshCw, 
  Copy, 
  Check, 
  Compass,
  DollarSign,
  TrendingDown,
  Users
} from 'lucide-react';
import Markdown from 'react-markdown';
import { User, Trip, Expense, UserSubscription, ChatMessage, PlanTier } from '../types';
import { api } from '../utils/api';
import { formatMoney } from '../utils/finance';

interface ChatViewProps {
  currentUser: User;
  subscription: UserSubscription | null;
  trips: Trip[];
  activeTrip: Trip | null;
  expenses: Expense[];
  onOpenPlans: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onOpenUpgradeGate: (title: string, description: string, requiredPlan?: PlanTier) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  currentUser,
  subscription,
  trips,
  activeTrip,
  expenses,
  onOpenPlans,
  onShowToast,
  onOpenUpgradeGate,
}) => {
  const isProOrPremium = subscription?.plan === 'pro' || subscription?.plan === 'premium';
  const defaultLimit = subscription?.plan === 'premium' ? 50 : 20;

  const [selectedTripId, setSelectedTripId] = useState<string | null>(activeTrip?.id || (trips.length > 0 ? trips[0].id : null));
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<{ limit: number; remaining: number; used: number } | null>(null);
  const [isDailyLimitReached, setIsDailyLimitReached] = useState(false);

  const initialGreeting: ChatMessage = {
    id: 'welcome-msg',
    role: 'assistant',
    content: activeTrip 
      ? `¡Hola **${currentUser.name}**! 👋 Soy tu copiloto financiero **Rumbio AI**.\n\nTengo cargados los datos en tiempo real de tu viaje **"${activeTrip.name}"** a **${activeTrip.destination}** (Presupuesto: ${formatMoney(activeTrip.budget, currentUser.homeCurrency)}).\n\n¿En qué puedo ayudarte hoy? Puedes preguntarme sobre tus gastos, categorías, presupuesto restante, saldar cuentas grupales o pedirme consejos de ahorro.`
      : `¡Hola **${currentUser.name}**! 👋 Soy **Rumbio AI**, tu asistente financiero de viajes.\n\nPuedo analizar tus gastos, ayudarte a calcular presupuestos, optimizar tus finanzas multidivisa y darte recomendaciones para tus próximas aventuras.\n\n¿Qué te gustaría consultar hoy?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(`rumbio_chat_history_${currentUser.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Ignore fallback
      }
    }
    return [initialGreeting];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync selectedTripId with activeTrip if changed from outside
  useEffect(() => {
    if (activeTrip?.id) {
      setSelectedTripId(activeTrip.id);
    }
  }, [activeTrip?.id]);

  // Persist chat history per user
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`rumbio_chat_history_${currentUser.id}`, JSON.stringify(messages));
    }
  }, [messages, currentUser.id]);

  // Auto scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || isLoading) return;

    if (!isProOrPremium) {
      onOpenUpgradeGate(
        'Asistente Financiero con IA',
        'El Chatbot de IA está disponible exclusivamente para planes Pro y Premium. Actualiza tu plan para recibir análisis en vivo y recomendaciones de tus gastos.',
        'pro'
      );
      return;
    }

    setErrorBanner(null);
    const userMsg: ChatMessage = {
      id: 'user_' + Date.now(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Send message history to server API
      const apiPayload = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.sendChatMessage(apiPayload, selectedTripId);

      if (res.quota) {
        setQuotaInfo(res.quota);
        if (res.quota.remaining <= 0) {
          setIsDailyLimitReached(true);
        }
      }

      const aiReply: ChatMessage = {
        id: 'ai_' + Date.now(),
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiReply]);
    } catch (err: any) {
      console.error('Error in chat:', err);
      const errMsg = err.message || 'Error al comunicarse con el asistente de IA.';
      setErrorBanner(errMsg);
      
      if (err.data?.code === 'DAILY_AI_LIMIT_REACHED' || err.status === 429) {
        setIsDailyLimitReached(true);
        setQuotaInfo({
          limit: err.data?.limit || defaultLimit,
          used: err.data?.used || defaultLimit,
          remaining: 0,
        });
        onShowToast('Llegaste al límite diario de mensajes del Asistente de IA. Vuelve mañana.', 'warning');
      } else if (err.data?.missingApiKey) {
        onShowToast('GEMINI_API_KEY no está configurada en las variables de entorno del servidor.', 'warning');
      } else {
        onShowToast(errMsg, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([initialGreeting]);
    localStorage.removeItem(`rumbio_chat_history_${currentUser.id}`);
    setErrorBanner(null);
    onShowToast('Historial de conversación reiniciado.', 'info');
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onShowToast('Respuesta copiada al portapapeles.', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    { label: '📊 ¿Cuánto llevo gastado en total?', prompt: '¿Cuál es el resumen de mis gastos totales y cuánto presupuesto me queda disponible?' },
    { label: '🍕 ¿En qué categoría gasto más?', prompt: '¿Cuáles son las categorías donde más he gastado y qué porcentaje representan?' },
    { label: '🤝 ¿Quién le debe a quién?', prompt: '¿Cuál es el balance de deudas entre los integrantes de mi viaje? ¿Quién debe pagar a quién?' },
    { label: '💡 Consejos de ahorro para mi viaje', prompt: 'Recomiéndame 3 consejos financieros prácticos y formas de optimizar mis gastos para mi viaje actual.' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0b1329] via-[#071324] to-[#0b101e] border border-cyan-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#070b16] rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold font-display text-white">Rumbio AI Copilot</h2>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                  subscription?.plan === 'premium'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : subscription?.plan === 'pro'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {subscription?.plan ? `PLAN ${subscription.plan.toUpperCase()}` : 'PLAN PRO / PREMIUM'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Asistente inteligente con análisis en tiempo real de tus viajes, gastos y presupuestos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Daily Message Quota Badge */}
            {isProOrPremium && (
              <div 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-medium transition ${
                  isDailyLimitReached
                    ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                    : (quotaInfo && quotaInfo.remaining <= 5)
                    ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                    : 'bg-cyan-950/60 border-cyan-500/30 text-cyan-300'
                }`}
                title={`Límite diario: ${defaultLimit} mensajes por día para tu plan.`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {quotaInfo 
                    ? `${quotaInfo.remaining} / ${quotaInfo.limit} msgs hoy`
                    : `${defaultLimit} msgs/día`}
                </span>
              </div>
            )}

            {/* Trip selector for context */}
            {trips.length > 0 && (
              <div className="flex items-center bg-slate-900/80 border border-white/10 rounded-2xl px-3 py-1.5 text-xs text-slate-300">
                <Compass className="w-4 h-4 text-cyan-400 mr-2 shrink-0" />
                <select
                  value={selectedTripId || ''}
                  onChange={(e) => setSelectedTripId(e.target.value || null)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-2"
                >
                  <option value="" className="bg-[#0b101e] text-slate-200">Todos los viajes</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#0b101e] text-slate-200">
                      ✈️ {t.name} ({t.destination})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isProOrPremium && (
              <button
                onClick={handleClearHistory}
                className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-rose-300 border border-white/5 transition flex items-center gap-1.5 text-xs"
                title="Reiniciar conversación"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpiar chat</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Container */}
      {!isProOrPremium ? (
        /* LOCKED STATE FOR FREE USERS */
        <div className="glass-panel p-8 sm:p-12 text-center rounded-3xl border border-cyan-500/20 max-w-2xl mx-auto shadow-2xl space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/10">
            <Lock className="w-10 h-10" />
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 rounded-full">
              Función Exclusiva Pro & Premium
            </span>
            <h3 className="text-2xl font-bold text-white mt-3 font-display">
              Desbloquea tu Asistente Financiero de IA
            </h3>
            <p className="text-sm text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
              Obtén respuestas instantáneas sobre tus gastos reales, análisis inteligente de presupuestos y recomendaciones personalizadas de ahorro para cada viaje.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-1">
              <DollarSign className="w-5 h-5 text-cyan-400" />
              <p className="text-xs font-bold text-white">Análisis de Gastos</p>
              <p className="text-[11px] text-slate-400">Desglose exacto por categoría y conversiones en vivo.</p>
            </div>
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-1">
              <TrendingDown className="w-5 h-5 text-emerald-400" />
              <p className="text-xs font-bold text-white">Control de Presupuesto</p>
              <p className="text-[11px] text-slate-400">Alertas tempranas y recomendaciones de ahorro.</p>
            </div>
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-1">
              <Users className="w-5 h-5 text-purple-400" />
              <p className="text-xs font-bold text-white">Cuentas Claras</p>
              <p className="text-[11px] text-slate-400">Cálculo de balances y liquidación equitativa.</p>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onOpenUpgradeGate('Asistente Financiero de IA', 'Actualiza a Pro o Premium para chatear con tu copiloto de finanzas de viaje.', 'pro')}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm px-8 py-3.5 rounded-2xl shadow-xl shadow-cyan-500/25 transition active:scale-95 flex items-center justify-center space-x-2 mx-auto"
            >
              <span>Ver Planes & Actualizar Cuenta</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* ACTIVE CHAT INTERFACE FOR PRO/PREMIUM */
        <div className="glass-panel rounded-3xl border border-slate-800 shadow-2xl flex flex-col h-[650px] overflow-hidden bg-[#070b16]/95">
          {/* Error Banner if missing API key or server error */}
          {errorBanner && (
            <div className="bg-rose-950/80 border-b border-rose-500/30 p-3.5 px-6 flex items-start gap-3 text-xs text-rose-200 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{errorBanner}</p>
                {errorBanner.includes('GEMINI_API_KEY') && (
                  <p className="text-[11px] text-rose-300/80 mt-1">
                    Nota técnica: Para habilitar el modelo de lenguaje, asegúrate de haber configurado la variable de entorno <code className="bg-black/40 px-1 py-0.5 rounded text-rose-200">GEMINI_API_KEY</code> en tu panel de configuración del servidor.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shrink-0 shadow-md shadow-cyan-500/20">
                      <div className="w-full h-full bg-[#070b16] rounded-[10px] flex items-center justify-center">
                        <Bot className="w-4 h-4 text-cyan-400" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`relative max-w-xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-600/10 rounded-tr-none'
                        : 'bg-[#0e1628] border border-white/10 text-slate-200 shadow-md rounded-tl-none'
                    }`}
                  >
                    {!isUser ? (
                      <div className="prose prose-invert prose-xs sm:prose-sm max-w-none space-y-2">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}

                    <div className="flex items-center justify-between gap-4 mt-2 pt-1 border-t border-white/5 text-[10px] text-slate-400">
                      <span>{msg.timestamp}</span>
                      {!isUser && (
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="hover:text-white transition flex items-center gap-1 text-[10px]"
                          title="Copiar respuesta"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 flex items-center justify-center shrink-0">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-3 justify-start animate-fadeIn">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shrink-0 shadow-md shadow-cyan-500/20">
                  <div className="w-full h-full bg-[#070b16] rounded-[10px] flex items-center justify-center">
                    <Bot className="w-4 h-4 text-cyan-400 animate-pulse" />
                  </div>
                </div>
                <div className="bg-[#0e1628] border border-cyan-500/20 rounded-2xl rounded-tl-none p-4 text-xs text-slate-300 flex items-center gap-2 shadow-md">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                  </div>
                  <span className="text-slate-400 text-xs ml-1">Rumbio AI analizando datos financieros...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Suggestions */}
          <div className="p-3 bg-[#050811] border-t border-white/5 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Sugerencias:</span>
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(qp.prompt)}
                  disabled={isLoading}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 text-slate-300 hover:text-white px-3 py-1.5 rounded-full text-xs transition active:scale-95 disabled:opacity-50"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input Bar */}
          {isDailyLimitReached ? (
            <div className="p-4 bg-gradient-to-r from-rose-950/70 via-[#070b16] to-[#070b16] border-t border-rose-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2.5 text-xs text-rose-200">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Llegaste al límite de mensajes de hoy ({quotaInfo?.limit || defaultLimit} mensajes/día)</p>
                  <p className="text-[11px] text-slate-400">Vuelve mañana para seguir consultando o actualiza a un plan superior si necesitas mayor cuota.</p>
                </div>
              </div>

              {subscription?.plan === 'pro' && (
                <button
                  onClick={() => onOpenUpgradeGate('Aumentar cuota a 50 msgs/día', 'El Plan Premium incluye 50 mensajes diarios con Rumbio AI Copilot y análisis avanzado multidivisa.', 'premium')}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition shadow-lg shadow-amber-500/20 shrink-0 flex items-center gap-1.5"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Subir a Premium (50 msgs/día)</span>
                </button>
              )}
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-4 bg-[#070b16] border-t border-white/10 flex items-center gap-3"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Haz una pregunta sobre tus viajes, presupuestos o gastos..."
                disabled={isLoading || isDailyLimitReached}
                className="flex-1 bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading || isDailyLimitReached}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-bold p-3 rounded-2xl shadow-lg shadow-cyan-500/20 transition active:scale-95 flex items-center justify-center shrink-0"
                aria-label="Enviar mensaje"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
