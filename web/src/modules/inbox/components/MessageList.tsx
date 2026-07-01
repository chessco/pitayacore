import { RefreshCw, CheckCircle, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AnimatePresence } from 'motion/react';

interface MessageProps {
  text: string;
  time: string;
  isUser: boolean;
  isAI: boolean;
  avatar?: string;
  provider?: string;
}

export function Message({ text, time, isUser, isAI, avatar, provider }: MessageProps) {
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

interface MessageListProps {
  messages: any[];
  isMessagesLoading: boolean;
  activeConversation: any;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function MessageList({ messages, isMessagesLoading, activeConversation, messagesEndRef }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 bg-[url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-cover bg-center bg-fixed scroll-smooth relative">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] pointer-events-none" />
      <div className="relative z-10 flex flex-col justify-end min-h-full">
        {isMessagesLoading ? (
          <div className="flex-1 flex flex-col justify-center items-center gap-4 text-slate-400">
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
                    isUser={msg.role === 'user' || msg.direction === 'INBOUND'} 
                    isAI={msg.role === 'assistant' || msg.direction === 'OUTBOUND'}
                    avatar={msg.role === 'user' || msg.direction === 'INBOUND' ? `https://ui-avatars.com/api/?name=${activeConversation?.userId || 'Contact'}&background=random` : undefined}
                    provider={msg.provider}
                  />
                </div>
              );
            })}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
