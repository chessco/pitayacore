import React, { useState, useMemo } from 'react';
import { 
  Scan, 
  Upload, 
  Search, 
  ShieldCheck, 
  Dna,
  Layers,
  Thermometer,
  Cpu,
  Eye,
  Activity,
  History,
  Info
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';

// Hardcoded images for demo/fallback
const inspectionSamples = [
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1590986424791-2355385d0442?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=800"
];

export default function VisionLab() {
  const [selectedImg, setSelectedImg] = useState(inspectionSamples[0]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' }), []);

  const runVisionAnalysis = async () => {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      // Prompt with image and text
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { text: "Analiza esta imagen de control de calidad e inspección visual. Identifica: 1. Estado de conformidad (Bueno/Alerta/Crítico). 2. Posibles anomalías o defectos detectados. 3. Estimación de volumen o conteo visual. 4. Recomendación inmediata de operación. Responde en JSON con las llaves: health, parasite_risk, weight_est, recommendation." },
          { inlineData: { mimeType: "image/jpeg", data: await fetchImageAsBase64(selectedImg) } }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const result = JSON.parse(response.text || '{}');
      setAnalysis(result);
    } catch (error) {
      console.error(error);
      setAnalysis({
        health: "Error",
        parasite_risk: "N/A",
        weight_est: "N/A",
        recommendation: "Error al procesar la imagen con el núcleo de visión Vision-Q."
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // Helper inside component for base64 conversion
  async function fetchImageAsBase64(url: string): Promise<string> {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest">Módulo Visión AI v1.9</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Scan className="text-primary" size={40} />
            Laboratorio de Visión
          </h1>
          <p className="text-slate-500 mt-4 font-body leading-relaxed max-w-xl">
            Inspección automatizada mediante procesamiento de imágenes. Detecta anomalías, estima volumen/cantidades y monitorea control de calidad sin intervención física.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center gap-6">
          <div className="text-center px-4">
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">FPS de Análisis</p>
            <p className="text-2xl font-mono font-bold text-slate-900">32.4</p>
          </div>
          <div className="h-10 w-px bg-slate-200" />
          <div className="text-center px-4">
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Carga GPU</p>
            <p className="text-2xl font-mono font-bold text-slate-900">14%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Workspace: Image Viewer */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative aspect-video bg-slate-900 rounded-[2.5rem] overflow-hidden border-4 border-slate-800 shadow-2xl group">
            <img 
              src={selectedImg} 
              alt="Inspection Scan" 
              className={`w-full h-full object-cover transition-all duration-700 ${analyzing ? 'brightness-50 scale-105 blur-sm' : ''}`}
            />
            
            {/* Scanning Overlay */}
            <AnimatePresence>
              {analyzing && (
                <motion.div 
                  initial={{ top: '-10%' }}
                  animate={{ top: '110%' }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-1 bg-primary shadow-[0_0_20px_2px_rgba(37,99,235,0.8)] z-20"
                />
              )}
            </AnimatePresence>

            {/* Vision HUD Elements */}
            <div className="absolute inset-0 p-8 flex flex-col justify-between pointer-events-none">
              <div className="flex justify-between">
                <div className="w-12 h-12 border-l-2 border-t-2 border-white/30 rounded-tl-xl" />
                <div className="w-12 h-12 border-r-2 border-t-2 border-white/30 rounded-tr-xl" />
              </div>
              
              <div className="flex items-center justify-center">
                {analyzing ? (
                  <div className="bg-slate-900/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 flex items-center gap-3">
                    <History className="animate-spin text-primary" size={20} />
                    <span className="text-white font-mono text-sm tracking-widest">PROCESANDO REDES NEURONALES...</span>
                  </div>
                ) : (
                  <div className="w-16 h-16 border-2 border-primary/40 rounded-full animate-ping" />
                )}
              </div>

              <div className="flex justify-between items-end">
                <div className="w-12 h-12 border-l-2 border-b-2 border-white/30 rounded-bl-xl" />
                <div className="bg-slate-950/80 backdrop-blur-md p-3 rounded-xl border border-white/5 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[10px] font-mono text-white/70">SYNC: 100% | FOV: 92º | SENSOR: OPT-X</span>
                </div>
                <div className="w-12 h-12 border-r-2 border-b-2 border-white/30 rounded-br-xl" />
              </div>
            </div>
          </div>

          <div className="flex gap-4 p-2 overflow-x-auto invisible-scrollbar">
            {inspectionSamples.map((img, i) => (
              <button 
                key={i}
                onClick={() => setSelectedImg(img)}
                className={`flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all ${selectedImg === img ? 'border-primary ring-4 ring-primary/20 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
              >
                <img src={img} className="w-full h-full object-cover" />
              </button>
            ))}
            <button className="flex-shrink-0 w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:bg-slate-200 transition-colors">
              <Upload size={20} />
              <span className="text-[10px] font-bold">CARGAR</span>
            </button>
          </div>
        </div>

        {/* Console: Analysis Output */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white min-h-[440px] flex flex-col shadow-xl border border-white/5">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold flex items-center gap-2">
                <Cpu size={20} className="text-secondary" />
                CONSOLA DE ANÁLISIS
              </h3>
              <button 
                onClick={runVisionAnalysis}
                disabled={analyzing}
                className="px-4 py-2 bg-primary hover:bg-primary/80 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                <Activity size={14} />
                Analizar Cuadro
              </button>
            </div>

            <div className="flex-1 space-y-6 font-mono">
              <AnimatePresence mode="wait">
                {analysis ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    <div>
                      <p className="text-[10px] text-white/40 uppercase mb-2 tracking-widest">Estado de Conformidad</p>
                      <div className="flex items-center gap-3">
                        <span className={`text-xl font-bold ${analysis.health === 'Bueno' ? 'text-green-400' : 'text-amber-400'}`}>
                          {analysis.health}
                        </span>
                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className={`h-full ${analysis.health === 'Bueno' ? 'bg-green-400' : 'bg-amber-400'}`} style={{ width: analysis.health === 'Bueno' ? '90%' : '60%' }} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-[10px] text-white/40 uppercase mb-1 tracking-widest">Riesgo de Anomalías</p>
                        <p className="text-sm font-bold text-white/90">{analysis.parasite_risk}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase mb-1 tracking-widest">Est. Cantidad/Volumen</p>
                        <p className="text-sm font-bold text-white/90">{analysis.weight_est}</p>
                      </div>
                    </div>

                    <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                      <p className="text-[10px] text-secondary uppercase mb-2 tracking-widest flex items-center gap-2">
                        <ShieldCheck size={12} />
                        RECOMENDACIÓN IA
                      </p>
                      <p className="text-xs text-white/70 leading-relaxed italic">
                        "{analysis.recommendation}"
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <Eye className="text-white/10 mb-4" size={60} />
                    <p className="text-white/30 text-xs uppercase tracking-widest">Esperando flujo de datos...</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Confianza</p>
              <p className="text-xl font-mono font-bold text-slate-900">97.8%</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Latencia</p>
              <p className="text-xl font-mono font-bold text-slate-900">42ms</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
