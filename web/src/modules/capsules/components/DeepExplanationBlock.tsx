import React from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, Target, Activity, ShieldCheck, TrendingUp, 
  Lightbulb, ChevronRight, Layers, BarChart3, 
  ArrowUpRight, Globe, Zap, Beaker
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DeepExplanationProps {
  data: {
    title: string;
    subtitle: string;
    description: string;
    levels: Array<{
      title: string;
      subtitle?: string;
      content: string;
      result?: string;
      tags?: string[];
    }>;
    application: string;
    business_impact: string;
    differentiation: string;
    superiority_title?: string;
    superiority_item_title?: string;
    strategic_impacts?: Array<{ title: string; description: string }>;
  };
}

const ParsedContent: React.FC<{ content: string; variant?: 'light' | 'dark' }> = ({ content, variant = 'dark' }) => {
  if (!content) return null;

  const isDark = variant === 'dark';
  const titleColor = isDark ? 'text-blue-400' : 'text-blue-600';
  const bodyColor = isDark ? 'text-blue-100/90' : 'text-slate-500';
  const bulletColor = isDark ? 'bg-blue-400' : 'bg-blue-600';

  return (
    <div className="markdown-content">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className={`${titleColor} text-3xl font-black mb-4 tracking-tighter`}>{children}</h1>,
          h2: ({ children }) => <h2 className={`${titleColor} text-2xl font-black mb-3 tracking-tight`}>{children}</h2>,
          h3: ({ children }) => <h3 className={`${titleColor} text-xl font-black mb-3 tracking-tight`}>{children}</h3>,
          h4: ({ children }) => <h4 className={`${titleColor} text-lg font-black mb-2`}>{children}</h4>,
          h5: ({ children }) => <h5 className={`${titleColor} font-black text-xs uppercase tracking-[0.2em] pt-4 mb-2`}>{children}</h5>,
          p: ({ children }) => <p className={`${bodyColor} text-lg font-medium leading-relaxed mb-4 last:mb-0`}>{children}</p>,
          ul: ({ children }) => <ul className="space-y-3 my-6">{children}</ul>,
          li: ({ children }) => (
            <li className="flex items-start gap-3">
              <div className={`mt-2.5 w-1.5 h-1.5 ${bulletColor} rounded-full shrink-0`} />
              <span className={`${bodyColor} text-lg font-medium leading-relaxed`}>{children}</span>
            </li>
          ),
          strong: ({ children }) => <strong className="font-black text-blue-500">{children}</strong>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export const DeepExplanationBlock: React.FC<DeepExplanationProps> = ({ data }) => {
  if (!data) return null;

  return (
    <section className="py-12 px-6 bg-[#FDFDFF] overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Superiority Highlights Section - Now at the Top */}
        <div className="mb-20 space-y-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-1.5 bg-blue-600 rounded-full" />
            <h3 className="text-sm font-black text-[#001A41] uppercase tracking-[0.3em]">
              {data.superiority_title || "Por qué esta solución es superior"}
            </h3>
          </div>
          
          <div className="grid grid-cols-1">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-6 md:p-12 bg-[#001A41] rounded-[2rem] md:rounded-[3.5rem] text-white flex flex-col md:flex-row gap-10 items-center group relative overflow-hidden shadow-3xl shadow-blue-900/20"
            >
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 blur-[120px] opacity-20 -mr-48 -mt-48" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600 blur-[100px] opacity-10 -ml-32 -mb-32" />
              
              <div className="w-20 h-20 shrink-0 bg-white/10 rounded-[1.5rem] flex items-center justify-center transition-transform group-hover:rotate-12 backdrop-blur-md border border-white/10">
                <Lightbulb size={36} className="text-blue-300" />
              </div>
              
              <div className="space-y-4 relative flex-1 text-center md:text-left">
                <h4 className="font-black text-blue-200 text-sm uppercase tracking-[0.3em]">
                  {data.superiority_item_title || "Diferenciación Técnica"}
                </h4>
                <div className="mt-2">
                  <ParsedContent content={data.differentiation} />
                </div>
              </div>
              
              <div className="hidden lg:block relative pr-10">
                <div className="px-6 py-3 bg-white/5 rounded-full border border-white/10 backdrop-blur-sm text-[10px] font-black uppercase tracking-widest text-blue-200">
                  Ciencia Exclusiva PitayaCore
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-20">
          {/* Left Column: Conceptual Overview */}
          <div className="lg:col-span-5 space-y-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-[11px] font-black uppercase tracking-widest border border-blue-100/50 shadow-sm">
                <Beaker size={14} className="animate-pulse" /> Protocolo de Alta Precisión
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-[#001A41] leading-[1.1] tracking-tight">
                {data.title || "Ciencia aplicada a la rentabilidad acuícola"}
              </h2>
              <p className="text-xl font-semibold text-blue-600/90 leading-relaxed max-w-md">
                {data.subtitle || "No es solo un producto, es un sistema de optimización biológica."}
              </p>
              <div className="w-20 h-1.5 bg-blue-600 rounded-full" />
              <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-lg">
                {data.description || "Nuestro enfoque integra nutrición funcional y estabilidad ecosistémica para maximizar el potencial genético de tu cultivo."}
              </p>
            </motion.div>
            </div>

          {/* Right Column: Multi-Level Explanation - Vertical Timeline Style */}
          <div className="lg:col-span-7 space-y-12">
            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                  <Layers size={16} className="text-blue-600" /> Capas de Valor PitayaCore
                </h3>
                <span className="text-[10px] font-bold text-slate-400 px-3 py-1 bg-slate-50 rounded-full">3 NIVELES DE IMPACTO</span>
              </div>
              
              <div className="space-y-8 relative">
                <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-blue-600 via-blue-200 to-transparent ml-[-0.5px]" />
                
                {(data.levels || [
                  { 
                    title: "Nutrición Funcional", 
                    content: "Inmunomodulación a través de la dieta para reducir el impacto de patógenos y optimizar el FCR.",
                    tags: ["Inmunidad", "FCR"]
                  },
                  { 
                    title: "Fortalecimiento Metabólico", 
                    content: "Optimización de procesos enzimáticos para maximizar el potencial genético de crecimiento.",
                    tags: ["Crecimiento", "Energía"]
                  },
                  { 
                    title: "Estabilidad Ecosistémica", 
                    content: "Control de estresores ambientales mediante monitoreo constante y ajustes dinámicos.",
                    tags: ["Entorno", "Vigor"]
                  }
                ]).map((level, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 }}
                    className="relative pl-16 group"
                  >
                    {/* Circle Indicator */}
                    <div className="absolute left-0 top-1.5 w-12 h-12 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center z-10 group-hover:border-blue-600 group-hover:shadow-lg group-hover:shadow-blue-600/20 transition-all duration-500">
                      <span className="text-sm font-black text-[#001A41] group-hover:text-blue-600">{i + 1}</span>
                    </div>

                    <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] group-hover:border-blue-100 group-hover:shadow-2xl group-hover:shadow-blue-900/5 transition-all duration-500">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <h4 className="text-2xl font-black text-[#001A41] group-hover:text-blue-600 transition-colors">
                            {level.title}
                          </h4>
                          <div className="flex items-center gap-2">
                            <Zap size={12} className="text-yellow-500 fill-yellow-500" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{level.subtitle || "Optimización Dinámica"}</span>
                          </div>
                        </div>
                        <div className="w-14 h-14 bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white rounded-2xl flex items-center justify-center transition-all duration-500 transform group-hover:rotate-6 shadow-sm">
                          {i === 0 ? <Activity size={28} /> : i === 1 ? <ShieldCheck size={28} /> : <TrendingUp size={28} />}
                        </div>
                      </div>
                      <div className="mb-4">
                        <ParsedContent content={level.content} variant="light" />
                      </div>
                      <div className="pt-4 border-t border-slate-50 flex flex-wrap gap-3">
                        {(level.tags || ["PitayaCore Pro", "Optimización"]).map((tag, idx) => (
                          <div key={idx} className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100/50 shadow-sm">
                            {tag}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Impact Section - Full Width Wide */}
      <div className="mt-10 px-6">
        <div className="max-w-[1600px] mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden p-8 md:p-24 bg-gradient-to-br from-[#001A41] to-[#002868] rounded-[2rem] md:rounded-[4rem] text-white shadow-3xl shadow-blue-900/40"
          >
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-400 blur-[150px] opacity-20 -mr-72 -mt-72" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600 blur-[150px] opacity-10" />
            <div className="relative">
              {/* Decorative Background Pattern */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>

              <div className="flex flex-col gap-16 relative">
                {/* Row 1: Massive Full-Width Title */}
                <div className="w-full space-y-10">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-[2rem] flex items-center justify-center border border-white/10 shadow-inner">
                      <BarChart3 className="text-blue-300" size={32} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-black text-2xl uppercase tracking-[0.3em] text-blue-200">Impacto Estratégico</h4>
                      <div className="w-12 h-1 bg-blue-500 rounded-full" />
                    </div>
                  </div>

                  <h3 className="text-3xl md:text-[5rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-blue-200/40 leading-[1.1] tracking-tight w-full">
                    {data.title ? `Impacto de ${data.title}` : "Transformando variables biológicas en rentabilidad neta"}
                  </h3>
                </div>

                {/* Row 2: Description and Stats Side by Side */}
                <div className="flex flex-col lg:flex-row gap-16 items-start">
                  <div className="flex-1">
                    <div className="max-w-3xl text-2xl leading-relaxed">
                      <ParsedContent content={data.business_impact} />
                    </div>
                  </div>

                  {/* Floating High-Impact Stats */}
                  <div className="lg:w-96 shrink-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
                    <motion.div 
                      initial={{ opacity: 0, x: 30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      className="p-8 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden group hover:border-blue-400/30 transition-colors"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 blur-3xl opacity-20 -mr-12 -mt-12" />
                      <div className="relative space-y-3">
                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Rentabilidad Bruta</div>
                        <div className="flex items-center gap-4">
                          <span className="text-5xl font-black text-white">+12%</span>
                          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} whileInView={{ width: "85%" }} className="h-full bg-blue-500" />
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, x: 30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="p-8 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden group hover:border-green-400/30 transition-colors"
                    >
                      <div className="absolute bottom-0 right-0 w-24 h-24 bg-green-500 blur-3xl opacity-20 -mr-12 -mb-12" />
                      <div className="relative space-y-3">
                        <div className="text-[10px] font-black text-green-400 uppercase tracking-widest">Eficiencia Alimenticia</div>
                        <div className="flex items-center gap-4">
                          <span className="text-5xl font-black text-white">-15%</span>
                          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} whileInView={{ width: "92%" }} className="h-full bg-green-500" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategic Pillars Grid - Bottom Row */}
            <div className="mt-16 md:mt-24 pt-16 border-t border-white/10 relative">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                {(data.strategic_impacts || [
                  { title: "Optimización del FCA", description: "Mejora en la conversión alimenticia y reducción de desperdicio por kilo producido." },
                  { title: "Aceleración de Ciclos", description: "Crecimiento uniforme y aprovechamiento metabólico para cosechas más rápidas." },
                  { title: "Mitigación de Riesgos", description: "Estabilidad del sistema inmunológico y reducción de la incertidumbre operativa." },
                  { title: "Previsibilidad Neta", description: "Planificación financiera precisa basada en modelos de datos biológicos." }
                ]).map((impact, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="space-y-5 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 border border-white/5 text-blue-400 shadow-lg">
                        {i === 0 ? <TrendingUp size={20} /> : i === 1 ? <Zap size={20} /> : i === 2 ? <ShieldCheck size={20} /> : <Target size={20} />}
                      </div>
                      <h5 className="font-black text-[11px] uppercase tracking-[0.2em] leading-tight text-blue-100/90">{impact.title}</h5>
                    </div>
                    <p className="text-blue-100/40 text-sm font-medium leading-relaxed">
                      {impact.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
