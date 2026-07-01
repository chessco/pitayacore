import { 
  MoreVertical, 
  ShieldAlert, 
  Bot, 
  User, 
  CheckCircle,
  Smartphone,
  Globe,
  MessageSquare
} from 'lucide-react';

interface InboxChatHeaderProps {
  activeConversation: any;
  handleResolveConversation: () => void;
  hitlEscalated: boolean;
}

export function InboxChatHeader({ 
  activeConversation, 
  handleResolveConversation, 
  hitlEscalated 
}: InboxChatHeaderProps) {
  
  if (!activeConversation) {
    return (
      <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/80 backdrop-blur-md">
        <h3 className="font-semibold text-slate-200">Selecciona una conversación</h3>
      </div>
    );
  }

  const isHumanAssigned = !!activeConversation.metadata?.humanActiveUntil || activeConversation.assignedAgentId?.startsWith('usr_');

  const getProviderIcon = (provider: string = 'web') => {
    switch (provider.toLowerCase()) {
      case 'whatsapp': return <Smartphone className="w-5 h-5 text-emerald-500" />;
      case 'telegram': return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'web':
      default: return <Globe className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/80 backdrop-blur-md z-10 sticky top-0">
      <div className="flex items-center gap-4">
        {/* Avatar Placeholder */}
        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 overflow-hidden relative">
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
          <h3 className="font-semibold text-slate-200 text-lg flex items-center gap-2">
            {activeConversation.contact?.displayName || activeConversation.userId}
            {isHumanAssigned && <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider font-bold">Intervención</span>}
          </h3>
          <p className="text-xs flex items-center gap-2 text-slate-400 mt-0.5">
            <span className="flex items-center gap-1">
              {isHumanAssigned ? <User className="w-3 h-3 text-blue-400" /> : <Bot className="w-3 h-3 text-purple-400" />}
              {isHumanAssigned ? 'Atendiendo Operador' : 'Agente IA (Mando)'}
            </span>
            <span className="text-slate-600">•</span>
            <span>{activeConversation.id}</span>
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button 
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm
            ${hitlEscalated || activeConversation.metadata?.humanActiveUntil 
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20' 
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20'
            }`}
          onClick={handleResolveConversation}
        >
          {hitlEscalated || activeConversation.metadata?.humanActiveUntil ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Resolver & Guardar en KB
            </>
          ) : (
            <>
              <ShieldAlert className="w-4 h-4" />
              Intervenir Manualmente
            </>
          )}
        </button>
        <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
