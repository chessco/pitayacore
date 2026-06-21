import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PanelLeftClose, PanelLeftOpen, 
  Send, 
  Star, 
  CheckCircle, 
  User, 
  MessageSquare, 
  Thermometer, 
  Database, 
  Fish, 
  Eye, 
  ShoppingCart,
  Paperclip,
  Smile,
  CheckCheck,
  MoreVertical,
  Settings,
  Clock,
  Zap,
  BarChart3
} from 'lucide-react';
import axios from 'axios';
import { io, Socket as SocketIO } from 'socket.io-client';
import ReactMarkdown from 'react-markdown';
import { useTenant } from '../../../contexts/TenantContext';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  time?: string;
  status?: 'sent' | 'delivered' | 'read';
}

interface CapsuleChatProps {
  slug: string;
  agentName: string;
  agentPortrait?: string;
  agentGreeting?: string;
  preview?: boolean;
  onPortraitClick?: () => void;
  agentRoles?: any;
}

export const CapsuleChat: React.FC<CapsuleChatProps> = ({ 
  slug,
  agentName, 
  agentPortrait, 
  agentGreeting,
  preview: propPreview,
  onPortraitClick,
  agentRoles
}) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: agentGreeting || `¡Hola! Soy **${agentName}** 🤖\n\nCuéntame sobre tus necesidades y te ayudaré a optimizar tus procesos y resultados.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [capsuleId, setCapsuleId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activeAgentSlug, setActiveAgentSlug] = useState<string | null>(null);
  const [isEscalating, setIsEscalating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<SocketIO | null>(null);
  const { selectedTenant, flowApiKey } = useTenant();

  // Detect preview mode from URL or prop
  const isPreview = propPreview || new URLSearchParams(window.location.search).get('preview') === 'true';

  const [userId] = useState(() => {
    const saved = localStorage.getItem('capsule_user_id');
    if (saved) return saved;
    const newId = `anon-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('capsule_user_id', newId);
    return newId;
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Setup Socket for Real-time human replies
  useEffect(() => {
    let tid: string | null = null;
    let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
    if (window.location.hostname === 'localhost') {
      apiUrl = 'http://localhost:3014';
    } else if (!import.meta.env.VITE_API_URL) {
      apiUrl = window.location.origin.replace(':3000', ':3014');
    }

    const socket = io(apiUrl);
    socketRef.current = socket;

    const fetchCapsuleInfo = async () => {
      try {
        const endpoint = isPreview 
          ? `${apiUrl}/api/capsule-studio/capsules/slug/${slug}`
          : `${apiUrl}/api/capsules/${slug}`;

        const role = localStorage.getItem('pitayacore_role') || 'tenant';
        const res = await axios.get(endpoint, {
          headers: isPreview ? {
            'x-tenant-id': selectedTenant?.id || '',
            'x-api-key': flowApiKey || '',
            'x-user-role': role.toUpperCase(),
          } : {}
        });
        
        tid = res.data.tenantId || 'DEFAULT_TENANT';
        setCapsuleId(res.data.id);
        if (tid) socket.emit('joinTenant', tid);
        if (conversationId) socket.emit('joinConversation', conversationId);
      } catch (err) {
        console.error("[CapsuleChat] Error fetching capsule info:", err);
      }
    };

    socket.on('connect', () => {
      console.log("[CapsuleChat] Connected to socket:", socket.id);
      fetchCapsuleInfo();
    });

    socket.on('newMessage', (newMsg: any) => {
      console.log("[CapsuleChat] New socket message received:", newMsg);
      if (newMsg.role === 'assistant') {
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id || (m.content === newMsg.content && m.role === 'assistant'))) return prev;
          return [...prev, {
            role: 'assistant',
            content: newMsg.content,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }];
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [slug, isPreview, selectedTenant, flowApiKey, conversationId]);

  const activeAgent = activeAgentSlug ? { slug: activeAgentSlug } : null;

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || input;
    if (!text.trim() || loading) return null;

    const userMsg = text.trim();
    if (!textOverride) setInput('');
    
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userMsg,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    }]);
    setLoading(true);

    try {
      let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
      if (window.location.hostname === 'localhost') {
        apiUrl = 'http://localhost:3014';
      } else if (!import.meta.env.VITE_API_URL) {
        apiUrl = window.location.origin.replace(':3000', ':3014');
      }

      const endpoint = isPreview 
        ? `${apiUrl}/api/capsule-studio/capsules/slug/${slug}/chat`
        : `${apiUrl}/api/capsules/${slug}/chat`;

      const role = localStorage.getItem('pitayacore_role') || 'tenant';
      const res = await axios.post(endpoint, {
        message: userMsg,
        userId: userId,
        history: messages.map(m => ({ role: m.role, content: m.content })),
        agentSlug: activeAgent?.slug
      }, {
        headers: isPreview ? {
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey || '',
          'x-user-role': role.toUpperCase(),
        } : {}
      });

      if (res.data.conversationId) {
        setConversationId(res.data.conversationId);
      }
      
      // Add assistant reply
      if (res.data.reply) {
        setMessages(prev => {
          // Update user message status to read
          const updated = prev.map(m => m.role === 'user' ? { ...m, status: 'read' as const } : m);
          return [...updated, {
            role: 'assistant',
            content: res.data.reply,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }];
        });
      }

      return res.data;
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Problema de conexión. Reintenta.', time: 'Ahora' }]);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const escalateToHuman = async () => {
    if (loading || isEscalating) return;
    setIsEscalating(true);
    try {
      let currentConvId = conversationId;
      if (!currentConvId) {
        const res = await handleSend("Me gustaría hablar con un asesor humano.");
        if (res && res.conversationId) currentConvId = res.conversationId;
      }

      if (currentConvId) {
        let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
        if (window.location.hostname === 'localhost') apiUrl = 'http://localhost:3014';
        await axios.post(`${apiUrl}/api/conversations/${currentConvId}/request-agent`);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'He solicitado la intervención de un asesor humano. En breve se pondrán en contacto contigo aquí mismo.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (err) {
      console.error("Error escalating:", err);
    } finally {
      setIsEscalating(false);
    }
  };

  useEffect(() => {
    const handler = () => escalateToHuman();
    window.addEventListener('escalate-request', handler);
    return () => window.removeEventListener('escalate-request', handler);
  }, [conversationId, loading, isEscalating]);

  return (
    <div className={`grid grid-cols-1 ${isSidebarCollapsed ? 'md:grid-cols-1' : 'md:grid-cols-[280px_1fr]'} bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100 h-[700px] max-h-[85vh] transition-all duration-500 ease-in-out`}>
      {/* Sidebar Bio - Estilo Premium WhatsApp Business */}
      <div className={`bg-[#075e54] overflow-hidden flex flex-col border-r border-slate-100 transition-all duration-500 ${isSidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-full opacity-100'}`}>
        <div 
          className="h-[250px] relative cursor-zoom-in group"
          onClick={onPortraitClick}
        >
          <img 
            src={agentPortrait || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400"} 
            alt={agentName}
            className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#075e54] via-transparent to-transparent opacity-60" />
        </div>
        <div className="p-6 text-white space-y-4 flex-1">
          <div>
            <h3 className="text-xl font-black tracking-tight">{agentName}</h3>
            <p className="text-emerald-200 text-[10px] font-black uppercase tracking-widest mt-1 opacity-80">Especialista Certificado</p>
          </div>
          
          <div className="flex items-center gap-1 text-yellow-400 bg-black/10 p-2 rounded-lg backdrop-blur-sm">
            {[1,2,3,4,5].map(i => <Star key={i} size={12} fill="currentColor" />)}
            <span className="text-white text-[10px] font-black ml-1.5">4.9 · IA Expert</span>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/10">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                 <CheckCircle size={14} className="text-emerald-400" />
               </div>
               <p className="text-[11px] font-bold text-emerald-50 leading-tight">Optimización de procesos garantizada</p>
             </div>
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                 <Clock size={14} className="text-emerald-400" />
               </div>
               <p className="text-[11px] font-bold text-emerald-50 leading-tight">Respuesta en tiempo real 24/7</p>
             </div>
          </div>

          {agentRoles && Object.keys(agentRoles).length > 0 && (
            <div className="pt-6 border-t border-white/10 space-y-3">
              <p className="text-[9px] font-black text-emerald-300 uppercase tracking-widest">Niveles de Soporte</p>
              <div className="space-y-2">
                {Object.entries(agentRoles).map(([role, slug]: [string, any]) => {
                  if (!slug) return null;
                  const roleName = role === 'main' ? 'Asistente IA' : role === 'support' ? 'Ventas' : 'Técnico';
                  
                  return (
                    <button 
                      key={role}
                      onClick={() => setActiveAgentSlug(slug)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all ${activeAgentSlug === slug ? 'bg-white/20 border border-white/20 shadow-lg' : 'hover:bg-white/10'}`}
                    >
                      <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                        {role === 'support' ? <ShoppingCart size={14} /> : role === 'technical' ? <Settings size={14} /> : <MessageSquare size={14} />}
                      </div>
                      <div className="text-left">
                        <div className="text-[9px] font-black uppercase tracking-widest leading-none">{roleName}</div>
                        <div className="text-[8px] text-emerald-200 font-bold uppercase opacity-60">{slug}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

       {/* Chat Area - WhatsApp Design */}
      <div className="h-full bg-[#e5ddd5] relative grid grid-rows-[auto_1fr_auto_auto] overflow-hidden">
        {/* WhatsApp Doodle Background Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.06] pointer-events-none z-0"
          style={{ 
            backgroundImage: `url("https://wweb.dev/assets/whatsapp-chat-background.png")`,
            backgroundSize: '400px'
          }}
        />

        {/* Top Bar */}
        <div className="px-6 py-3 bg-[#f0f2f5] border-b border-slate-200 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 hover:bg-slate-200 rounded-xl transition-all text-slate-500 hover:text-[#075e54] hidden md:block"
              title={isSidebarCollapsed ? "Mostrar info" : "Colapsar info"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
            <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-white">
              <img src={agentPortrait} className="w-full h-full object-cover" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">{agentName}</h4>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-[10px] font-bold text-slate-500">en línea</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <button className="hover:text-slate-700 transition-colors"><Eye size={20} /></button>
            <button className="hover:text-slate-700 transition-colors"><MoreVertical size={20} /></button>
          </div>
        </div>

        {/* Message List */}
        <div 
          ref={scrollRef} 
          className="overflow-y-auto p-4 md:p-8 custom-scrollbar z-10 relative scroll-smooth"
        >
          <div className="space-y-4 pb-12 min-h-full flex flex-col justify-end">
            <div className="flex-1" /> {/* Spacer to push messages to bottom if few */}
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`flex w-full mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`relative max-w-[85%] md:max-w-[75%] px-4 py-2.5 rounded-lg shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-[#dcf8c6] text-slate-800 rounded-tr-none' 
                      : 'bg-white text-slate-800 rounded-tl-none'
                  }`}>
                    {/* Bubble Tail */}
                    <div className={`absolute top-0 w-3 h-3 ${
                      msg.role === 'user' 
                        ? '-right-2 bg-[#dcf8c6]' 
                        : '-left-2 bg-white'
                    }`} 
                    style={{ 
                      clipPath: msg.role === 'user' ? 'polygon(0 0, 0 100%, 100% 0)' : 'polygon(100% 0, 100% 100%, 0 0)' 
                    }} />

                    <div className="prose prose-sm max-w-none prose-slate">
                      <ReactMarkdown 
                        components={{
                          p: ({children}) => <p className="m-0 text-[14px] leading-relaxed">{children}</p>,
                          strong: ({children}) => <strong className="font-black text-[#075e54]">{children}</strong>,
                          ul: ({children}) => <ul className="my-2 pl-4 list-disc">{children}</ul>,
                          li: ({children}) => <li className="text-[13px]">{children}</li>
                        }}
                      >
                        {msg.content.replace('CHECKOUT_TRIGGER', '')}
                      </ReactMarkdown>
                    </div>

                    {msg.content.includes('CHECKOUT_TRIGGER') && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                         <button 
                           onClick={() => {
                             document.getElementById('checkout-block')?.scrollIntoView({ behavior: 'smooth' });
                           }}
                           className="w-full bg-[#25d366] text-white py-2.5 rounded-lg font-black text-[11px] uppercase tracking-widest shadow-md flex items-center justify-center gap-2 hover:bg-[#128c7e] transition-all"
                         >
                           <ShoppingCart size={14} /> Adquirir solución ahora
                         </button>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-1 mt-1.5 opacity-60">
                      <span className="text-[9px] font-medium text-slate-400">{msg.time}</span>
                      {msg.role === 'user' && (
                        <CheckCheck size={14} className={msg.status === 'read' ? 'text-blue-500' : 'text-slate-400'} />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && (
              <div className="flex justify-start mb-4">
                <div className="bg-white px-4 py-3 rounded-lg shadow-sm flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75" />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Chips (Quick Replies) */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar z-10 bg-[#e5ddd5]/80 backdrop-blur-sm">
          {[
            { label: '🚀 Optimizar procesos', icon: Zap },
            { label: '📊 Análisis de rendimiento', icon: BarChart3 },
            { label: '📉 Reducir costos', icon: BarChart3 },
          ].map(chip => (
            <button 
              key={chip.label}
              onClick={() => handleSend(chip.label.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, "").trim())}
              className="whitespace-nowrap px-4 py-2 bg-white text-[#075e54] rounded-full text-[11px] font-black border border-white shadow-sm hover:bg-[#f0f2f5] transition-all flex items-center gap-2"
            >
              <chip.icon size={12} />
              {chip.label}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[#f0f2f5] z-10">
          <div className="flex items-center gap-3">
            <div className="flex gap-1 text-slate-500">
               <button className="p-2 hover:bg-slate-200 rounded-full transition-colors"><Smile size={24} /></button>
               <button className="p-2 hover:bg-slate-200 rounded-full transition-colors"><Paperclip size={24} /></button>
            </div>
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                className="w-full px-6 py-3 bg-white border border-transparent rounded-full focus:outline-none transition-all text-slate-700 text-sm shadow-sm"
                placeholder="Escribe un mensaje..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className={`p-3 rounded-full transition-all shadow-md flex items-center justify-center ${
                input.trim() ? 'bg-[#00a884] text-white' : 'bg-slate-300 text-slate-500'
              }`}
            >
              <Send size={22} fill={input.trim() ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
