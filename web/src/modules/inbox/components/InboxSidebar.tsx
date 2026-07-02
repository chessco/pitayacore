import { 
  MessageSquare, 
  Clock, 
  PanelLeftClose, 
  PanelLeftOpen,
  Smartphone,
  Globe,
  Bot,
  User,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Conversation {
  id: string;
  userId: string;
  provider?: string;
  priority?: string;
  assignedAgentId?: string;
  status: string;
  lastMessageAt?: string;
  updatedAt: string;
  snippet?: string;
  metadata?: any;
  contact?: any;
}

interface InboxSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  hitlEscalated?: boolean; // For active conversation check
}

export function InboxSidebar({
  conversations,
  activeConversationId,
  setActiveConversationId,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
}: InboxSidebarProps) {
  
  const getProviderIcon = (provider: string = 'web') => {
    switch (provider.toLowerCase()) {
      case 'whatsapp':
        return <Smartphone className="w-4 h-4 text-emerald-500" />;
      case 'telegram':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'web':
      default:
        return <Globe className="w-4 h-4 text-indigo-400" />;
    }
  };

  const getPriorityColor = (priority: string = 'MEDIUM') => {
    switch (priority) {
      case 'HIGH': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'LOW': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      case 'MEDIUM':
      default: return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    }
  };

  return (
    <AnimatePresence initial={false}>
      {!isSidebarCollapsed && (
        <motion.div 
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-r border-[#e9edef] bg-white flex flex-col overflow-hidden relative"
        >
          <div className="p-4 border-b border-[#e9edef] flex items-center justify-between sticky top-0 bg-[#f0f2f5] z-10">
            <h2 className="font-semibold text-[#111b21] flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              Inbox
            </h2>
            <button 
              onClick={() => setIsSidebarCollapsed(true)}
              className="p-1.5 hover:bg-black/5 rounded-lg text-[#54656f] hover:text-[#111b21] transition-colors"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No hay conversaciones activas</p>
              </div>
            ) : (
              conversations.map((c) => {
                const isActive = activeConversationId === c.id;
                const isAiAssigned = !!(c.metadata?.humanActiveUntil && new Date(c.metadata.humanActiveUntil) <= new Date());
                const isHumanAssigned = !isAiAssigned || c.assignedAgentId?.startsWith('usr_');
                
                return (
                  <div 
                    key={c.id}
                    onClick={() => setActiveConversationId(c.id)}
                    className={`p-4 border-b border-[#e9edef] cursor-pointer transition-all duration-200 group relative
                      ${isActive 
                        ? 'bg-[#f0f2f5]' 
                        : 'hover:bg-[#f5f6f6]'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 truncate">
                        {getProviderIcon(c.provider)}
                        <span className={`font-medium truncate ${isActive ? 'text-[#111b21]' : 'text-[#111b21]'}`}>
                          {c.contact?.displayName || c.contact?.name || c.userId}
                        </span>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-[#667781] whitespace-nowrap flex items-center gap-1 bg-[#f0f2f5] px-1.5 py-0.5 rounded-full border border-[#e9edef]">
                          <Clock className="w-3 h-3" />
                          {c.lastMessageAt || c.updatedAt ? formatDistanceToNow(new Date(c.lastMessageAt || c.updatedAt), { addSuffix: true, locale: es }) : 'ahora'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                       {/* Priority Badge */}
                       <span className={`text-[10px] px-1.5 py-0.5 rounded-sm border ${getPriorityColor(c.priority)}`}>
                        {c.priority || 'NORMAL'}
                      </span>
                      {/* Assignment Badge */}
                      <span className={`text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded-sm border ${isHumanAssigned ? 'text-blue-400 border-blue-400/20 bg-blue-400/10' : 'text-purple-400 border-purple-400/20 bg-purple-400/10'}`}>
                        {isHumanAssigned ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                        {isHumanAssigned ? 'Humano' : 'Agente'}
                      </span>
                    </div>
                    
                    <p className={`text-sm line-clamp-2 text-[#667781] transition-colors`}>
                      {c.snippet || "Nueva conversación"}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>
      )}
      
      {isSidebarCollapsed && (
        <div className="w-16 border-r border-[#e9edef] bg-white flex flex-col items-center py-4">
          <button 
            onClick={() => setIsSidebarCollapsed(false)}
            className="p-2 hover:bg-black/5 rounded-lg text-[#54656f] hover:text-[#111b21] transition-colors mb-4"
          >
            <PanelLeftOpen className="w-5 h-5" />
          </button>
          <div className="flex-1 flex flex-col gap-2 w-full px-2">
            {conversations.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveConversationId(c.id);
                  setIsSidebarCollapsed(false);
                }}
                className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all ${activeConversationId === c.id ? 'bg-[#f0f2f5] text-[#111b21]' : 'hover:bg-[#f5f6f6] text-[#54656f]'}`}
                title={c.userId}
              >
                {getProviderIcon(c.provider)}
              </button>
            ))}
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
