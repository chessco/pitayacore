import { useState, useRef, useEffect } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { io, Socket } from 'socket.io-client';

// Import components
import { InboxSidebar } from './components/InboxSidebar';
import { InboxChatHeader } from './components/InboxChatHeader';
import { MessageList } from './components/MessageList';
import { MessageInput } from './components/MessageInput';
import { InboxActionPanel } from './components/InboxActionPanel';
import { KnowledgeBaseModal } from './components/KnowledgeBaseModal';

export function Inbox({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { selectedTenant, flowApiKey } = useTenant();
  
  let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost') apiUrl = 'http://localhost:3014';
    else if (!import.meta.env.VITE_API_URL) apiUrl = window.location.origin.replace(':3000', ':3014');
  }

  // Core State
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageCache, setMessageCache] = useState<Record<string, any[]>>({});
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  
  // UI State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAiAnalysisOpen, setIsAiAnalysisOpen] = useState(false);
  const [isKbModalOpen, setIsKbModalOpen] = useState(false);
  const [hitlEscalated, setHitlEscalated] = useState(false);
  
  // Agent / Analysis State
  const [analysis, setAnalysis] = useState<any>({
    sentiment: "Neutral",
    intent: "Soporte",
    summary: "Selecciona una conversación para iniciar el análisis...",
    suggestedResponse: "",
    confidence: 0
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [leadJourney, setLeadJourney] = useState<any[]>([]);
  const [quickReplies, setQuickReplies] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  
  const [kbData, setKbData] = useState({ title: '', content: '' });
  const [isSavingKb, setIsSavingKb] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Computed properties
  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // --- Handlers ---
  const handleToggleHitl = async () => {
    if (!activeConversationId) return;
    const isHumanAssigned = activeConversation?.assignedAgentId?.startsWith('usr_') || activeConversation?.metadata?.humanActiveUntil;
    const tid = selectedTenant?.id || 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718';

    if (isHumanAssigned) {
      // Resolve & Return to AI
      const lastSolution = [...messages].reverse().find(m => m.role === 'assistant' || m.direction === 'OUTBOUND')?.content || '';
      setKbData({
        title: analysis.summary?.substring(0, 50) || 'Solución a consulta',
        content: lastSolution || analysis.summary || ''
      });
      setIsKbModalOpen(true);
      
      // Assign back to AI agent
      try {
        await fetch(`${apiUrl}/api/agent-inbox/conversations/${activeConversationId}/assign`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-tenant-id': tid, 'x-api-key': flowApiKey },
          body: JSON.stringify({ agentId: 'agent_mando' }) // fallback AI agent
        });
        setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, assignedAgentId: 'agent_mando' } : c));
      } catch (err) {
        console.error("Error unassigning HITL", err);
      }
    } else {
      // Intervene Manually (Assign to User)
      try {
        const dummyUserId = 'usr_admin123'; // In a real app this would come from auth context
        await fetch(`${apiUrl}/api/agent-inbox/conversations/${activeConversationId}/assign`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-tenant-id': tid, 'x-api-key': flowApiKey },
          body: JSON.stringify({ agentId: null, humanUserId: dummyUserId })
        });
        setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, assignedAgentId: dummyUserId } : c));
      } catch (err) {
        console.error("Error assigning HITL", err);
      }
    }
  };

  const handleSaveToKb = async () => {
    setIsSavingKb(true);
    try {
      const response = await fetch(`${apiUrl}/api/knowledge-base`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': selectedTenant?.id || '', 'x-api-key': flowApiKey },
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

  const handleSendMessage = () => {
    if (!inputText.trim() || !activeConversationId) return;
    const tid = selectedTenant?.id || 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718';
    
    // Add locally for optimistic UI
    const newMessage = {
      id: Date.now().toString(),
      conversationId: activeConversationId,
      content: inputText,
      role: 'assistant',
      direction: 'OUTBOUND',
      createdAt: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setMessageCache(prev => ({
      ...prev,
      [activeConversationId]: [...(prev[activeConversationId] || []), newMessage]
    }));
    
    // Send via socket OR API based on what's available
    if (socketRef.current?.connected) {
      socketRef.current.emit('message.send', {
        conversationId: activeConversationId,
        content: inputText,
        tenantId: tid
      });
    } else {
      fetch(`${apiUrl}/api/agent-inbox/conversations/${activeConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tid, 'x-api-key': flowApiKey },
        body: JSON.stringify({ content: inputText })
      }).catch(err => console.error("Error sending message", err));
    }
    
    setInputText('');
  };

  // --- Effects ---
  useEffect(() => {
    setHitlEscalated(false);
  }, [activeConversationId]);

  useEffect(() => {
    setActiveConversationId(null);
  }, [selectedTenant?.id]);

  useEffect(() => {
    if (activeConversationId) {
      requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }));
    }
  }, [activeConversationId, messages]);

  // Initial Fetch & WebSocket Setup
  useEffect(() => {
    const tid = selectedTenant?.id || 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718';

    // Fetch Omnichannel Conversations
    fetch(`${apiUrl}/api/agent-inbox/conversations`, {
      headers: { 'x-tenant-id': tid, 'x-api-key': flowApiKey }
    })
      .then(res => {
        if (!res.ok) {
          // Fallback to legacy endpoint if backend isn't ready
          return fetch(`${apiUrl}/api/conversations`, { headers: { 'x-tenant-id': tid, 'x-api-key': flowApiKey } }).then(r => r.json());
        }
        return res.json();
      })
      .then(data => {
        const role = localStorage.getItem('pitayacore_role');
        const userEmail = localStorage.getItem('pitayacore_user_email');
        
        let filtered = data.map((c: any) => {
          // Normalize legacy and omnichannel representations
          const rawId = c.userId || c.contact?.displayName || c.contact?.name || c.contactId || c.externalId || 'Anónimo';
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
          filtered = filtered.filter((c: any) => !c.assignedTo || c.assignedTo?.email === userEmail || c.assignedAgentId === userEmail);
        }

        setConversations(filtered);
        if (filtered.length > 0 && !activeConversationId) {
          setActiveConversationId(filtered[0].id);
        }
      })
      .catch(err => console.error("[Inbox] Error cargando conversaciones:", err));

    // Connect to new agent-inbox namespace
    const socketUrl = apiUrl || 'http://localhost:3014';
    socketRef.current = io(socketUrl + '/agent-inbox', {
      path: '/socket.io/',
      transports: ['websocket', 'polling']
    });
    
    socketRef.current.on('connect', () => {
      socketRef.current?.emit('join.tenant', tid);
      
      // Fallback for legacy socket
      socketRef.current?.emit('joinTenant', tid);
    });

    // Handle Omnichannel Message Event
    const handleNewMessage = (newMsg: any) => {
      const mappedMsg = { ...newMsg, role: (newMsg.role === 'assistant' || newMsg.direction === 'OUTBOUND') ? 'assistant' : 'user' };
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
        return currentActiveId;
      });

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
            provider: newMsg.provider || 'web',
            messages: [newMsg]
          };
          return [newConv, ...prev];
        }
      });
    };

    socketRef.current.on('message.new', handleNewMessage);
    socketRef.current.on('newMessage', handleNewMessage); // Legacy compatibility

    return () => {
      socketRef.current?.disconnect();
    };
  }, [selectedTenant?.id, apiUrl, flowApiKey]);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    
    if (messageCache[activeConversationId]) {
      setMessages(messageCache[activeConversationId]);
      // Optional: Background refresh
    } else {
      setIsMessagesLoading(true);
    }
    
    const tid = selectedTenant?.id || 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718';
    
    fetch(`${apiUrl}/api/agent-inbox/conversations/${activeConversationId}/messages`, {
      headers: { 'x-tenant-id': tid, 'x-api-key': flowApiKey }
    })
      .then(res => {
        if (!res.ok) {
           return fetch(`${apiUrl}/api/conversations/${activeConversationId}/messages`, { headers: { 'x-tenant-id': tid, 'x-api-key': flowApiKey } }).then(r => r.json());
        }
        return res.json();
      })
      .then(data => {
        const sorted = data.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const formatted = sorted.map((m: any) => ({
          ...m,
          role: (m.role === 'assistant' || m.direction === 'OUTBOUND') ? 'assistant' : 'user'
        }));
        setMessages(formatted);
        setMessageCache(prev => ({...prev, [activeConversationId]: formatted}));
        
        // Trigger AI Analysis
        if (formatted.length > 0) {
          setIsAnalyzing(true);
          fetch(`${apiUrl}/api/ai/analyze-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-tenant-id': tid, 'x-api-key': flowApiKey },
            body: JSON.stringify({ messages: formatted })
          })
            .then(r => r.json())
            .then(analysisData => {
              setAnalysis(analysisData);
              if (analysisData.quickReplies) setQuickReplies(analysisData.quickReplies);
              if (analysisData.leadJourney) setLeadJourney(analysisData.leadJourney);
            })
            .catch(err => console.error("Error analyzing", err))
            .finally(() => setIsAnalyzing(false));
        }
      })
      .catch(err => console.error("Error fetching messages", err))
      .finally(() => setIsMessagesLoading(false));
      
  }, [activeConversationId, selectedTenant?.id, apiUrl, flowApiKey]);

  return (
    <div className="h-full flex overflow-hidden bg-white">
      <InboxSidebar 
        conversations={conversations}
        activeConversationId={activeConversationId}
        setActiveConversationId={setActiveConversationId}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        hitlEscalated={hitlEscalated}
      />
      
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        <InboxChatHeader 
          activeConversation={activeConversation}
          handleResolveConversation={handleToggleHitl}
          hitlEscalated={hitlEscalated}
        />
        
        <MessageList 
          messages={messages}
          isMessagesLoading={isMessagesLoading}
          activeConversation={activeConversation}
          messagesEndRef={messagesEndRef}
        />
        
        <MessageInput 
          inputText={inputText}
          setInputText={setInputText}
          handleSendMessage={handleSendMessage}
          quickReplies={quickReplies}
        />
      </div>

      <InboxActionPanel 
        isAnalyzing={isAnalyzing}
        analysis={analysis}
        leadJourney={leadJourney}
        setIsAiAnalysisOpen={setIsAiAnalysisOpen}
        setInputText={setInputText}
      />

      <KnowledgeBaseModal 
        isOpen={isKbModalOpen}
        onClose={() => setIsKbModalOpen(false)}
        kbData={kbData}
        setKbData={setKbData}
        handleSaveToKb={handleSaveToKb}
        isSavingKb={isSavingKb}
      />
    </div>
  );
}
