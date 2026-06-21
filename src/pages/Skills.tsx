import React from 'react';
import { 
  PlusCircle, 
  ArrowUp, 
  Thermometer, 
  Leaf, 
  HeartPulse, 
  Scale, 
  Settings2, 
  Play, 
  Edit, 
  Send,
  Activity,
  History,
  TrendingUp,
  Cpu,
  ShieldCheck,
  Zap,
  LayoutGrid
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';

const agentSkills = [
  { id: 1, name: 'Monitor Térmico', version: 'v2.4.1', desc: 'Ajuste automático de sistemas de calefacción basado en predicciones de oxígeno.', status: 'activo', success: '99.2%', latency: '145ms', icon: Thermometer, color: 'text-blue-600 bg-blue-50' },
  { id: 2, name: 'Optimizador de Dieta', version: 'v3.1.0', desc: 'Cálculo de raciones precisas según biomasa y comportamiento de nado.', status: 'activo', success: '97.8%', latency: '410ms', icon: Scale, color: 'text-amber-600 bg-amber-50' },
  { id: 3, name: 'Analista Sanitario', version: 'v1.9.5-rc', desc: 'Detección temprana de patologías mediante análisis de imagen por visión computacional.', status: 'pruebas', success: '88.4%', latency: '890ms', icon: HeartPulse, color: 'text-purple-600 bg-purple-50' },
  { id: 4, name: 'Gestor de Residuos', version: 'v2.0.2', desc: 'Coordinación de purificadores y sistemas de filtrado por niveles de nitritos.', status: 'activo', success: '99.9%', latency: '98ms', icon: Leaf, color: 'text-emerald-600 bg-emerald-50' },
];

export default function Skills() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 font-display">Gestor de Habilidades</h2>
          <p className="text-base text-slate-500 max-w-2xl mt-2 font-medium">Configura y supervisa los agentes de IA encargados de la optimización del ecosistema acuícola.</p>
        </div>
        <button className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-wide">
          <PlusCircle size={20} />
          Crear nueva habilidad
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
         <StatsCard label="Habilidades Activas" value="12" sub="+2" subColor="text-emerald-600" />
         <StatsCard label="Éxito Global" value="98.4%" sub="Optimo" subColor="text-blue-500" />
         <StatsCard label="Latencia Media" value="320ms" sub="-12ms" subColor="text-slate-400" />
         <div className="bg-primary p-6 rounded-2xl shadow-xl shadow-primary/20 flex flex-col justify-between text-white relative overflow-hidden group">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-80">Despliegues Hoy</span>
            <div className="flex items-end gap-2 mt-2">
               <span className="text-4xl font-black font-display tracking-tight">5</span>
               <span className="text-xs font-bold mb-1 opacity-80">Sin errores</span>
            </div>
            <Activity className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 group-hover:scale-110 transition-transform duration-500" />
         </div>
      </div>

      {/* Skill Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agentSkills.map((agent) => (
          <div key={agent.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                   <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-sm", agent.color)}>
                      <agent.icon size={24} />
                   </div>
                   <div>
                      <h3 className="font-bold text-slate-900 font-display leading-none">{agent.name}</h3>
                      <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold mt-1.5 inline-block">{agent.version}</span>
                   </div>
                </div>
                <div className="flex items-center gap-1.5">
                   <div className={cn(
                     "w-2 h-2 rounded-full",
                     agent.status === 'activo' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                   )} />
                   <span className={cn(
                     "text-[10px] font-black uppercase tracking-wider",
                     agent.status === 'activo' ? "text-green-700" : "text-amber-700"
                   )}>{agent.status === 'activo' ? 'Activo' : 'En Pruebas'}</span>
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed font-medium">{agent.desc}</p>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <StatItem label="ÉXITO" value={agent.success} />
                  <StatItem label="LATENCIA" value={agent.latency} />
                </div>
              </div>
            </div>
            <div className="bg-slate-50 border-t border-slate-100 p-3 flex gap-2">
               <button className="flex-1 text-xs font-black text-slate-600 bg-white border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 uppercase tracking-wide">
                 <Edit size={14} /> Editar Prompts
               </button>
               <button className="flex-1 text-xs font-black text-primary bg-blue-50 border border-blue-100 py-2.5 rounded-xl hover:bg-blue-100 transition-all flex items-center justify-center gap-2 uppercase tracking-wide">
                 <Send size={14} /> Desplegar
               </button>
            </div>
          </div>
        ))}

        {/* Empty Placeholder Card */}
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 text-slate-400 hover:border-primary/40 hover:bg-blue-50/20 transition-all cursor-pointer group">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-4 transition-transform group-hover:scale-110">
            <PlusCircle size={32} className="text-slate-300 group-hover:text-primary transition-colors" />
          </div>
          <span className="font-bold text-sm uppercase tracking-widest text-slate-500">Nueva Habilidad</span>
        </div>
      </div>

      {/* Suggestion Banner */}
      <div className="mt-12 bg-slate-900 rounded-3xl p-10 flex flex-col lg:flex-row items-center gap-10 relative overflow-hidden group">
         <div className="relative z-10 flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
               <Zap size={10} fill="currentColor" /> Feature Highlight
            </div>
            <h3 className="text-2xl font-bold text-white font-display">Optimización Automática de Prompts</h3>
            <p className="text-slate-400 max-w-xl text-base font-medium leading-relaxed italic">
              PitayaCore AI utiliza aprendizaje federado para refinar las instrucciones de tus agentes basándose en resultados operativos reales.
            </p>
            <div className="flex gap-4 pt-4">
               <button className="bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5">Activar Auto-Tuning</button>
               <button className="text-white border border-white/20 px-6 py-3 rounded-xl font-black text-sm hover:bg-white/10 transition-all shadow-xl">Ver Documentación</button>
            </div>
         </div>
         
         <div className="relative z-10 w-full lg:w-96">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl ring-1 ring-white/5">
               <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-blue-500 rounded-lg shadow-lg shadow-blue-500/20">
                     <Settings2 size={16} className="text-white" />
                  </div>
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">AI Insight</span>
               </div>
               <p className="text-sm text-slate-300 italic font-medium leading-relaxed">
                 "Detectada ineficiencia en latencia para <span className="text-white font-bold underline underline-offset-4 decoration-primary">Optimizador de Dieta</span>. Reducir tokens de contexto en el prompt principal podría ahorrar 120ms."
               </p>
               <button className="mt-4 w-full py-2 text-[10px] font-black text-white bg-white/10 hover:bg-white/20 rounded-lg transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                 Aplicar Optimización <Zap size={10} fill="currentColor" />
               </button>
            </div>
         </div>

         <div className="absolute right-0 top-0 w-2/3 h-full bg-gradient-to-l from-blue-600/10 via-transparent to-transparent pointer-events-none group-hover:opacity-80 transition-opacity" />
         <LayoutGrid className="absolute -left-10 -bottom-10 w-64 h-64 text-white/5 rotate-12" />
      </div>
    </div>
  );
}

function StatsCard({ label, value, sub, subColor }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-1 ring-1 ring-black/[0.01]">
       <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{label}</span>
       <div className="flex items-end gap-3 mt-2">
          <span className="text-4xl font-black font-display text-slate-900 tracking-tight leading-none">{value}</span>
          <span className={cn("text-xs font-black mb-1 flex items-center tracking-wide uppercase", subColor)}>
            {sub.includes('+') && <ArrowUp size={12} className="mr-0.5" />}
            {sub}
          </span>
       </div>
    </div>
  );
}

function StatItem({ label, value }: any) {
  return (
    <div className="space-y-1">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{label}</span>
      <span className="text-base font-black text-slate-900 font-display">{value}</span>
    </div>
  );
}
