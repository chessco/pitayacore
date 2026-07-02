import { RefreshCw, CheckCheck, Zap } from 'lucide-react';
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

import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

function isBase64Image(str: string): boolean {
  if (typeof str !== 'string') return false;
  const trimmed = str.trim().replace(/\s/g, '');
  const isRawBase64 = 
    trimmed.startsWith('/9j/') || 
    trimmed.startsWith('iVBORw0') || 
    trimmed.startsWith('R0lGOD') || 
    trimmed.startsWith('UklGR');
  const isDataUri = trimmed.startsWith('data:image/');
  return (isRawBase64 && trimmed.length > 100) || isDataUri;
}

function getBase64ImageUrl(str: string): string {
  const trimmed = str.trim().replace(/\s/g, '');
  if (trimmed.startsWith('data:image/')) return trimmed;
  
  let mimeType = 'image/jpeg';
  if (trimmed.startsWith('iVBORw0')) {
    mimeType = 'image/png';
  } else if (trimmed.startsWith('R0lGOD')) {
    mimeType = 'image/gif';
  } else if (trimmed.startsWith('UklGR')) {
    mimeType = 'image/webp';
  }
  
  return `data:${mimeType};base64,${trimmed}`;
}

export function Message({ text, time, isUser, isAI, avatar, provider }: MessageProps) {
  const isIncoming = isUser;
  const safeText = typeof text === 'string' ? text : (typeof text === 'object' ? JSON.stringify(text) : String(text || ''));
  const safeTime = time || '--:--';
  const isImg = isBase64Image(safeText);

  return (
    <div className={`flex items-start gap-2 mb-1 ${isIncoming ? 'flex-row' : 'flex-row-reverse'}`}>
      <div className={`relative max-w-[85%] sm:max-w-[70%] px-2 pt-1.5 pb-2 rounded-lg text-[13px] sm:text-[14.2px] shadow-sm ${isIncoming ? 'bg-white text-[#111b21] rounded-tl-none border-none ml-2 mt-1' : 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none border-none mr-2 mt-1'}`}>
        <div className={`absolute top-0 w-2 h-3 ${isIncoming ? '-left-2 bg-white [clip-path:polygon(100%_0,0_0,100%_100%)]' : '-right-2 bg-[#d9fdd3] [clip-path:polygon(0_0,100%_0,0_100%)]'}`} />
        <div className="flex flex-col">
          <div className="markdown-content leading-snug break-words pb-3">
            {isImg ? (
              <img 
                src={getBase64ImageUrl(safeText)} 
                alt="Imagen de WhatsApp" 
                className="max-w-full max-h-[300px] sm:max-h-[400px] rounded-lg my-1 cursor-pointer object-contain hover:opacity-90 transition-opacity"
                onClick={() => {
                  const newWindow = window.open();
                  if (newWindow) {
                    newWindow.document.write(`<img src="${getBase64ImageUrl(safeText)}" style="max-w:100%; max-height:100vh; display:block; margin:auto;" />`);
                  }
                }}
              />
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc ml-5 my-2" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal ml-5 my-2" {...props} />,
                  li: ({node, ...props}) => <li className="mb-1" {...props} />,
                  a: ({node, ...props}) => (
                    <a 
                      className="text-blue-600 hover:text-blue-800 hover:underline break-all font-semibold" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      {...props} 
                    />
                  ),
                }}
              >
                {safeText}
              </ReactMarkdown>
            )}
          </div>
          <div className="flex items-center justify-end gap-1 absolute bottom-1 right-1.5">
            <span className="text-[10px] text-[#667781] leading-none mt-0.5">{safeTime}</span>
            {!isIncoming && (
              <CheckCheck size={14} className="text-[#53bdeb] ml-0.5" />
            )}
          </div>
        </div>
      </div>
      {!isIncoming && isAI && (
        <div className="w-5 h-5 mt-2 rounded-full bg-brand-blue flex items-center justify-center shadow-sm">
          <Zap size={10} className="text-white fill-white" />
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
    <div className="flex-1 overflow-y-auto p-4 bg-[#efeae2] bg-[url('https://web.whatsapp.com/img/bg-chat-tile-light_04fcacde539c58cca6745483d4858c52.png')] bg-repeat scroll-smooth relative opacity-95">
      <div className="relative z-10 flex flex-col min-h-full">
        {isMessagesLoading ? (
          <div className="flex-1 flex flex-col justify-center items-center gap-4 text-slate-400">
            <RefreshCw size={24} className="animate-spin text-brand-blue" />
            <p className="text-[10px] font-black uppercase tracking-widest">Cargando Historial...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex justify-center items-center text-[#54656f] text-sm font-medium">Esperando mensajes...</div>
        ) : (
          <>
            <div className="flex justify-center my-4">
              <span className="text-[11px] font-medium text-[#54656f] bg-[#ffeecd] px-3 py-1.5 rounded-lg shadow-sm">Los mensajes están cifrados de extremo a extremo. Nadie fuera de este chat, ni siquiera PitayaCore, puede leerlos ni escucharlos.</span>
            </div>
            {messages.map((msg: any, idx: number) => {
              const currentMsgDate = new Date(msg.createdAt).toLocaleDateString();
              const prevMsgDate = idx > 0 ? new Date(messages[idx-1].createdAt).toLocaleDateString() : null;
              const showDateSeparator = currentMsgDate !== prevMsgDate;

              return (
                <div key={msg.id || idx}>
                  {showDateSeparator && (
                    <div className="flex justify-center my-6">
                      <span className="text-[11px] font-medium text-[#54656f] bg-white px-3 py-1.5 rounded-lg shadow-sm">
                        {(() => {
                          const today = new Date().toLocaleDateString();
                          const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
                          if (currentMsgDate === today) return 'HOY';
                          if (currentMsgDate === yesterday) return 'AYER';
                          return new Date(msg.createdAt).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
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
