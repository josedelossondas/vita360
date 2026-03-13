/**
 * VITChat — Asistente virtual VIT
 * Modes: 'ciudadano' | 'admin' | 'patrol' | 'squad'
 */

import { useState, useRef, useEffect } from 'react';
import { X, Send, ChevronDown, Bot, Zap, Shield, Wrench } from 'lucide-react';
import vitAvatar from '../../assets/vit-avatar.png';
import { useAuth, API_URL } from '../../context/AuthContext';

interface Message {
  role: 'bot' | 'user';
  text: string;
  action?: 'creating_ticket' | 'ticket_created' | 'ticket_error' | 'loading';
  ticketId?: number;
}

type ConvState = 'idle' | 'awaiting_ticket_desc' | 'confirming_ticket';
type ChatMode = 'ciudadano' | 'admin' | 'patrol' | 'squad';

interface VITChatProps {
  mode?: ChatMode;
  squadName?: string;
  tickets?: any[];
}

const CONTACT = {
  phone: '2 2240 22 00',
  email: 'atencionalvecino@vitacura.cl',
  schedule: 'Lunes a viernes, 8:30 a 14:00 hrs',
};

// ── Welcome messages per mode ─────────────────────────────────────────────────
const WELCOME: Record<ChatMode, string> = {
  ciudadano: 'Hola, soy **VIT**, el asistente virtual de la Municipalidad de Vitacura. ¿En qué te puedo ayudar? 😊',
  admin: '¡Hola! Soy **VIT**, tu asistente de gestión operativa. Tengo acceso a los tickets activos, puedo ayudarte a priorizar incidentes, revisar el estado de cuadrillas y más. ¿Qué necesitas?',
  patrol: '🚔 ¡Hola! Soy **VIT**, tu asistente de patrulla. Puedo ayudarte con información de incidentes en tu cuadrante, protocolos de respuesta y coordinación. ¿Qué necesitas?',
  squad: '🔧 ¡Hola! Soy **VIT**, tu asistente operativo. Puedo darte información sobre tus tickets asignados, procedimientos y apoyo logístico. ¿En qué te ayudo?',
};

const MODE_CONFIG: Record<ChatMode, { label: string; color: string; icon: any; quickReplies: string[] }> = {
  ciudadano: {
    label: 'Asistente virtual · Muni Vitacura',
    color: '#2596be',
    icon: Bot,
    quickReplies: ['📞 Contacto', '🕐 Horarios', '📝 Crear solicitud'],
  },
  admin: {
    label: 'Asistente Administrador · VIT',
    color: '#1e293b',
    icon: Shield,
    quickReplies: ['📊 Resumen de tickets', '⚠️ Tickets de alta urgencia', '📍 Tickets sin asignar'],
  },
  patrol: {
    label: 'Asistente Patrulla · VIT',
    color: '#b82c87',
    icon: Zap,
    quickReplies: ['🗺️ Mi cuadrante', '🚨 Protocolo de incidente', '📋 Mis tickets asignados'],
  },
  squad: {
    label: 'Asistente Cuadrilla · VIT',
    color: '#2596be',
    icon: Wrench,
    quickReplies: ['📋 Mis tickets pendientes', '⏱️ Estimaciones de tiempo', '🔧 Siguiente tarea'],
  },
};

function detectCiudadanoIntent(msg: string): 'contact' | 'ticket' | 'hours' | 'greeting' | 'unknown' {
  const t = msg.toLowerCase();
  if (/hola|buenos|buenas|saludos/.test(t)) return 'greeting';
  if (/hora|horario|atienden|atención|turno/.test(t)) return 'hours';
  if (/teléfono|fono|llamar|email|correo|mail|dirección|ubicación|contacto|web|página|redes|facebook|instagram/.test(t)) return 'contact';
  if (/solicitud|requerimiento|reclamo|ticket|problema|falla|basura|árbol|vereda|hoyo|bache|luz|agua|rota|dañado|reportar|denunciar|crear/.test(t)) return 'ticket';
  return 'unknown';
}

