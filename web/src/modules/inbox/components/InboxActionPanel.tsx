import { BarChart3, Plus, RefreshCw, Clock, Lightbulb, Sparkles, Send } from 'lucide-react';
import { motion } from 'motion/react';

interface InboxActionPanelProps {
  isAnalyzing: boolean;
  analysis: any;
  leadJourney: any[];
  setIsAiAnalysisOpen: (open: boolean) => void;
  setInputText: (text: string) => void;
}

export function InboxActionPanel({
  isAnalyzing,
  analysis,
  leadJourney,
  setIsAiAnalysisOpen,
  setInputText
}: InboxActionPanelProps) {
  return (
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
            <div className="bg-brand-blue/5 p-4 rounded-2xl border border-brand-blue/10">
              <p className="text-[11px] font-medium text-brand-blue mb-4 italic leading-relaxed">"{analysis.suggestedResponse}"</p>
              <button onClick={() => setInputText(analysis.suggestedResponse)} className="w-full py-2 bg-white rounded-xl text-[10px] font-bold uppercase tracking-widest text-brand-blue shadow-sm border border-brand-blue/20 hover:bg-brand-blue hover:text-white transition-all flex items-center justify-center gap-2 group">
                <Send size={14} className="group-hover:translate-x-0.5 transition-transform" />
                Usar sugerencia
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
