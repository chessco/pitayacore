import { useState } from 'react';
import { 
  Eye, 
  Scan, 
  Cpu, 
  Activity, 
  Zap, 
  Maximize2, 
  MoreHorizontal, 
  Upload,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';

const feeds = [
  { id: 1, name: 'Anomalía Tipo A', url: '/anomaly_a_sample.png' },
  { id: 2, name: 'Defectos Superficiales', url: '/defect_sample.png' },
  { id: 3, name: 'Inspección Conforme', url: '/conforming_sample.png' },
];

export function VisionLab() {
  const [activeFeed, setActiveFeed] = useState(feeds[0]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any>(null);

  const startAnalysis = async () => {
    setAnalyzing(true);
    setProgress(30);
    setResults(null);
    
    try {
      const prompt = `Analiza esta imagen como un experto en control de calidad e inspección visual industrial. 
      Busca específicamente anomalías, defectos superficiales, problemas de empaque, daños estructurales o desviaciones estándar.
      Responde EXCLUSIVAMENTE en formato JSON válido (sin markdown) con esta estructura:
      {
        "specie": "Categoría / Tipo de Producto",
        "health": "Óptimo | Alerta | Crítico",
        "confidence": número,
        "biomass_est": "Estimación de volumen o cantidad",
        "anomalies": "Descripción detallada de la anomalía o defecto detectado"
      }`;

      let imageUrl = activeFeed.url;
      // Prepend origin if relative path
      if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
        imageUrl = window.location.origin + imageUrl;
      }

      const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:3014') + '';
      const response = await axios.post(`${apiUrl}/api/ai/vision/analyze`, {
        imageUrl,
        prompt
      });

      setProgress(80);

      const analysisText = response.data.analysis;
      const jsonStr = analysisText.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      
      setResults(parsed);
      setProgress(100);
    } catch (err) {
      console.error('Error analyzing image:', err);
      // Fallback a mock en caso de error de red o API
      setTimeout(() => {
        setResults({
          specie: 'Análisis fallido (Mock)',
          health: 'Alerta',
          confidence: 0,
          biomass_est: 'N/A',
          anomalies: 'Error en conexión con el motor de visión.'
        });
        setProgress(100);
      }, 1000);
    } finally {
      setTimeout(() => setAnalyzing(false), 500);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const newFeed = { id: Date.now(), name: file.name, url: base64 };
      setActiveFeed(newFeed);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header & Stats */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-4 font-display">
            <div className="w-12 h-12 bg-brand-blue rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-blue/30">
               <Eye size={28} />
            </div>
            Laboratorio de Visión
          </h1>
          <p className="text-slate-500 mt-2 max-w-2xl text-sm leading-relaxed">
            Inspección automatizada mediante procesamiento de imágenes. Detecta anomalías, estima volumen/cantidades y monitorea control de calidad en tiempo real.
          </p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm text-center">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">FPS ANÁLISIS</p>
             <p className="text-xl font-black text-slate-800">32.4</p>
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm text-center">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CARGA GPU</p>
             <p className="text-xl font-black text-brand-blue">14%</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* Left: Viewport */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="relative aspect-video bg-brand-deep rounded-[32px] overflow-hidden shadow-2xl group border-4 border-white">
            {/* Main Feed Image */}
            <img 
              src={activeFeed.url} 
              alt="Vision Feed" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            
            {/* HUD Overlays */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Corners */}
              <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-brand-blue/50 rounded-tl-xl" />
              <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-brand-blue/50 rounded-tr-xl" />
              <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-brand-blue/50 rounded-bl-xl" />
              <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-brand-blue/50 rounded-br-xl" />
              
              {/* Scanning Line */}
              {analyzing && (
                <motion.div 
                  initial={{ top: '0%' }}
                  animate={{ top: '100%' }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-blue to-transparent shadow-[0_0_20px_rgba(55,125,255,0.8)] z-10"
                />
              )}

              {/* Status Bar */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-6">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                   <span className="text-[10px] font-black text-white uppercase tracking-widest">SYNC: 100%</span>
                 </div>
                 <div className="w-px h-3 bg-white/20" />
                 <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">FOV: 92°</span>
                 <div className="w-px h-3 bg-white/20" />
                 <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">SENSOR: OPT-X</span>
              </div>
            </div>

            {/* Viewport Controls */}
            <div className="absolute top-6 right-6 flex gap-2">
               <button className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-xl flex items-center justify-center text-white hover:bg-brand-blue transition-all">
                  <Maximize2 size={18} />
               </button>
               <button className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-xl flex items-center justify-center text-white hover:bg-brand-blue transition-all">
                  <MoreHorizontal size={18} />
               </button>
            </div>
          </div>

          {/* Feed Thumbnails */}
          <div className="flex gap-4">
            {feeds.map(feed => (
              <button 
                key={feed.id}
                onClick={() => setActiveFeed(feed)}
                className={`w-24 h-24 rounded-2xl overflow-hidden border-4 transition-all ${activeFeed.id === feed.id ? 'border-brand-blue scale-110 shadow-lg shadow-brand-blue/20' : 'border-white opacity-60 hover:opacity-100'}`}
              >
                <img src={feed.url} alt={feed.name} className="w-full h-full object-cover" />
              </button>
            ))}
            <input 
              type="file" 
              id="vision-upload" 
              className="hidden" 
              accept="image/*"
              onChange={handleFileUpload}
            />
            <label 
              htmlFor="vision-upload"
              className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-brand-blue hover:text-brand-blue transition-all group cursor-pointer"
            >
               <Upload size={20} className="group-hover:-translate-y-1 transition-transform" />
               <span className="text-[10px] font-black uppercase tracking-widest">CARGAR</span>
            </label>
          </div>
        </div>

        {/* Right: Analysis Console */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-brand-deep rounded-[32px] p-8 text-white h-full flex flex-col shadow-2xl shadow-brand-deep/20">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                 <Cpu size={20} className="text-brand-blue" />
                 <h3 className="font-black text-sm uppercase tracking-widest">Consola de Análisis</h3>
               </div>
               <button 
                 onClick={startAnalysis}
                 disabled={analyzing}
                 className="px-4 py-2 bg-brand-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-brand-blue/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
               >
                 <Scan size={14} />
                 Analizar Cuadro
               </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-white/5 rounded-[24px] bg-white/5 mb-8">
              <AnimatePresence mode="wait">
                {analyzing ? (
                  <motion.div 
                    key="analyzing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6 w-full"
                  >
                    <div className="relative w-32 h-32 mx-auto">
                       <svg className="w-full h-full" viewBox="0 0 100 100">
                         <circle className="text-white/10 stroke-current" strokeWidth="8" fill="transparent" r="40" cx="50" cy="50" />
                         <circle 
                            className="text-brand-blue stroke-current" 
                            strokeWidth="8" 
                            strokeLinecap="round" 
                            fill="transparent" 
                            r="40" cx="50" cy="50" 
                            style={{ strokeDasharray: '251.2', strokeDashoffset: `${251.2 * (1 - progress / 100)}` }}
                         />
                       </svg>
                       <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl font-black">{progress}%</span>
                       </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg uppercase tracking-tight">Procesando Pixeles...</h4>
                      <p className="text-slate-400 text-xs mt-2 font-medium italic">Corriendo modelos de segmentación en tiempo real.</p>
                    </div>
                  </motion.div>
                ) : results ? (
                  <motion.div 
                    key="results"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full space-y-6"
                  >
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 mx-auto">
                       <CheckCircle2 size={32} />
                    </div>
                    <div className="space-y-4 text-left">
                       <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">CATEGORÍA/TIPO DETECTADO</p>
                          <p className="font-bold text-brand-blue">{results.specie}</p>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">ESTADO</p>
                             <p className="font-bold text-emerald-500">{results.health}</p>
                          </div>
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">CONFIANZA</p>
                             <p className="font-bold">{results.confidence}%</p>
                          </div>
                       </div>
                       <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">DETALLES DE ANOMALÍA</p>
                          <p className={`font-bold ${results.anomalies?.toLowerCase() !== 'ninguna' ? 'text-rose-400' : 'text-slate-200'}`}>
                            {results.anomalies}
                          </p>
                       </div>
                    </div>
                    <button 
                      onClick={() => setResults(null)}
                      className="w-full py-3 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                    >
                      Limpiar Resultados
                    </button>
                  </motion.div>
                ) : (
                  <div className="space-y-6">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/20 mx-auto">
                       <RefreshCw size={32} />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">ESPERANDO FLUJO DE DATOS...</p>
                  </div>
                )}
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-white/5 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">LATENCIA</p>
                  <p className="text-lg font-bold">42ms</p>
               </div>
               <div className="p-4 bg-white/5 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">THREADS</p>
                  <p className="text-lg font-bold text-brand-blue">128</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Tools Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <ToolCard 
           icon={<Camera size={20} />}
           title="Captura Inteligente"
           desc="Guarda cuadros específicos con metadatos de análisis para entrenamiento manual."
           color="blue"
        />
        <ToolCard 
           icon={<Activity size={20} />}
           title="Monitor de Operaciones"
           desc="Analiza patrones de flujo y velocidad para detectar cuellos de botella en tiempo real."
           color="purple"
        />
        <ToolCard 
           icon={<AlertCircle size={20} />}
           title="Detector de Anomalías"
           desc="Detección visual de fisuras, grietas, decoloraciones y otros defectos externos."
           color="rose"
        />
      </div>
    </div>
  );
}

function ToolCard({ icon, title, desc, color }: any) {
  const colorMap: any = {
    blue: 'text-brand-blue bg-brand-blue-light/50',
    purple: 'text-purple-500 bg-purple-50',
    rose: 'text-rose-500 bg-rose-50',
  }

  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${colorMap[color]}`}>
          {icon}
       </div>
       <h4 className="font-black text-slate-800 text-sm mb-2 uppercase tracking-tight">{title}</h4>
       <p className="text-slate-500 text-xs leading-relaxed font-medium">{desc}</p>
       <button className="mt-6 flex items-center gap-2 text-[10px] font-black text-brand-blue uppercase tracking-widest group-hover:gap-4 transition-all">
          Acceder Herramienta <Zap size={10} />
       </button>
    </div>
  )
}