export function VITChat({ mode = 'ciudadano', squadName, tickets }: VITChatProps) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: WELCOME[mode] },
  ]);
  const [input, setInput] = useState('');
  const [convState, setConvState] = useState<ConvState>('idle');
  const [pendingDesc, setPendingDesc] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const cfg = MODE_CONFIG[mode];
  const accentColor = cfg.color;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (open && !minimized) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open, minimized]);

  const addUser = (text: string) => setMessages(prev => [...prev, { role: 'user', text }]);
  const addBot = (text: string, action?: Message['action']) =>
    setMessages(prev => [...prev, { role: 'bot', text, action }]);

  // ── Contextualised API chat (admin/patrol/squad) ──────────────────────────
  const callVITApi = async (msg: string) => {
    if (!token) { addBot('Necesitas estar logueado para usar esta función.'); return; }
    setSending(true);
    const loadingIdx = messages.length + 1;
    setMessages(prev => [...prev, { role: 'bot', text: '', action: 'loading' }]);

    try {
      const res = await fetch(`${API_URL}/vit/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: msg,
          history,
          squad_name: squadName || '',
        }),
      });
      const data = await res.json();
      const reply = data.reply || 'Lo siento, no pude obtener respuesta.';

      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1 && m.action === 'loading'
          ? { role: 'bot', text: reply }
          : m
      ));
      setHistory(prev => [
        ...prev,
        { role: 'user', content: msg },
        { role: 'assistant', content: reply },
      ]);
    } catch {
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1 && m.action === 'loading'
          ? { role: 'bot', text: 'Error de conexión. Intenta de nuevo.' }
          : m
      ));
    } finally {
      setSending(false);
    }
  };

  // ── Create ticket (ciudadano) ─────────────────────────────────────────────
  const createTicket = async (description: string) => {
    if (!token) { addBot('Necesitas estar logueado para crear una solicitud.'); return; }
    setSending(true);
    addBot('⏳ Enviando tu solicitud…', 'creating_ticket');
    try {
      const title = description.length > 80 ? `${description.slice(0, 77)}...` : description;
      const res = await fetch(`${API_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, description }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => prev.map((m, i) =>
          i === prev.length - 1 && m.action === 'creating_ticket'
            ? { role: 'bot', text: `✅ ¡Solicitud **#${data.ticket_id || data.id}** creada con éxito!\n\n¿Hay algo más en lo que pueda ayudarte?`, action: 'ticket_created', ticketId: data.ticket_id || data.id }
            : m
        ));
      } else {
        setMessages(prev => prev.map((m, i) =>
          i === prev.length - 1 && m.action === 'creating_ticket'
            ? { role: 'bot', text: `❌ Error al crear la solicitud. Llama al ${CONTACT.phone}.`, action: 'ticket_error' }
            : m
        ));
      }
    } catch {
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1 && m.action === 'creating_ticket'
          ? { role: 'bot', text: `❌ Error de conexión. Llama al **${CONTACT.phone}**.`, action: 'ticket_error' }
          : m
      ));
    } finally {
      setSending(false);
      setConvState('idle');
      setPendingDesc('');
    }
  };

  // ── Handle send ───────────────────────────────────────────────────────────
  const handleSend = (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    setInput('');
    addUser(msg);

    // Ciudadano: state machine
    if (mode === 'ciudadano') {
      if (convState === 'awaiting_ticket_desc') {
        setPendingDesc(msg);
        setConvState('confirming_ticket');
        setTimeout(() => addBot(`Voy a crear la siguiente solicitud:\n\n"${msg.slice(0, 120)}${msg.length > 120 ? '…' : ''}"\n\n¿Confirmas? Responde **sí** para enviar o **no** para cancelar.`), 400);
        return;
      }
      if (convState === 'confirming_ticket') {
        if (/sí|si|yes|ok|confirmar|confirmo|dale|claro|adelante|enviar/.test(msg.toLowerCase())) {
          createTicket(pendingDesc);
        } else {
          setConvState('idle');
          setPendingDesc('');
          setTimeout(() => addBot('Solicitud cancelada. ¿En qué más te puedo ayudar? 😊'), 400);
        }
        return;
      }
      const intent = detectCiudadanoIntent(msg);
      setTimeout(() => {
        switch (intent) {
          case 'greeting': addBot(`¡Hola! 👋 Puedo ayudarte con:\n\n• 📞 **Datos de contacto**\n• 🕐 **Horarios** de atención\n• 📝 **Crear una solicitud** ciudadana\n\n¿Qué necesitas?`); break;
          case 'contact': addBot(`📋 **Datos de contacto:**\n\n📞 ${CONTACT.phone}\n📧 ${CONTACT.email}\n📍 Av. Bicentenario 3800, Vitacura\n🕐 ${CONTACT.schedule}`); break;
          case 'hours': addBot(`🕐 **Horario de atención:**\n\nLunes a viernes: **8:30 a 14:00 hrs**\n\nUrgencias: **${CONTACT.phone}**`); break;
          case 'ticket': setConvState('awaiting_ticket_desc'); addBot(`📝 Con gusto te ayudo a crear una solicitud.\n\n¿Qué problema y dónde? (dirección, tipo de problema, etc.)`); break;
          default: addBot(`Hmm, no estoy seguro de entenderte 😅\n\nPuedo ayudarte con:\n• **Contacto** de la Muni\n• **Horarios** de atención\n• **Crear una solicitud**`);
        }
      }, 350);
      return;
    }

    // Admin/patrol/squad: use API
    callVITApi(msg);
  };

  const quickReplies = mode === 'ciudadano'
    ? (convState === 'idle' ? cfg.quickReplies : convState === 'confirming_ticket' ? ['✅ Sí, enviar', '❌ No, cancelar'] : [])
    : cfg.quickReplies;

  const handleQuick = (q: string) => {
    const clean = q.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}🚔🔧📞🕐📝📊⚠️📍🗺️🚨📋⏱️✅❌ ]+/u, '').trim();
    if (mode === 'ciudadano') {
      if (q.includes('Contacto')) { addUser('Contacto'); setTimeout(() => addBot(`📋 **Datos de contacto:**\n\n📞 ${CONTACT.phone}\n📧 ${CONTACT.email}\n📍 Av. Bicentenario 3800\n🕐 ${CONTACT.schedule}`), 350); }
      else if (q.includes('Horario')) { addUser('Horarios'); setTimeout(() => addBot(`🕐 Lunes a viernes: **8:30 a 14:00 hrs**`), 350); }
      else if (q.includes('solicitud')) { addUser('Crear solicitud'); setConvState('awaiting_ticket_desc'); setTimeout(() => addBot('📝 ¿Qué problema y dónde?'), 350); }
      else if (q.includes('Sí')) { addUser('Sí, enviar'); createTicket(pendingDesc); }
      else if (q.includes('No')) { addUser('No, cancelar'); setConvState('idle'); setPendingDesc(''); setTimeout(() => addBot('Solicitud cancelada. ¿En qué más te puedo ayudar? 😊'), 400); }
      return;
    }
    handleSend(clean);
  };

  const renderText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      /^\*\*[^*]+\*\*$/.test(part)
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>
    );
  };

  const gradientStyle = mode === 'patrol'
    ? 'linear-gradient(135deg, #b82c87 0%, #8b1a6b 100%)'
    : mode === 'admin'
      ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
      : `linear-gradient(135deg, ${accentColor} 0%, #1a7fa0 100%)`;

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
          style={{ background: gradientStyle, boxShadow: `0 8px 32px ${accentColor}55` }}
          aria-label="Abrir asistente VIT"
        >
          <img src={vitAvatar} alt="VIT" className="w-9 h-9 rounded-full object-cover bg-white p-0.5" />
          <span className="text-white text-[13px] font-semibold">VIT</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl overflow-hidden"
          style={{
            width: 350,
            maxHeight: minimized ? 62 : 540,
            boxShadow: `0 24px 80px ${accentColor}33, 0 4px 24px rgba(0,0,0,0.12)`,
            border: `1px solid ${accentColor}33`,
            transition: 'max-height 0.3s cubic-bezier(.4,0,.2,1)',
            background: '#ffffff',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 flex-shrink-0" style={{ background: gradientStyle }}>
            <img src={vitAvatar} alt="VIT" className="w-9 h-9 rounded-full bg-white object-cover p-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-white text-[13.5px] font-semibold leading-tight">VIT</div>
              <div className="text-[10.5px] leading-none" style={{ color: 'rgba(255,255,255,0.75)' }}>{cfg.label}</div>
            </div>
            <button onClick={() => setMinimized(v => !v)} className="p-1.5 rounded-lg" style={{ color: 'rgba(255,255,255,0.8)' }}>
              <ChevronDown size={16} className={`transition-transform ${minimized ? 'rotate-180' : ''}`} />
            </button>
            <button onClick={() => { setOpen(false); setMinimized(false); }} className="p-1.5 rounded-lg" style={{ color: 'rgba(255,255,255,0.8)' }}>
              <X size={16} />
            </button>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5" style={{ background: 'rgba(248,250,252,1)' }}>
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {m.role === 'bot' && (
                      <img src={vitAvatar} alt="VIT" className="w-7 h-7 rounded-full flex-shrink-0 object-cover bg-white border" style={{ borderColor: `${accentColor}33`, marginTop: 2 }} />
                    )}
                    <div
                      className="px-3 py-2 rounded-2xl text-[13px] leading-relaxed max-w-[240px] whitespace-pre-line"
                      style={m.role === 'bot' ? {
                        background: m.action === 'ticket_created' ? 'rgba(192,207,5,0.1)' : m.action === 'ticket_error' ? 'rgba(239,68,68,0.08)' : '#ffffff',
                        color: '#1e293b',
                        border: `1px solid ${m.action === 'ticket_created' ? 'rgba(192,207,5,0.3)' : m.action === 'ticket_error' ? 'rgba(239,68,68,0.2)' : `${accentColor}1a`}`,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                      } : {
                        background: gradientStyle,
                        color: '#ffffff',
                        borderRadius: '18px 18px 4px 18px',
                      }}
                    >
                      {m.action === 'creating_ticket' || m.action === 'loading' ? (
                        <span className="flex items-center gap-2">
                          <span className="inline-flex gap-1">
                            {[0, 1, 2].map(j => <span key={j} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: accentColor, animationDelay: `${j * 150}ms` }} />)}
                          </span>
                          {m.action === 'creating_ticket' ? 'Enviando…' : 'Pensando…'}
                        </span>
                      ) : renderText(m.text)}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick replies */}
              {quickReplies.length > 0 && convState !== 'awaiting_ticket_desc' && (
                <div className="px-3 py-2 flex gap-1.5 flex-wrap" style={{ background: 'rgba(248,250,252,1)', borderTop: `1px solid ${accentColor}12` }}>
                  {quickReplies.map(q => (
                    <button key={q} onClick={() => handleQuick(q)} disabled={sending}
                      className="px-2.5 py-1 rounded-full text-[11.5px] font-medium border transition-all"
                      style={{ background: `${accentColor}0f`, borderColor: `${accentColor}33`, color: accentColor }}>
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0" style={{ borderTop: `1px solid ${accentColor}15`, background: '#ffffff' }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={convState === 'awaiting_ticket_desc' ? 'Describe el problema…' : convState === 'confirming_ticket' ? 'Escribe "sí" o "no"…' : 'Escribe un mensaje…'}
                  disabled={sending}
                  className="flex-1 text-[13px] outline-none bg-transparent"
                  style={{ color: '#1e293b' }}
                />
                <button onClick={() => handleSend()} disabled={!input.trim() || sending}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                  style={{ background: input.trim() && !sending ? gradientStyle : 'rgba(0,0,0,0.08)', color: input.trim() && !sending ? '#ffffff' : '#94a3b8' }}>
                  <Send size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
