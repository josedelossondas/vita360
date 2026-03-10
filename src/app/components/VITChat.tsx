/**
 * VITChat — Asistente virtual VIT de la Municipalidad de Vitacura
 *
 * Capacidades:
 *  • Saluda con mensaje institucional de bienvenida
 *  • Responde datos de contacto de la Municipalidad
 *  • Permite crear tickets/requerimientos desde el chat
 */

import { useState, useRef, useEffect } from 'react';
import { X, Send, ChevronDown } from 'lucide-react';
import vitAvatar from '../../assets/vit-avatar.png';
import { useAuth, API_URL } from '../../context/AuthContext';

// ── Datos de contacto institucionales ─────────────────────────────────────────
const CONTACT = {
    phone: '2 2240 22 00',
    email: 'atencionalvecino@vitacura.cl',
    address: 'Av. Bicentenario 3800, Vitacura, Santiago',
    web: 'https://vitacura.cl',
    schedule: 'Lunes a viernes, 8:30 a 14:00 hrs',
    facebook: 'https://www.facebook.com/MuniVitacura',
    instagram: 'https://www.instagram.com/munivitacura',
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
    role: 'bot' | 'user';
    text: string;
    action?: 'creating_ticket' | 'ticket_created' | 'ticket_error';
    ticketId?: number;
}

type ConvState =
    | 'idle'
    | 'awaiting_ticket_desc'
    | 'confirming_ticket';

// ── Helpers: intent detection ─────────────────────────────────────────────────
function detectIntent(msg: string): 'contact' | 'ticket' | 'hours' | 'greeting' | 'unknown' {
    const t = msg.toLowerCase();
    if (/hola|buenos|buenas|saludos/.test(t)) return 'greeting';
    if (/hora|horario|atienden|atención|turno/.test(t)) return 'hours';
    if (/teléfono|fono|llamar|email|correo|mail|dirección|ubicación|contacto|web|página|redes|facebook|instagram/.test(t)) return 'contact';
    if (/solicitud|requerimiento|reclamo|ticket|problema|falla|basura|árbol|vereda|hoyo|bache|luz|agua|rota|dañado|reportar|denunciar|crear/.test(t)) return 'ticket';
    return 'unknown';
}

// ── Bot responses ─────────────────────────────────────────────────────────────
const GREETING_REPLY = `¡Hola! 👋 Puedo ayudarte con:

• 📞 **Datos de contacto** de la Muni
• 🕐 **Horarios** de atención
• 📝 **Crear una solicitud** ciudadana

¿Qué necesitas?`;

const CONTACT_REPLY = `📋 **Datos de contacto:**

📞 ${CONTACT.phone}
📧 ${CONTACT.email}
📍 ${CONTACT.address}
🌐 ${CONTACT.web}
🕐 ${CONTACT.schedule}

También puedes seguirnos en redes sociales. ¿Necesitas algo más?`;

const HOURS_REPLY = `🕐 **Horario de atención al vecino:**

Lunes a viernes: **8:30 a 14:00 hrs**

Para urgencias fuera de horario, puedes llamar al **${CONTACT.phone}**.

¿Te puedo ayudar en algo más?`;

const UNKNOWN_REPLY = `Hmm, no estoy seguro de entenderte bien 😅

Puedo ayudarte con:
• **Contacto** de la Municipalidad
• **Horarios** de atención
• **Crear una solicitud** por algún problema en la vía pública

¿Qué necesitas?`;

const TICKET_ASK = `📝 Con gusto te ayudo a crear una solicitud.

Cuéntame el problema con el mayor detalle posible: **¿Qué pasó y dónde?** (dirección, tipo de problema, etc.)`;

const TICKET_CONFIRM = (desc: string) =>
    `Voy a crear la siguiente solicitud:\n\n"${desc.slice(0, 120)}${desc.length > 120 ? '…' : ''}"\n\n¿Confirmas? Responde **sí** para enviar o **no** para cancelar.`;

