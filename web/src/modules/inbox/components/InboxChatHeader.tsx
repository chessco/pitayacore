import { 
  MoreVertical, 
  Bot, 
  User, 
  CheckCircle,
  Smartphone,
  Globe,
  MessageSquare,
  Zap,
  Sparkles
} from 'lucide-react';

interface InboxChatHeaderProps {
  activeConversation: any;
  handleResolveConversation: () => void;
  hitlEscalated: boolean;
  isAiAnalysisOpen?: boolean;
  handleToggleCopilot?: () => void;
  handleToggleAutopilot?: () => void;
  handleUpdateContactName?: (name: string) => void;
  agents?: any[];
  onChangeAgent?: (agentId: string) => void;
}

import { useState } from 'react';

export function InboxChatHeader({ 
  activeConversation, 
  handleResolveConversation, 
  hitlEscalated,
  isAiAnalysisOpen,
  handleToggleCopilot,
  handleToggleAutopilot,
  handleUpdateContactName,
  agents = [],
  onChangeAgent
}: InboxChatHeaderProps) {
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  
  if (!activeConversation) {
    return (
      <div className="p-4 border-b border-[#e9edef] flex justify-between items-center bg-[#f0f2f5]">
        <h3 className="font-semibold text-[#111b21]">Selecciona una conversación</h3>
      </div>
    );
  }

  const isHumanAssigned = !!activeConversation.metadata?.humanActiveUntil || activeConversation.assignedAgentId?.startsWith('usr_');
  const isAiActive = !!(activeConversation.metadata?.humanActiveUntil && new Date(activeConversation.metadata.humanActiveUntil) <= new Date());

  const getProviderIcon = (provider: string = 'web') => {
    switch (provider.toLowerCase()) {
      case 'whatsapp': return <Smartphone className="w-5 h-5 text-emerald-500" />;
      case 'telegram': return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'web':
      default: return <Globe className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="p-4 border-b border-[#e9edef] flex justify-between items-center bg-[#f0f2f5] z-10 sticky top-0">
      <div className="flex items-center gap-4">
        {/* Avatar Placeholder */}
        <div className="w-10 h-10 rounded-full bg-[#dfe5e7] flex items-center justify-center text-white overflow-hidden relative">
           {activeConversation.contact?.avatar ? (
             <img src={activeConversation.contact.avatar} alt="Avatar" className="w-full h-full object-cover" />
           ) : (
             <User className="w-5 h-5" />
           )}
           <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-slate-900 rounded-full flex items-center justify-center">
             {getProviderIcon(activeConversation.provider)}
           </div>
        </div>
        
        <div>
          <h3 className="font-semibold text-[#111b21] text-lg flex items-center gap-2">
            {isEditingName ? (
              <input 
                type="text" 
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                onBlur={() => {
                  if (editNameValue.trim() !== '') {
                    handleUpdateContactName?.(editNameValue);
                  }
                  setIsEditingName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (editNameValue.trim() !== '') {
                      handleUpdateContactName?.(editNameValue);
                    }
                    setIsEditingName(false);
                  }
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                className="bg-white border border-[#e9edef] rounded px-2 py-0.5 text-[#111b21] outline-none focus:border-emerald-500 w-48"
                autoFocus
              />
            ) : (
              <span 
                className="cursor-pointer hover:underline decoration-emerald-500 decoration-2 underline-offset-4" 
                onClick={() => {
                  setEditNameValue(activeConversation.contact?.displayName || activeConversation.contact?.name || activeConversation.userId || '');
                  setIsEditingName(true);
                }}
                title="Click para editar nombre"
              >
                {activeConversation.contact?.displayName || activeConversation.contact?.name || activeConversation.userId}
              </span>
            )}
            {isHumanAssigned && <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider font-bold">Intervención</span>}
          </h3>
          <p className="text-xs flex items-center gap-2 text-[#667781] mt-0.5">
            <span className="flex items-center gap-1">
              {isHumanAssigned ? <User className="w-3 h-3 text-blue-400" /> : <Bot className="w-3 h-3 text-purple-400" />}
              {isHumanAssigned ? 'Atendiendo Operador' : 'Agente IA (Mando)'}
            </span>
            {activeConversation.metadata?.channelId && (
              <>
                <span className="text-[#667781]">•</span>
                <span
                  className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded"
                  title={`Línea WhatsApp vinculada · ${activeConversation.metadata.channelId}`}
                >
                  <Smartphone className="w-3 h-3" />
                  Línea WhatsApp
                </span>
              </>
            )}
            {activeConversation.id && (
              <>
                <span className="text-[#667781]">•</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(String(activeConversation.id));
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 1500);
                  }}
                  className="font-mono text-[10px] text-[#8696a0] hover:text-[#667781] transition-colors"
                  title={`ID de conversación: ${activeConversation.id} (click para copiar)`}
                >
                  {copiedId ? '¡Copiado!' : `#${String(activeConversation.id).slice(0, 8)}`}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {isAiActive && onChangeAgent && agents && agents.length > 0 && (
          <select
            value={activeConversation.assignedAgentId || ''}
            onChange={(e) => onChangeAgent(e.target.value)}
            className="text-xs bg-white border border-emerald-200 text-emerald-700 px-2 py-1.5 rounded-full outline-none hover:border-emerald-400 transition-colors cursor-pointer mr-1"
            title="Seleccionar agente para autopiloto"
          >
            <option value="" disabled>Selecciona un Agente</option>
            {agents.map(agent => (
              <option key={agent.slug || agent.id} value={agent.slug || agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        )}
        {handleToggleAutopilot && (
          <button 
            onClick={handleToggleAutopilot}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all shadow-sm ${
              isAiActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-200'
            }`}
            title={isAiActive ? "Apagar Autopiloto" : "Prender Autopiloto"}
          >
            <Zap size={18} fill={isAiActive ? 'currentColor' : 'none'} />
          </button>
        )}
        
        <button 
          onClick={handleResolveConversation}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 border-2 border-emerald-100 hover:bg-emerald-100 text-[11px] font-black uppercase tracking-widest transition-all"
        >
          <CheckCircle size={16} /><span className="hidden xs:inline">Resolver</span>
        </button>

        {handleToggleCopilot && (
          <button 
            onClick={handleToggleCopilot}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
              isAiAnalysisOpen 
                ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                : 'bg-white text-brand-blue border-2 border-brand-blue/20 hover:border-brand-blue'
            }`}
          >
            <Sparkles size={16} /><span className="hidden xs:inline">Copilot</span>
          </button>
        )}
        
        <button className="p-2 ml-1 hover:bg-black/5 rounded-full text-[#54656f] hover:text-[#111b21] transition-colors">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
