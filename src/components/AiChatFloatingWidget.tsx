import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User as UserIcon, 
  X, 
  Maximize2, 
  Lock, 
  AlertCircle, 
  RefreshCw,
  Compass,
  ArrowRight,
  Minus
} from 'lucide-react';
import Markdown from 'react-markdown';
import { User, Trip, Expense, UserSubscription, ChatMessage, PlanTier } from '../types';
import { api } from '../utils/api';
import { formatMoney } from '../utils/finance';

interface AiChatFloatingWidgetProps {
  currentUser: User | null;
  subscription: UserSubscription | null;
  trips: Trip[];
  activeTrip: Trip | null;
  expenses: Expense[];
  onOpenFullChat: () => void;
  onOpenUpgradeGate: (title: string, description: string, requiredPlan?: PlanTier) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AiChatFloatingWidget: React.FC<AiChatFloatingWidgetProps> = ({
  currentUser,
  subscription,
  trips,
  activeTrip,
  onOpenFullChat,
  onOpenUpgradeGate,
  onShowToast,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isDailyLimitReached, setIsDailyLimitReached] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<{ limit: number; remaining: number } | null>(null);

  const isProOrPremium = subscription?.plan === 'pro' || subscription?.plan === 'premium';
  const defaultLimit = subscription?.plan === 'premium' ? 50 : 20;

  const initialGreeting: ChatMessage = {
    id: 'floating-welcome',
    role: 'assistant',
    content: activeTrip
      ? `¡Hola **${currentUser?.name || 'Viajero'}**! ✈️ Estoy sincronizado con tu viaje **"${activeTrip.name}"**. Pregúntame sobre tus gastos, presupuesto restante o consejos de ahorro.`
      : `¡Hola **${currentUser?.name || 'Viajero'}**! 👋 Soy tu copiloto financiero **Rumbio AI**. ¿En qué puedo ayudarte con tus finanzas de viaje hoy?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  if (!currentUser) return null;

  const handleSendMessage = async (text?: string) => {
    const textToSend = (text || inputMessage).trim();
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
      const apiPayload = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.sendChatMessage(apiPayload, activeTrip?.id);

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
      console.error('Error in floating chat:', err);
      const errMsg = err.message || 'Error al comunicarse con el asistente de IA.';
      setErrorBanner(errMsg);
      if (err.data?.code === 'DAILY_AI_LIMIT_REACHED' || err.status === 429) {
        setIsDailyLimitReached(true);
        setQuotaInfo({
          limit: err.data?.limit || defaultLimit,
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

  const quickChips = [
    { label: '💰 Gastos actuales', text: '¿Cuánto llevo gastado y cuánto presupuesto me queda disponible?' },
    { label: '👥 División deudas', text: '¿Cuál es el resumen de cuentas y deudas entre los integrantes?' },
    { label: '💡 Tips de ahorro', text: 'Dame 2 recomendaciones clave de ahorro para mi viaje actual.' },
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          id="floating-ai-assistant-btn"
          onClick={() => {
            if (!isProOrPremium) {
              onOpenUpgradeGate(
                'Asistente Financiero con IA',
                'El Chatbot de IA está disponible exclusivamente para planes Pro y Premium. Actualiza tu plan para recibir análisis en vivo y recomendaciones de tus gastos.',
                'pro'
              );
            } else {
              setIsOpen(true);
            }
          }}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 via-cyan-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold px-4 py-3 rounded-full shadow-2xl shadow-cyan-500/30 border border-cyan-400/40 flex items-center space-x-2.5 transition transform hover:scale-105 active:scale-95 group"
          title="Abrir Asistente Financiero con IA"
        >
          <div className="w-7 h-7 rounded-full bg-slate-950/60 flex items-center justify-center border border-cyan-400/30">
            <Sparkles className="w-4 h-4 text-cyan-300 group-hover:rotate-12 transition-transform" />
          </div>
          <span className="text-xs tracking-wide">Asistente IA</span>
          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-400/30">
            {isProOrPremium ? 'PRO' : 'VIP'}
          </span>
        </button>
      )}

      {/* Floating Chat Modal / Drawer */}
      {isOpen && (
        <div
          id="floating-ai-chat-window"
          className="fixed bottom-6 right-6 z-50 w-full max-w-[380px] sm:max-w-[420px] h-[560px] bg-[#070b16] border border-cyan-500/30 rounded-3xl shadow-2xl shadow-cyan-500/15 flex flex-col overflow-hidden animate-fadeIn"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0b1329] to-[#071324] border-b border-white/10 p-3.5 px-4 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 flex items-center justify-center shadow-md">
                <div className="w-full h-full bg-[#070b16] rounded-[10px] flex items-center justify-center">
                  <Bot className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h4 className="text-xs font-bold text-white">Rumbio AI Copilot</h4>
                  <span className="text-[9px] font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-1.5 py-0.2 rounded-full">
                    {subscription?.plan?.toUpperCase() || 'PRO'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate max-w-[170px]">
                  {activeTrip ? `✈️ ${activeTrip.name}` : 'Finanzas de viaje en vivo'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenFullChat();
                }}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                title="Expandir a pantalla completa"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                title="Minimizar"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorBanner && (
            <div className="bg-rose-950/80 border-b border-rose-500/30 p-2.5 px-4 flex items-start gap-2 text-[11px] text-rose-200">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <p className="flex-1">{errorBanner}</p>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#070b16]/95">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-none shadow-md'
                        : 'bg-[#0e1628] border border-white/10 text-slate-200 rounded-tl-none shadow-sm'
                    }`}
                  >
                    {!isUser ? (
                      <div className="prose prose-invert prose-xs max-w-none space-y-1.5">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                    <span className="block text-[9px] text-slate-400 mt-1 text-right">{msg.timestamp}</span>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-2 justify-start">
                <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                </div>
                <div className="bg-[#0e1628] border border-cyan-500/20 rounded-2xl rounded-tl-none p-3 text-xs text-slate-400 flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
                  </div>
                  <span className="text-[11px]">Analizando datos...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions */}
          <div className="p-2 bg-[#050811] border-t border-white/5 overflow-x-auto flex gap-1.5">
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip.text)}
                disabled={isLoading}
                className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap border border-white/5 transition"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Form */}
          {isDailyLimitReached ? (
            <div className="p-3 bg-gradient-to-r from-rose-950/70 to-[#070b16] border-t border-rose-500/30 text-[11px] text-rose-200 flex items-center justify-between gap-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Llegaste al límite diario ({quotaInfo?.limit || defaultLimit} msgs/día). Vuelve mañana.</span>
              </div>
              {subscription?.plan === 'pro' && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenUpgradeGate('Límite de mensajes alcanzado', 'Actualiza a Premium para disfrutar de 50 mensajes diarios con Rumbio AI Copilot.', 'premium');
                  }}
                  className="bg-amber-500 text-slate-950 font-bold px-2 py-1 rounded text-[10px] shrink-0"
                >
                  Subir a Premium
                </button>
              )}
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-[#070b16] border-t border-white/10 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Pregunta a Rumbio AI..."
                disabled={isLoading || isDailyLimitReached}
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading || isDailyLimitReached}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-bold p-2.5 rounded-xl transition shrink-0"
                aria-label="Enviar mensaje"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
};
