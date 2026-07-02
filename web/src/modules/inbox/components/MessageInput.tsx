import { Smile, Plus, Send } from 'lucide-react';

interface MessageInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  handleSendMessage: () => void;
  quickReplies?: any[];
}

export function MessageInput({ 
  inputText, 
  setInputText, 
  handleSendMessage,
  quickReplies = []
}: MessageInputProps) {
  return (
    <>
      {quickReplies.length > 0 && (
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
        <div className="flex items-center gap-1 text-[#54656f] pb-1">
          <button className="p-2 hover:bg-black/5 rounded-full transition-colors"><Smile size={24} /></button>
          <button className="p-2 hover:bg-black/5 rounded-full transition-colors"><Plus size={24} /></button>
        </div>
        <div className="flex-1 relative pb-0.5">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Escribe un mensaje..."
            className="w-full bg-white border-none rounded-lg px-4 py-2.5 text-[15px] text-[#111b21] focus:ring-0 placeholder-[#8696a0] shadow-sm"
          />
        </div>
        <button 
          onClick={handleSendMessage} 
          disabled={!inputText.trim()}
          className={`w-11 h-11 flex items-center justify-center rounded-full transition-all ${inputText.trim() ? 'text-[#00a884] hover:bg-black/5' : 'text-[#8696a0]'}`}
        >
          <Send size={24} className={inputText.trim() ? 'translate-x-0.5' : ''} />
        </button>
      </div>
    </>
  );
}