// ── Main component ─────────────────────────────────────────────────────────────
export function VITChat() {
    const { token } = useAuth();
    const [open, setOpen] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'bot',
            text: 'Hola, soy **VIT**, el asistente virtual de la Municipalidad de Vitacura. ¿En qué te puedo ayudar? 😊',
        },
    ]);
    const [input, setInput] = useState('');
    const [convState, setConvState] = useState<ConvState>('idle');
    const [pendingDesc, setPendingDesc] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, open]);

    // Focus input on open
    useEffect(() => {
        if (open && !minimized) setTimeout(() => inputRef.current?.focus(), 200);
    }, [open, minimized]);

    // ── Create ticket via API ────────────────────────────────────────────────────
    const createTicket = async (description: string) => {
        if (!token) {
            addBot('Necesitas estar logueado para crear una solicitud. Por favor inicia sesión e intenta de nuevo.');
            return;
        }
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
                // Replace "sending" message
                setMessages(prev => prev.map((m, i) =>
                    i === prev.length - 1 && m.action === 'creating_ticket'
                        ? { role: 'bot', text: `✅ ¡Solicitud **#${data.ticket_id || data.id}** creada con éxito! El equipo municipal la revisará pronto.\n\n¿Hay algo más en lo que pueda ayudarte?`, action: 'ticket_created', ticketId: data.ticket_id || data.id }
                        : m
                ));
            } else {
                setMessages(prev => prev.map((m, i) =>
                    i === prev.length - 1 && m.action === 'creating_ticket'
                        ? { role: 'bot', text: `❌ Hubo un error al crear la solicitud: ${data.detail || 'Error desconocido'}. Intenta de nuevo o llama al ${CONTACT.phone}.`, action: 'ticket_error' }
                        : m
                ));
            }
        } catch {
            setMessages(prev => prev.map((m, i) =>
                i === prev.length - 1 && m.action === 'creating_ticket'
                    ? { role: 'bot', text: `❌ Error de conexión. Intenta de nuevo o llama al **${CONTACT.phone}**.`, action: 'ticket_error' }
                    : m
            ));
        } finally {
            setSending(false);
            setConvState('idle');
            setPendingDesc('');
        }
    };

    // ── Add messages ─────────────────────────────────────────────────────────────
    const addUser = (text: string) =>
        setMessages(prev => [...prev, { role: 'user', text }]);

    const addBot = (text: string, action?: Message['action']) =>
        setMessages(prev => [...prev, { role: 'bot', text, action }]);

    // ── Handle send ──────────────────────────────────────────────────────────────
    const handleSend = () => {
        const msg = input.trim();
        if (!msg || sending) return;
        setInput('');
        addUser(msg);

        // State machine
        if (convState === 'awaiting_ticket_desc') {
            setPendingDesc(msg);
            setConvState('confirming_ticket');
            setTimeout(() => addBot(TICKET_CONFIRM(msg)), 400);
            return;
        }

        if (convState === 'confirming_ticket') {
            const t = msg.toLowerCase();
            if (/sí|si|yes|ok|confirmar|confirmo|dale|claro|adelante|enviar/.test(t)) {
                createTicket(pendingDesc);
            } else {
                setConvState('idle');
                setPendingDesc('');
                setTimeout(() => addBot('Solicitud cancelada. ¿En qué más te puedo ayudar? 😊'), 400);
            }
            return;
        }

        // Intent detection
        const intent = detectIntent(msg);
        setTimeout(() => {
            switch (intent) {
                case 'greeting':
                    addBot(GREETING_REPLY);
                    break;
                case 'contact':
                    addBot(CONTACT_REPLY);
                    break;
                case 'hours':
                    addBot(HOURS_REPLY);
                    break;
                case 'ticket':
                    setConvState('awaiting_ticket_desc');
                    addBot(TICKET_ASK);
                    break;
                default:
                    addBot(UNKNOWN_REPLY);
            }
        }, 350);
    };

    // ── Quick reply chips ─────────────────────────────────────────────────────────
    const quickReplies =
        convState === 'idle'
            ? ['📞 Contacto', '🕐 Horarios', '📝 Crear solicitud']
            : convState === 'confirming_ticket'
                ? ['✅ Sí, enviar', '❌ No, cancelar']
                : [];

    const handleQuick = (q: string) => {
        setInput(q.replace(/^[^\s]+ /, ''));
        // Small delay to show text then send
        setTimeout(() => {
            const clean = q.replace(/^[^\s]+ /, '');
            setInput('');
            addUser(clean);
            if (q.includes('Contacto')) { setTimeout(() => addBot(CONTACT_REPLY), 350); }
            else if (q.includes('Horario')) { setTimeout(() => addBot(HOURS_REPLY), 350); }
            else if (q.includes('solicitud')) { setConvState('awaiting_ticket_desc'); setTimeout(() => addBot(TICKET_ASK), 350); }
            else if (q.includes('Sí')) {
                createTicket(pendingDesc);
            } else if (q.includes('No')) {
                setConvState('idle'); setPendingDesc('');
                setTimeout(() => addBot('Solicitud cancelada. ¿En qué más te puedo ayudar? 😊'), 400);
            }
        }, 50);
    };

    // ── Render markdown-ish (bold only) ──────────────────────────────────────────
    const renderText = (text: string) => {
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, i) =>
            /^\*\*[^*]+\*\*$/.test(part)
                ? <strong key={i}>{part.slice(2, -2)}</strong>
                : <span key={i}>{part}</span>
        );
    };

    // ── FAB button (always visible) ───────────────────────────────────────────────
    return (
        <>
            {/* FAB */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
                    style={{
                        background: 'linear-gradient(135deg, #2596be 0%, #1a7fa0 100%)',
                        boxShadow: '0 8px 32px rgba(37,150,190,0.45)',
                    }}
                    aria-label="Abrir asistente VIT"
                >
                    <img src={vitAvatar} alt="VIT" className="w-9 h-9 rounded-full object-cover bg-white p-0.5" />
                    <span className="text-white text-[13px] font-semibold">¿Necesitas ayuda?</span>
                </button>
            )}

            {/* Chat panel */}
            {open && (
                <div
                    className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl overflow-hidden"
                    style={{
                        width: 340,
                        maxHeight: minimized ? 60 : 520,
                        boxShadow: '0 24px 80px rgba(37,150,190,0.25), 0 4px 24px rgba(0,0,0,0.12)',
                        border: '1px solid rgba(37,150,190,0.2)',
                        transition: 'max-height 0.3s cubic-bezier(.4,0,.2,1)',
                        background: '#ffffff',
                    }}
                >
                    {/* Header */}
                    <div
                        className="flex items-center gap-2.5 px-4 py-3 flex-shrink-0"
                        style={{
                            background: 'linear-gradient(135deg, #2596be 0%, #1a7fa0 100%)',
                        }}
                    >
                        <img src={vitAvatar} alt="VIT" className="w-9 h-9 rounded-full bg-white object-cover p-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-white text-[13.5px] font-semibold leading-tight">VIT</div>
                            <div className="text-[10.5px] leading-none" style={{ color: 'rgba(255,255,255,0.75)' }}>
                                Asistente virtual · Muni Vitacura
                            </div>
                        </div>
                        <button
                            onClick={() => setMinimized(v => !v)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'rgba(255,255,255,0.8)' }}
                            aria-label={minimized ? 'Expandir' : 'Minimizar'}
                        >
                            <ChevronDown size={16} className={`transition-transform ${minimized ? 'rotate-180' : ''}`} />
                        </button>
                        <button
                            onClick={() => { setOpen(false); setMinimized(false); }}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'rgba(255,255,255,0.8)' }}
                            aria-label="Cerrar chat"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Messages */}
                    {!minimized && (
                        <>
                            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5" style={{ background: 'rgba(248,250,252,1)' }}>
                                {messages.map((m, i) => (
                                    <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        {m.role === 'bot' && (
                                            <img src={vitAvatar} alt="VIT" className="w-7 h-7 rounded-full flex-shrink-0 object-cover bg-white border" style={{ borderColor: 'rgba(37,150,190,0.2)', marginTop: 2 }} />
                                        )}
                                        <div
                                            className="px-3 py-2 rounded-2xl text-[13px] leading-relaxed max-w-[230px] whitespace-pre-line"
                                            style={
                                                m.role === 'bot'
                                                    ? {
                                                        background: m.action === 'ticket_created' ? 'rgba(192,207,5,0.1)' : m.action === 'ticket_error' ? 'rgba(239,68,68,0.08)' : '#ffffff',
                                                        color: '#1e293b',
                                                        border: `1px solid ${m.action === 'ticket_created' ? 'rgba(192,207,5,0.3)' : m.action === 'ticket_error' ? 'rgba(239,68,68,0.2)' : 'rgba(37,150,190,0.1)'}`,
                                                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                                                    }
                                                    : {
                                                        background: 'linear-gradient(135deg, #2596be 0%, #1a7fa0 100%)',
                                                        color: '#ffffff',
                                                        borderRadius: '18px 18px 4px 18px',
                                                    }
                                            }
                                        >
                                            {m.action === 'creating_ticket' ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="inline-flex gap-1">
                                                        {[0, 1, 2].map(j => <span key={j} className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${j * 150}ms` }} />)}
                                                    </span>
                                                    Enviando solicitud…
                                                </span>
                                            ) : (
                                                renderText(m.text)
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Quick reply chips */}
                            {quickReplies.length > 0 && (
                                <div className="px-3 py-2 flex gap-1.5 flex-wrap" style={{ background: 'rgba(248,250,252,1)', borderTop: '1px solid rgba(37,150,190,0.07)' }}>
                                    {quickReplies.map(q => (
                                        <button
                                            key={q}
                                            onClick={() => handleQuick(q)}
                                            disabled={sending}
                                            className="px-2.5 py-1 rounded-full text-[11.5px] font-medium border transition-all"
                                            style={{
                                                background: 'rgba(37,150,190,0.07)',
                                                borderColor: 'rgba(37,150,190,0.2)',
                                                color: '#2596be',
                                            }}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Input */}
                            <div
                                className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
                                style={{ borderTop: '1px solid rgba(37,150,190,0.1)', background: '#ffffff' }}
                            >
                                <input
                                    ref={inputRef}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                    placeholder={
                                        convState === 'awaiting_ticket_desc'
                                            ? 'Describe el problema…'
                                            : convState === 'confirming_ticket'
                                                ? 'Escribe "sí" o "no"…'
                                                : 'Escribe un mensaje…'
                                    }
                                    disabled={sending}
                                    className="flex-1 text-[13px] outline-none bg-transparent"
                                    style={{ color: '#1e293b' }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || sending}
                                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                                    style={{
                                        background: input.trim() && !sending ? 'linear-gradient(135deg, #2596be 0%, #1a7fa0 100%)' : 'rgba(0,0,0,0.08)',
                                        color: input.trim() && !sending ? '#ffffff' : '#94a3b8',
                                    }}
                                    aria-label="Enviar"
                                >
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
