import { useState } from 'react';
import axios from 'axios';
import { 
  FileText, 
  Sparkles, 
  Download, 
  Copy, 
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Globe,
  Settings2,
  Database,
  Search,
  Plus,
  ArrowRight,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTenant } from '../../contexts/TenantContext';

const standardProtocols = [
  { id: 'SOP-001', title: 'Manejo de Calidad de Agua', category: 'Producción', status: 'Verificado' },
  { id: 'SOP-002', title: 'Protocolo de Bioseguridad Nivel 2', category: 'Seguridad', status: 'Borrador' },
  { id: 'SOP-003', title: 'Alimentación Fase de Engorda', category: 'Nutrición', status: 'Verificado' },
  { id: 'SOP-004', title: 'Tratamiento de Efluentes', category: 'Medio Ambiente', status: 'En Revisión' },
];

export function ProtocolArchitecture() {
  const { flowApiKey, selectedTenant } = useTenant();
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [protocol, setProtocol] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('generator');
  const [options, setOptions] = useState({
    tone: 'técnico',
    format: 'estándar ISO',
    complexity: 'avanzado'
  });

  const generateProtocol = async () => {
    if (!topic) return;
    setGenerating(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:3014') + '';
      const tenantId = selectedTenant?.id || 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718';
      const response = await axios.post(`${apiUrl}/api/ai/predictive/insight`, {
        topic,
        type: 'SOP_GENERATION',
        options
      }, {
        headers: { 
          'x-tenant-id': tenantId,
          'x-api-key': flowApiKey
        }
      });
      // For now using the same endpoint but simulating SOP structure if it returns text
      setProtocol(response.data.insight || "Protocolo generado exitosamente.");
    } catch (error) {
      console.warn('API Generation failed, using mock:', error);
      setTimeout(() => {
        setProtocol(`# PROTOCOLO: ${topic.toUpperCase()}
        
## 1. INTRODUCCIÓN
Este documento establece los procedimientos operativos estándar para el manejo de ${topic} en instalaciones de acuicultura de alta densidad.

## 2. EQUIPAMIENTO REQUERIDO
- Kit de medición multiparamétrico.
- Equipo de protección personal (EPP).
- Software de registro PitayaCore.

## 3. PROCEDIMIENTO PASO A PASO
1. Verificación inicial de parámetros ambientales.
2. Calibración de instrumentos de medición.
3. Ejecución de la maniobra técnica según normativa ASC.
4. Registro de resultados en el hub central.

## 4. MEDIDAS DE SEGURIDAD
- Uso obligatorio de guantes y botas de seguridad.
- Protocolo de desinfección antes y después del acceso a tanques.

## 5. REGISTRO DE DATOS
Toda actividad debe ser logueada en tiempo real vía WhatsApp/Flow.`);
        setGenerating(false);
      }, 2000);
      return;
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="px-3 py-1 bg-brand-blue/10 text-brand-blue rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-blue/20">
               Engine: SOP Builder v4.1
            </div>
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3 font-display">
            Arq. de Protocolos
          </h1>
          <p className="text-slate-500 mt-2 max-w-2xl text-sm leading-relaxed">
            Diseña, genera y gestiona normativas y procedimientos operativos estándar (SOP) asistidos por inteligencia artificial para garantizar la consistencia productiva.
          </p>
        </div>
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
          <button 
            onClick={() => setActiveTab('generator')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'generator' ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Generador
          </button>
          <button 
            onClick={() => setActiveTab('library')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'library' ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Biblioteca
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'generator' ? (
          <motion.div 
            key="generator"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-12 gap-8"
          >
            {/* Left: Configuration */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 p-8">
                <h3 className="font-black text-slate-800 flex items-center gap-3 text-sm uppercase tracking-widest mb-6">
                  <Settings2 size={18} className="text-brand-blue" />
                  Parámetros de Diseño
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Tema del Protocolo</label>
                    <input 
                      type="text" 
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Ej: Bioseguridad en Cosecha"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none focus:border-brand-blue transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Tono del Contenido</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Técnico', 'Formativo', 'Ejecutivo', 'Legal'].map(t => (
                        <button 
                          key={t}
                          onClick={() => setOptions({...options, tone: t.toLowerCase()})}
                          className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${options.tone === t.toLowerCase() ? 'bg-brand-blue text-white border-brand-blue shadow-lg shadow-brand-blue/20' : 'bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Normativa de Referencia</label>
                    <div className="space-y-2">
                      {[
                        { id: 'ISO', label: 'ISO 9001:2015', icon: <Globe size={12} /> },
                        { id: 'ASC', label: 'Estándar ASC / BAP', icon: <ShieldCheck size={12} /> },
                        { id: 'FAO', label: 'Guías Técnicas FAO', icon: <BookOpen size={12} /> }
                      ].map(norm => (
                        <button 
                          key={norm.id}
                          onClick={() => setOptions({...options, format: norm.id})}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all border-2 ${options.format === norm.id ? 'bg-brand-blue-light/30 border-brand-blue text-brand-blue' : 'bg-slate-50 border-transparent text-slate-500'}`}
                        >
                          <div className="flex items-center gap-2">
                            {norm.icon}
                            <span className="text-[10px] font-black uppercase tracking-widest">{norm.label}</span>
                          </div>
                          {options.format === norm.id && <CheckCircle2 size={14} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={generateProtocol}
                    disabled={generating || !topic}
                    className="w-full mt-4 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {generating ? <RotateCcw className="animate-spin" size={18} /> : <Sparkles size={18} />}
                    Arquitectar Protocolo
                  </button>
                </div>
              </div>

              <div className="bg-brand-deep rounded-[32px] p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <h4 className="font-black text-sm uppercase tracking-widest mb-3">IA TIP</h4>
                  <p className="text-xs text-slate-400 leading-relaxed italic">"Para protocolos de bioseguridad, especifica siempre el tipo de patógeno objetivo para que la IA optimice los químicos recomendados."</p>
                </div>
                <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-brand-blue/10 rounded-full blur-3xl" />
              </div>
            </div>

            {/* Right: Viewer */}
            <div className="col-span-12 lg:col-span-8 bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col min-h-[600px] overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-brand-blue border border-slate-100">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">Editor Procedural</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                       <div className="w-1.5 h-1.5 bg-brand-blue rounded-full" />
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Documento Dinámico</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-all"><Copy size={18} /></button>
                  <button className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-all"><Download size={18} /></button>
                </div>
              </div>

              <div className="flex-1 p-10 overflow-y-auto font-sans bg-slate-50/20">
                <AnimatePresence mode="wait">
                  {generating ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-8 max-w-2xl mx-auto"
                    >
                      <div className="h-10 bg-slate-100 rounded-xl w-3/4 animate-pulse" />
                      <div className="space-y-4">
                        <div className="h-4 bg-slate-100 rounded-full w-full animate-pulse" />
                        <div className="h-4 bg-slate-100 rounded-full w-5/6 animate-pulse" />
                        <div className="h-4 bg-slate-100 rounded-full w-4/6 animate-pulse" />
                      </div>
                      <div className="h-64 bg-slate-100 rounded-[32px] w-full animate-pulse" />
                      <div className="space-y-4">
                        <div className="h-4 bg-slate-100 rounded-full w-full animate-pulse" />
                        <div className="h-4 bg-slate-100 rounded-full w-3/4 animate-pulse" />
                      </div>
                    </motion.div>
                  ) : protocol ? (
                    <motion.div
                      key="content"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="max-w-3xl mx-auto prose prose-slate"
                    >
                      <div className="whitespace-pre-wrap leading-relaxed text-slate-700 font-medium">
                        {protocol}
                      </div>
                      
                      <div className="mt-12 pt-8 border-t border-slate-100 flex justify-end gap-4">
                         <button className="px-6 py-3 rounded-2xl bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Descartar</button>
                         <button className="px-6 py-3 rounded-2xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all">Validar y Guardar</button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-6 shadow-inner">
                        <FileCode size={48} />
                      </div>
                      <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Arquitecto de Protocolos</h3>
                      <p className="text-slate-400 text-xs mt-2 max-w-xs font-medium">Define los parámetros en el panel izquierdo y deja que la IA genere un procedimiento detallado para tu operación.</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="library"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            {/* Library Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {standardProtocols.map((item) => (
                 <div key={item.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-brand-blue-light group-hover:text-brand-blue transition-colors">
                        <FileText size={24} />
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                        item.status === 'Verificado' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <h4 className="font-black text-slate-800 text-sm mb-1 leading-tight">{item.title}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{item.category}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">{item.id}</span>
                      <button className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-slate-900/10">
                        <ArrowRight size={14} />
                      </button>
                    </div>
                 </div>
               ))}
               
               <button className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center gap-3 text-slate-400 hover:bg-slate-100 hover:border-brand-blue/30 hover:text-brand-blue transition-all group p-8 min-h-[220px]">
                  <div className="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center group-hover:border-brand-blue transition-colors">
                    <Plus size={24} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Crear Manualmente</span>
               </button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between pt-4">
               <div className="relative w-full max-w-md">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                    type="text" 
                    placeholder="Buscar en la biblioteca..." 
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-brand-blue transition-all shadow-sm"
                 />
               </div>
               <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronización:</span>
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                     <Database size={12} />
                     Cloud Sincronizado
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

