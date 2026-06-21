import { 
  MoreVertical, 
  Plus, 
  Smile, 
  Send, 
  ChevronDown, 
  ShieldAlert,
  Sparkles,
  BarChart3,
  Lightbulb,
  BookOpen,
  Link,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  Zap,
  ChevronLeft,
  Eye,
  MousePointer2,
  MessageSquare,
  Clock,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTenant } from '../../contexts/TenantContext'
import { io, Socket } from 'socket.io-client'
import ReactMarkdown from 'react-markdown'

export function Inbox({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { selectedTenant, flowUrl, flowTenantSlug, flowToken, flowApiKey } = useTenant()
  
  let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost') apiUrl = 'http://localhost:3014';
    else if (!import.meta.env.VITE_API_URL) apiUrl = window.location.origin.replace(':3000', ':3014');
  }

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [messageCache, setMessageCache] = useState<Record<string, any[]>>({})
  const [isMessagesLoading, setIsMessagesLoading] = useState(false)
  const [inputText, setInputText] = useState('')
  const [hitlEscalated, setHitlEscalated] = useState(false)
  const [analysis, setAnalysis] = useState<any>({
    sentiment: "Neutral",
    intent: "Soporte",
    summary: "Selecciona una conversación para iniciar el análisis...",
    suggestedResponse: "",
    confidence: 0
  })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [operators, setOperators] = useState<any[]>([])
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [pendingHitlActions, setPendingHitlActions] = useState<any[]>([])
  const [isAiAnalysisOpen, setIsAiAnalysisOpen] = useState(false)
  const [leadJourney, setLeadJourney] = useState<any[]>([])
  const [quickReplies, setQuickReplies] = useState<any[]>([])
  const [isQuickRepliesLoading, setIsQuickRepliesLoading] = useState(false)
  const [isKbModalOpen, setIsKbModalOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [kbData, setKbData] = useState({ title: '', content: '' })
  const [isSavingKb, setIsSavingKb] = useState(false)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setShowScrollToBottom(!isAtBottom);
  };
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)

  const handleResolveConversation = () => {
    if (!activeConversationId) return;
    
    const activeConv = conversations.find(c => c.id === activeConversationId);
    const wasHitl = hitlEscalated || (activeConv?.metadata?.humanActiveUntil);
    
    if (wasHitl) {
      const lastSolution = [...messages].reverse().find(m => m.role === 'assistant')?.content || '';
      setKbData({
        title: analysis.summary?.substring(0, 50) || 'Solución a consulta',
        content: lastSolution || analysis.summary || ''
      });
      setIsKbModalOpen(true);
    } else {
      setActiveConversationId(null);
    }
  };

  const handleSaveToKb = async () => {
    setIsSavingKb(true);
    try {
      const response = await fetch(`${apiUrl}/api/knowledge-base`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey
        },
        body: JSON.stringify(kbData)
      });
      
      if (response.ok) {
        setIsKbModalOpen(false);
        setActiveConversationId(null);
      }
    } catch (error) {
      console.error("[Inbox] Error saving to KB:", error);
    } finally {
      setIsSavingKb(false);
    }
  };

  useEffect(() => {
    setHitlEscalated(false);
  }, [activeConversationId]);

  useEffect(() => {
    setActiveConversationId(null);
  }, [selectedTenant?.id]);

  useEffect(() => {
    console.log(`[Inbox] Messages state updated: ${messages.length} messages`);
  }, [messages]);

  useEffect(() => {
    const behavior = messages.length > 5 ? 'smooth' : 'auto';
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [messages])

  useEffect(() => {
    if (activeConversationId) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
      });
    }
  }, [activeConversationId])

  useEffect(() => {
    const tid = selectedTenant?.id || 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718';

    fetch(`${apiUrl}/api/conversations`, {
      headers: { 
        'x-tenant-id': tid,
        'x-api-key': flowApiKey
      }
    })
      .then(res => res.json())
      .then(data => {
        const role = localStorage.getItem('pitayacore_role');
        const userEmail = localStorage.getItem('pitayacore_user_email');

        let filtered = data.map((c: any) => {
          const rawId = c.userId || c.externalId || 'Anónimo';
          const isAnon = String(rawId).startsWith('anon-');
          const metadataName = c.metadata?.userName;
          const shortId = String(rawId).split('-')[1]?.substring(0, 5) || '';
          let displayName = isAnon ? `Sesión ${shortId}` : rawId;
          if (metadataName) displayName = `${metadataName} [${shortId}]`;
          
          return {
            ...c,
            userId: displayName,
            updatedAt: c.updatedAt || new Date().toISOString(),
            snippet: c.messages?.[0]?.content || "Nueva conversación"
          };
        });

        if (role === 'operator' && userEmail) {
          filtered = filtered.filter((c: any) => !c.assignedTo || c.assignedTo?.email === userEmail);
        }

        setConversations(filtered)
        if (filtered.length > 0 && !activeConversationId) {
          setActiveConversationId(filtered[0].id)
        }
      })
      .catch(err => console.error("[Inbox] Error cargando conversaciones:", err));

    const socketUrl = apiUrl || 'http://localhost:3014';
    socketRef.current = io(socketUrl, {
      path: '/socket.io/',
      transports: ['websocket', 'polling']
    });
    
    socketRef.current.on('connect', () => {
      socketRef.current?.emit('joinTenant', tid)
    })

    socketRef.current.on('newMessage', (newMsg: any) => {
      const mappedMsg = { ...newMsg, role: newMsg.role === 'assistant' ? 'assistant' : 'user' };
      setMessageCache(prev => {
        const convMsgs = prev[newMsg.conversationId] || [];
        if (convMsgs.find(m => m.id === newMsg.id)) return prev;
        return { ...prev, [newMsg.conversationId]: [...convMsgs, mappedMsg] };
      });

      setActiveConversationId(currentActiveId => {
        if (newMsg.conversationId === currentActiveId) {
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, mappedMsg];
          });
        }
        return currentActiveId
      })

      setConversations(prev => {
        const exists = prev.find(c => c.id === newMsg.conversationId);
        if (exists) {
          return [{ ...exists, snippet: newMsg.content, updatedAt: new Date().toISOString() }, ...prev.filter(c => c.id !== newMsg.conversationId)];
        } else {
          const newConv = {
            id: newMsg.conversationId,
            userId: newMsg.role === 'user' ? (newMsg.senderId || 'Nuevo Usuario') : 'Usuario',
            snippet: newMsg.content,
            updatedAt: new Date().toISOString(),
            source: 'CAPSULE',
            messages: [newMsg]
          };
          return [newConv, ...prev];
        }
      });
    })

    socketRef.current.on('conversationUpdate', (updatedConv: any) => {
      setConversations(prev => {
        const rawId = updatedConv.userId || updatedConv.externalId || 'Anónimo';
        const isAnon = String(rawId).startsWith('anon-');
        const metadataName = updatedConv.metadata?.userName;
        const shortId = String(rawId).split('-')[1]?.substring(0, 5) || '';
        let displayName = isAnon ? `Sesión ${shortId}` : rawId;
        if (metadataName) displayName = `${metadataName} [${shortId}]`;
        
        const formatted = {
          ...updatedConv,
          userId: displayName,
          snippet: updatedConv.messages?.[0]?.content || "Nueva conversación",
          updatedAt: updatedConv.updatedAt || new Date().toISOString()
        };

        const exists = prev.find(c => c.id === updatedConv.id);
        if (exists) return prev.map(c => c.id === updatedConv.id ? { ...c, ...formatted } : c);
        return [formatted, ...prev];
      });
    })

    fetch(`${apiUrl}/api/conversations/operators`, {
      headers: { 'x-tenant-id': selectedTenant?.id || '', 'x-api-key': flowApiKey }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setOperators(data);
        else setOperators([{ id: 'op-1', name: 'Soporte Nivel 1' }, { id: 'op-2', name: 'Biólogo de Turno' }]);
      })
      .catch(err => console.error("[Inbox] Error fetching operators:", err));

    return () => { socketRef.current?.disconnect() }
  }, [selectedTenant, flowUrl, flowTenantSlug, flowToken, flowApiKey])

  useEffect(() => {
    if (!activeConversationId) return;
    
    if (messageCache[activeConversationId]) {
      setMessages(messageCache[activeConversationId]);
      setIsMessagesLoading(false);
    } else {
      setIsMessagesLoading(true);
    }

    const activeConv = conversations.find(c => c.id === activeConversationId);
    if (!activeConv && conversations.length > 0) {
      console.warn(`[Inbox] Conversation ${activeConversationId} not found in list yet.`);
      return;
    }
    
    const isCapsule = activeConv?.source === 'CAPSULE';
    const fetchUrl = isCapsule 
      ? `${apiUrl}/api/conversations/${activeConversationId}/messages`
      : `${flowUrl}/whatsapp/history/${activeConversationId}`;

    const tid = isCapsule ? (selectedTenant?.id || '') : (flowTenantSlug || 'pitaya');

    fetch(fetchUrl, {
      headers: { 
        'x-tenant-id': tid,
        'Authorization': flowToken ? `Bearer ${flowToken}` : '',
        'x-api-key': flowApiKey
      }
    })
      .then(res => res.json())
      .then(data => {
        // Validación: asegurar que data es un array
        const messageList = Array.isArray(data) ? data : (data.messages && Array.isArray(data.messages) ? data.messages : []);
        const mapped = messageList.map((m: any) => ({ 
          ...m, 
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content || m.text || '' // Fallback para contenido
        }));
        setMessages(mapped);
        setMessageCache(prev => ({ ...prev, [activeConversationId]: mapped }));
        runAnalysis(mapped);
      })
      .catch(err => {
        console.error("[Inbox] Error cargando historial:", err);
        setMessages([]);
      })
      .finally(() => setIsMessagesLoading(false));
  }, [activeConversationId, conversations, flowUrl, flowTenantSlug, flowToken, flowApiKey])

  const runAnalysis = async (msgs: any[]) => {
    if (msgs.length === 0) return;
    setIsAnalyzing(true);
    try {
      const response = await fetch(`${apiUrl}/api/ai/analyze-conversation`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey
        },
        body: JSON.stringify({ messages: msgs })
      });
      const data = await response.json();
      setAnalysis(data);
      fetchPendingHitl();
      fetchLeadJourney();
    } catch (error) {
      console.error("[Inbox] Error en análisis de IA:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchPendingHitl = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/hitl/pending`, {
        headers: { 'x-tenant-id': selectedTenant?.id || '', 'x-api-key': flowApiKey }
      });
      const data = await response.json();
      setPendingHitlActions(data);
    } catch (error) {
      console.error("[Inbox] Error fetching HITL actions:", error);
    }
  };

  const fetchLeadJourney = async () => {
    if (!activeConversationId) return;
    const activeConv = conversations.find(c => c.id === activeConversationId);
    
    // Solo intentar cargar si es una CAPSULE o tiene prefijo de journey
    if (activeConv?.source !== 'CAPSULE' && !activeConversationId.startsWith('j_')) {
      setLeadJourney([]);
      return;
    }

    try {
      const base = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
      const url = `${base}/api/capsules/journey/${activeConversationId}`;
      const response = await fetch(url, {
        headers: { 'x-tenant-id': selectedTenant?.id || '', 'x-api-key': flowApiKey }
      });
      
      if (!response.ok) {
        // Silenciamos el 404 ya que simplemente significa que no hay jornada para este contacto aún
        setLeadJourney([]);
        return;
      }
      
      const data = await response.json();
      setLeadJourney(Array.isArray(data) ? data : []);
    } catch (error) {
      // Solo logueamos errores reales de red o parseo, no 404s
      setLeadJourney([]);
    }
  };

  const fetchQuickReplies = async () => {
    if (!selectedTenant) return;
    setIsQuickRepliesLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/corrections?tenantId=${selectedTenant.id}`, {
        headers: { 'x-api-key': flowApiKey }
      });
      const data = await response.json();
      setQuickReplies(data.filter((c: any) => c.isActive));
    } catch (error) {
      console.error("[Inbox] Error fetching quick replies:", error);
    } finally {
      setIsQuickRepliesLoading(false);
    }
  };

  useEffect(() => { fetchQuickReplies(); }, [selectedTenant]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !activeConversationId) return;
    const tid = selectedTenant?.id || '';
    const activeConv = conversations.find(c => c.id === activeConversationId);
    const to = activeConv?.externalId || activeConv?.userId || '';
    if (!to) return;

    const messageData = { to, content: inputText, conversationId: activeConversationId };
    setMessages(prev => [...prev, { ...messageData, id: 'temp-' + Date.now(), role: 'assistant', createdAt: new Date().toISOString() }]);
    setInputText('');

    const isCapsuleConv = activeConv?.source === 'CAPSULE';
    const sendUrl = isCapsuleConv ? `${apiUrl}/api/conversations/${activeConversationId}/reply` : `${flowUrl}/whatsapp/send`;

    fetch(sendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tenant-id': tid, 'x-api-key': flowApiKey },
      body: JSON.stringify(isCapsuleConv ? { content: inputText } : messageData)
    }).catch(err => console.error('[Inbox] Error enviando mensaje:', err));
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId)

  return (
    <div className="flex h-full bg-white overflow-hidden relative">
      <div className={`${activeConversationId ? (isSidebarCollapsed ? 'hidden' : 'hidden md:flex') : 'flex'} w-full ${isSidebarCollapsed ? 'md:w-0' : 'md:w-80'} border-r border-border flex-col bg-slate-50/30 transition-all duration-500 ease-in-out overflow-hidden`}>
        <div className="p-4 sm:p-6">
          <div className="mb-1 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-brand-blue rounded-full" />
            <span className="text-[9px] font-black text-brand-blue uppercase tracking-[0.2em]">{selectedTenant?.brandingConfig?.brandName || selectedTenant?.name || 'PitayaCore AI'}</span>
          </div>
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-black text-slate-800">Bandeja</h2>
            <span className="bg-brand-blue-light text-brand-blue text-[9px] font-black px-2 py-0.5 rounded-full">{conversations.length} Activ@s</span>
          </div>
          <div className="flex gap-2 mb-4 sm:mb-6">
            <button className="flex-1 flex items-center justify-between px-2.5 py-1.5 bg-white border border-border rounded-lg text-[9px] font-bold text-slate-500">Estado <ChevronDown size={10} /></button>
            <button className="flex-1 flex items-center justify-between px-2.5 py-1.5 bg-white border border-border rounded-lg text-[9px] font-bold text-slate-500">Riesgo <ChevronDown size={10} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            {conversations.map(conv => (
              <ConversationItem 
                key={conv.id} name={conv.userId} location={conv.metadata?.capsuleTitle || 'General'}
                time={new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                snippet={conv.snippet} risk={conv.riskLevel || 'BAJO'} channel={conv.source === 'CAPSULE' ? 'Capsula' : 'WhatsApp'}
                active={activeConversationId === conv.id} onClick={() => setActiveConversationId(conv.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={`${activeConversationId ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white relative h-full`}>
        <div className="h-20 border-b border-border flex items-center justify-between px-3 sm:px-6 bg-white/95 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden flex-1">
            {activeConversationId && (
              <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden md:flex p-2 text-slate-500 hover:bg-slate-50 rounded-lg shrink-0 transition-all"
                title={isSidebarCollapsed ? "Mostrar lista" : "Ocultar lista"}
              >
                {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
              </button>
            )}
            {activeConversationId && (
              <button onClick={() => setActiveConversationId(null)} className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-lg shrink-0"><ChevronLeft size={24} /></button>
            )}
            <div className="relative shrink-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-sm border-2 border-white shadow-sm overflow-hidden">
                {activeConversation?.userId?.substring(0, 2).toUpperCase() || '??'}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate leading-tight">{activeConversation?.userId || 'Selecciona un chat'}</h3>
              {activeConversation && (
                <div className="flex items-center gap-1.5 mt-0.5 overflow-hidden">
                  <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 shrink-0">Activo</p>
                  <span className="text-slate-300 text-[10px] shrink-0">•</span>
                  <p className="text-[10px] text-brand-blue font-black uppercase tracking-tight truncate bg-brand-blue/5 px-2 py-0.5 rounded">
                    {activeConversation.metadata?.capsuleTitle || 'Cápsula General'}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 ml-2 shrink-0">
            {activeConversation && (
              <button 
                onClick={() => {
                  const isCurrentlyHuman = activeConversation.metadata?.humanActiveUntil && new Date(activeConversation.metadata.humanActiveUntil) > new Date();
                  if (isCurrentlyHuman) {
                    fetch(`${apiUrl}/api/conversations/${activeConversationId}/autopilot`, {
                      method: 'PATCH', headers: { 'x-tenant-id': selectedTenant?.id || '', 'x-api-key': flowApiKey }
                    }).catch(err => console.error("Failed to enable autopilot:", err));
                  }
                }}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all shadow-sm ${!(activeConversation.metadata?.humanActiveUntil && new Date(activeConversation.metadata.humanActiveUntil) > new Date()) ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                title="Autopilot"
              >
                <Zap size={18} fill={!(activeConversation.metadata?.humanActiveUntil && new Date(activeConversation.metadata.humanActiveUntil) > new Date()) ? 'currentColor' : 'none'} />
              </button>
            )}
            <button 
              onClick={handleResolveConversation}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 border-2 border-emerald-100 hover:bg-emerald-100 text-[11px] font-black uppercase tracking-widest transition-all"
            >
              <CheckCircle size={16} /><span className="hidden xs:inline">Resolver</span>
            </button>
            <button 
              onClick={() => setIsAiAnalysisOpen(!isAiAnalysisOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${isAiAnalysisOpen ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'bg-white text-brand-blue border-2 border-brand-blue/20 hover:border-brand-blue'}`}
            >
              <Sparkles size={16} /><span className="hidden xs:inline">Copilot</span>
            </button>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden bg-[#e5ddd5] flex flex-col">
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 800 800'%3E%3Cg fill='none' stroke='%23000' stroke-width='1'%3E%3Cpath d='M769 229L1037 260.9M927 880L731 737 520 660 309 538 40 599 232 801 431 800 606 825 927 880zM170 180Q190 290 220 190t30 100M150 0L75 200M225 0L150 200M300 0L225 200M375 0L300 200M450 0L375 200M525 0L450 200M600 0L525 200M675 0L600 200M750 0L675 200M800 0L725 200'/%3E%3C/g%3E%3C/svg%3E")` }} />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar z-10 flex flex-col relative" onScroll={handleScroll} ref={scrollContainerRef}>
            {isMessagesLoading ? (
              <div className="flex-1 flex flex-col justify-center items-center text-slate-400 gap-3">
                <RefreshCw size={24} className="animate-spin text-brand-blue" />
                <p className="text-[10px] font-black uppercase tracking-widest">Cargando Historial...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex justify-center items-center text-slate-400 text-sm font-medium">Esperando mensajes...</div>
            ) : (
              <>
                <div className="flex justify-center my-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-[#dcf8c6]/50 px-3 py-1 rounded-lg backdrop-blur-sm">Cifrado de extremo a extremo</span>
                </div>
                {messages.map((msg: any, idx: number) => {
                  const currentMsgDate = new Date(msg.createdAt).toLocaleDateString();
                  const prevMsgDate = idx > 0 ? new Date(messages[idx-1].createdAt).toLocaleDateString() : null;
                  const showDateSeparator = currentMsgDate !== prevMsgDate;

                  return (
                    <div key={msg.id || idx}>
                      {showDateSeparator && (
                        <div className="flex justify-center my-6">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-white/50 px-4 py-1.5 rounded-full border border-slate-100 shadow-sm backdrop-blur-sm">
                            {(() => {
                              const today = new Date().toLocaleDateString();
                              const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
                              if (currentMsgDate === today) return 'Hoy';
                              if (currentMsgDate === yesterday) return 'Ayer';
                              return new Date(msg.createdAt).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
                            })()}
                          </span>
                        </div>
                      )}
                      <Message 
                        text={msg.content} 
                        time={(() => {
                          try {
                            const d = new Date(msg.createdAt);
                            return isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          } catch (e) { return '--:--'; }
                        })()}
                        isUser={msg.role === 'user'} isAI={msg.role === 'assistant'}
                        avatar={msg.role === 'user' ? `https://ui-avatars.com/api/?name=${activeConversation?.userId || 'Contact'}&background=random` : undefined}
                      />
                    </div>
                  );
                })}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Botón Volver al Final */}
          <AnimatePresence>
            {showScrollToBottom && (
              <motion.button
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                onClick={scrollToBottom}
                className="absolute bottom-24 right-8 w-10 h-10 bg-white rounded-full shadow-lg border border-slate-100 flex items-center justify-center text-slate-500 hover:text-brand-blue transition-colors z-30"
              >
                <ChevronDown size={20} />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-blue rounded-full border-2 border-white" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {activeConversationId && quickReplies.length > 0 && (
          <div className="px-4 py-2.5 bg-white/80 backdrop-blur-md border-t border-slate-100 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth shrink-0">
            {quickReplies.map((qr: any) => (
              <button
                key={qr.id} onClick={() => setInputText(qr.correction)}
                className="whitespace-nowrap px-4 py-2 bg-brand-blue/5 hover:bg-brand-blue/10 text-brand-blue rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-blue/10 transition-all active:scale-95"
              >
                {qr.trigger || qr.correction.substring(0, 15) + '...'}
              </button>
            ))}
          </div>
        )}

        <div className="p-3 bg-[#f0f2f5] border-t border-border flex items-end gap-2 relative z-20">
          <div className="flex items-center gap-1 text-slate-500 pb-1">
            <button className="p-2 hover:bg-slate-200 rounded-full transition-colors"><Smile size={22} /></button>
            <button className="p-2 hover:bg-slate-200 rounded-full transition-colors"><Plus size={22} /></button>
          </div>
          <div className="flex-1 relative pb-0.5">
            <input 
              type="text" value={inputText}
              onChange={(e) => {
                 setInputText(e.target.value);
                 if (activeConversationId) {
                   fetch(`${apiUrl}/api/conversations/${activeConversationId}/typing`, { 
                     method: 'POST', headers: { 'x-tenant-id': selectedTenant?.id || '', 'x-api-key': flowApiKey }
                   }).catch(() => {});
                 }
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Escribe un mensaje"
              className="w-full bg-white border-none rounded-xl px-4 py-2.5 text-sm focus:ring-0 placeholder-slate-400 shadow-sm"
            />
          </div>
          <button 
            onClick={handleSendMessage} disabled={!inputText.trim()}
            className={`w-11 h-11 flex items-center justify-center rounded-full transition-all shadow-md ${inputText.trim() ? 'bg-emerald-500 text-white hover:bg-emerald-600 scale-105' : 'bg-white text-slate-400'}`}
          >
            <Send size={20} className={inputText.trim() ? 'translate-x-0.5' : ''} />
          </button>
        </div>
      </div>

      <AnimatePresence>
         {isAiAnalysisOpen && (
           <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAiAnalysisOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 lg:relative w-[90%] sm:w-[320px] lg:w-80 border-l border-border bg-white flex flex-col overflow-hidden z-40 shadow-2xl lg:shadow-none"
            >
              <div className={`flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar ${isAnalyzing ? 'opacity-50' : ''}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-slate-400">
                    <BarChart3 size={16} /><h4 className="text-[10px] font-black uppercase tracking-widest">AI Copilot</h4>
                  </div>
                  <button onClick={() => setIsAiAnalysisOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all"><Plus size={20} className="rotate-45" /></button>
                </div>
                {isAnalyzing && <div className="flex items-center gap-2 text-[10px] font-black text-brand-blue uppercase animate-pulse"><RefreshCw size={12} className="animate-spin" /> Analizando...</div>}
                <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-xs font-bold text-slate-500">Confianza</p>
                    <p className="text-xl font-black text-brand-blue">{((analysis.confidence || 0) * 100).toFixed(1)}%</p>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(analysis.confidence || 0) * 100}%` }} className="h-full bg-brand-blue" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sentimiento</p>
                      <span className="text-xs font-bold text-slate-700">{analysis.sentiment}</span>
                   </div>
                   <div className="bg-white p-4 rounded-2xl border border-border shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Intención</p>
                      <span className="text-xs font-bold text-slate-700">{analysis.intent}</span>
                   </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-slate-400 mb-4"><Clock size={16} /><h4 className="text-[10px] font-black uppercase tracking-widest">Historial</h4></div>
                  <div className="space-y-4 ml-1">
                    {leadJourney.length > 0 ? leadJourney.map((item, idx) => (
                      <div key={idx} className="relative pl-6 pb-4 last:pb-0">
                        {idx !== leadJourney.length - 1 && <div className="absolute left-[9px] top-5 bottom-0 w-px bg-slate-100" />}
                        <div className="absolute left-0 top-0 w-[19px] h-[19px] rounded-full flex items-center justify-center z-10 bg-white border-2 border-slate-200 text-slate-400"><Clock size={10} /></div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-700 leading-tight">{item.title}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">{item.description}</p>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">{new Date(item.timestamp).toLocaleDateString([], { day: '2-digit', month: 'short' })}</span>
                        </div>
                      </div>
                    )) : <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-[9px] font-bold text-slate-400 uppercase">Sin historial</div>}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-slate-400 mb-4"><Lightbulb size={16} /><h4 className="text-[10px] font-black uppercase tracking-widest">Resumen</h4></div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[11px] text-slate-500 leading-relaxed">{analysis.summary}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-slate-400 mb-4"><Sparkles size={16} /><h4 className="text-[10px] font-black uppercase tracking-widest">Sugerencia</h4></div>
                  <div className="bg-white p-4 rounded-2xl border border-brand-blue/20 shadow-sm">
                    <div className="text-xs text-slate-600 italic leading-relaxed mb-4">
                      <ReactMarkdown>
                        {analysis.suggestedResponse ? `“${analysis.suggestedResponse}”` : 'Sin sugerencias'}
                      </ReactMarkdown>
                    </div>
                    <button 
                      onClick={() => setInputText(analysis.suggestedResponse)} disabled={!analysis.suggestedResponse}
                      className="w-full py-2 bg-brand-blue text-white rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-30"
                    >Usar Respuesta</button>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Operaciones</p>
                   <select 
                    value={selectedOperatorId} onChange={(e) => setSelectedOperatorId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 mb-3"
                  >
                    <option value="">Transferir a...</option>
                    {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                  </select>
                  <button 
                    disabled={!selectedOperatorId || isAssigning}
                    onClick={() => {
                      setIsAssigning(true);
                      fetch(`${apiUrl}/api/conversations/${activeConversationId}/assign`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-tenant-id': selectedTenant?.id || '', 'x-api-key': flowApiKey },
                        body: JSON.stringify({ operatorId: selectedOperatorId })
                      }).finally(() => setIsAssigning(false));
                    }}
                    className="w-full py-2.5 bg-white border border-brand-blue text-brand-blue rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30"
                  >Asignar Operador</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Knowledge Base Suggestion Modal */}
      <AnimatePresence>
        {isKbModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsKbModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Auto-Knowledge</h3>
                    <p className="text-xs text-slate-500 font-medium">¿Quieres guardar esta solución en la Base de Conocimiento?</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Título del Artículo</label>
                    <input 
                      type="text" 
                      value={kbData.title}
                      onChange={(e) => setKbData({...kbData, title: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
                      placeholder="Ej: Resolución de duda sobre parámetros de amonio"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Contenido de la Solución</label>
                    <textarea 
                      value={kbData.content}
                      onChange={(e) => setKbData({...kbData, content: e.target.value})}
                      rows={6}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 leading-relaxed focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    onClick={() => {
                      setIsKbModalOpen(false);
                      setActiveConversationId(null);
                    }}
                    className="flex-1 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                  >
                    Omitir
                  </button>
                  <button 
                    onClick={handleSaveToKb}
                    disabled={isSavingKb || !kbData.title || !kbData.content}
                    className="flex-1 py-3.5 bg-brand-blue text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-blue/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSavingKb ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Zap size={16} fill="currentColor" />
                    )}
                    {isSavingKb ? 'Guardando...' : 'Guardar en KB'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ConversationItem({ name, time, snippet, risk, channel, location, active, onClick }: any) {
  return (
    <div onClick={onClick} className={`p-4 border-b border-border cursor-pointer transition-all ${active ? 'bg-white border-l-4 border-l-brand-blue shadow-sm' : 'hover:bg-slate-50'}`}>
      <div className="flex justify-between items-start mb-1">
        <h5 className="font-bold text-sm text-slate-800 truncate pr-2">{name}</h5>
        <span className="text-[10px] text-slate-400 shrink-0">{time}</span>
      </div>
      <p className="text-[9px] font-black text-brand-blue uppercase tracking-tight mb-2 opacity-70 truncate">{location}</p>
      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">{snippet}</p>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          <ShieldAlert size={10} className={risk === 'ALTO' ? 'text-rose-500' : 'text-emerald-500'} />
          <span className={`text-[9px] font-black tracking-widest uppercase ${risk === 'ALTO' ? 'text-rose-500' : 'text-emerald-500'}`}>{risk}</span>
        </div>
        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{channel}</span>
      </div>
    </div>
  )
}

function Message({ text, time, isUser, isAI, avatar }: any) {
  const isIncoming = isUser;
  const safeText = typeof text === 'string' ? text : (typeof text === 'object' ? JSON.stringify(text) : String(text || ''));
  const safeTime = time || '--:--';

  return (
    <div className={`flex items-end gap-2.5 mb-3 ${isIncoming ? 'flex-row' : 'flex-row-reverse'}`}>
      {isIncoming && (
        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0 shadow-sm border-2 border-white ring-1 ring-slate-200">
          <img src={avatar || `https://ui-avatars.com/api/?name=Contact&background=random`} alt="avatar" className="w-full h-full object-cover" />
        </div>
      )}
      <div className={`relative max-w-[85%] sm:max-w-[70%] p-3 px-4 rounded-2xl text-[13px] sm:text-[14.5px] shadow-sm transition-all hover:shadow-md ${isIncoming ? 'bg-white text-slate-800 rounded-tl-none border border-slate-100' : 'bg-[#e7fed6] text-slate-800 rounded-tr-none border border-[#d3eab8]'}`}>
        <div className={`absolute top-0 w-2 h-3 ${isIncoming ? '-left-2 bg-white [clip-path:polygon(100%_0,0_0,100%_100%)] border-l border-slate-100' : '-right-2 bg-[#e7fed6] [clip-path:polygon(0_0,100%_0,0_100%)] border-r border-[#d3eab8]'}`} />
        <div className="flex flex-col gap-1">
          <div className="markdown-content leading-relaxed font-medium">
            <ReactMarkdown
              components={{
                p: ({node, ...props}) => <p className="mb-1.5 last:mb-0" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-1.5" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-1.5" {...props} />,
                li: ({node, ...props}) => <li className="mb-1" {...props} />,
              }}
            >
              {safeText}
            </ReactMarkdown>
          </div>
          <div className="flex items-center justify-end gap-1.5 mt-0.5">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-tighter opacity-80">{safeTime}</span>
            {!isIncoming && (
              <div className="flex -space-x-1.5">
                <CheckCircle size={11} className="text-brand-blue" />
                <CheckCircle size={11} className="text-brand-blue" />
              </div>
            )}
          </div>
        </div>
      </div>
      {!isIncoming && isAI && (
        <div className="w-6 h-6 rounded-full bg-brand-blue flex items-center justify-center shadow-lg ring-2 ring-white transform translate-y-1">
          <Zap size={12} className="text-white fill-white" />
        </div>
      )}
    </div>
  )
}
