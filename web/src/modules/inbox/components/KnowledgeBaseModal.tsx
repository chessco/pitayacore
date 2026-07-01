import { BookOpen, RefreshCw, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  kbData: { title: string; content: string };
  setKbData: (data: any) => void;
  handleSaveToKb: () => void;
  isSavingKb: boolean;
}

export function KnowledgeBaseModal({
  isOpen,
  onClose,
  kbData,
  setKbData,
  handleSaveToKb,
  isSavingKb
}: KnowledgeBaseModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
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
                  onClick={onClose}
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
  );
}
