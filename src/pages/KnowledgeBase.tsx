import React from 'react';
import { 
  Plus, 
  Search, 
  Download, 
  ChevronRight, 
  MoreVertical, 
  History, 
  Tag, 
  FileText, 
  CheckCircle2, 
  Brain, 
  Clock, 
  ArrowRight,
  LayoutGrid,
  Filter,
  FileBadge
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';

const protocols = [
  { id: 1, title: 'Protocolo de Oxigenación de Emergencia', version: 'v2.4 - Manual Operativo', type: 'Protocolo', status: 'Publicado', tags: ['Oxígeno', 'Bioseguridad'], time: 'Hace 2 horas', typeColor: 'bg-blue-50 text-blue-700 border-blue-100', statusColor: 'bg-emerald-500' },
  { id: 2, title: 'Guía de Alimentación Fase Juvenil', version: 'v1.0 - Respuesta Validada', type: 'Validada', status: 'Borrador', tags: ['Alimentación'], time: 'Ayer, 14:30', typeColor: 'bg-amber-50 text-amber-700 border-amber-100', statusColor: 'bg-slate-300' },
  { id: 3, title: 'Corrección: Sensor pH Piscina B3', version: 'v1.2 - Ajuste de Sistema', type: 'Corrección', status: 'Publicado', tags: ['Mantenimiento'], time: '12 Oct 2023', typeColor: 'bg-purple-50 text-purple-700 border-purple-100', statusColor: 'bg-emerald-500' },
];

const categories = [
  { name: 'Bioseguridad', count: 12, active: true },
  { name: 'Alimentación', count: 8 },
  { name: 'Oxígeno', count: 15 },
  { name: 'Sensores', count: 5 },
  { name: 'Salud Animal', count: 9 },
  { name: 'Estructuras', count: 3 },
];

export default function KnowledgeBase() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em]">
            <span className="hover:text-primary cursor-pointer transition-colors">PitayaCore AI</span>
            <ChevronRight size={10} />
            <span className="text-slate-600">Base de Conocimientos</span>
          </nav>
          <h2 className="text-3xl font-bold text-slate-900 font-display">Base de Conocimientos</h2>
          <p className="text-base text-slate-500 mt-1 font-medium italic leading-relaxed">Gestiona protocolos operativos y respuestas validadas del sistema.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-sm group">
            <Download size={16} className="text-slate-400 group-hover:text-primary transition-colors" />
            Exportar
          </button>
          <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 uppercase tracking-wide">
            <Plus size={20} />
            Crear Documento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Main List */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-2">
                <FilterButton label="Todos" active />
                <FilterButton label="Protocolos" />
                <FilterButton label="Respuestas" />
                <FilterButton label="Correcciones" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Ordenar:</span>
                <select className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 cursor-pointer p-0 underline decoration-slate-200 underline-offset-4">
                  <option>Más reciente</option>
                  <option>Nombre (A-Z)</option>
                  <option>Estado</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-300/[0.1] border-b border-slate-100 italic">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Título</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tipo</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estado</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Etiquetas</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actualizado</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {protocols.map((doc) => (
                    <tr key={doc.id} className="hover:bg-blue-50/30 transition-all group cursor-pointer">
                      <td className="px-6 py-5 min-w-[200px]">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 leading-tight group-hover:text-primary transition-colors">{doc.title}</span>
                          <span className="text-[11px] text-slate-400 font-medium mt-1 uppercase tracking-tight">{doc.version}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border", doc.typeColor)}>
                          {doc.type}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1.5 font-bold uppercase tracking-tighter text-slate-700">
                          <span className={cn("w-2 h-2 rounded-full", doc.statusColor, doc.status === 'Publicado' && "shadow-[0_0_8px_rgba(16,185,129,0.5)]")} />
                          <span className="text-[11px]">{doc.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1">
                          {doc.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-500 rounded-md ring-1 ring-slate-200">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-[11px] text-slate-500 font-bold tracking-tight">
                        {doc.time}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                          <button className="p-2 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-white" title="Historial">
                            <History size={16} />
                          </button>
                          <button className="p-2 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-white">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Mostrando 1-3 de 48 documentos</span>
              <div className="flex items-center gap-1">
                <PaginationButton label={<ChevronRight size={14} className="rotate-180" />} />
                <PaginationButton label="1" active />
                <PaginationButton label="2" />
                <PaginationButton label="3" />
                <PaginationButton label={<ChevronRight size={14} />} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SummarySmallCard icon={<FileText size={20} />} value="48" label="DOCUMENTOS" color="bg-blue-50 text-blue-600" />
            <SummarySmallCard icon={<CheckCircle2 size={20} />} value="32" label="PUBLICADOS" color="bg-emerald-50 text-emerald-600" />
            <SummarySmallCard icon={<History size={20} />} value="14" label="VERSIONES" color="bg-amber-50 text-amber-600" />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative group overflow-hidden">
             <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Tag size={20} />
               </div>
               <h3 className="text-sm font-bold text-slate-900 font-display">Categorías Populares</h3>
             </div>
             <div className="flex flex-wrap gap-2">
               {categories.map(cat => (
                 <button 
                   key={cat.name} 
                   className={cn(
                     "px-3 py-1.5 text-[11px] font-bold rounded-xl border transition-all hover:scale-105",
                     cat.active ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                   )}
                 >
                   {cat.name} ({cat.count})
                 </button>
               ))}
             </div>
             <button className="w-full mt-6 py-3 text-[10px] font-black text-slate-400 hover:text-primary transition-all uppercase tracking-[0.2em] border-t border-slate-100 pt-6 flex items-center justify-center gap-2 group-hover:gap-4 transition-all">
               Ver todas las etiquetas <ArrowRight size={12} />
             </button>
             <LayoutGrid className="absolute -right-8 -bottom-8 w-24 h-24 text-slate-500/5 group-hover:scale-110 transition-transform duration-500" />
          </div>

          <div className="bg-primary p-8 rounded-3xl text-white relative group overflow-hidden shadow-2xl shadow-primary/20">
            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center mb-2 animate-bounce-slow">
                 <Brain size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold font-display">Asistente AI</h3>
              <p className="text-white/80 text-sm leading-relaxed font-medium">
                ¿Necesitas ayuda redactando un nuevo protocolo? Mi IA puede generar borradores basados en datos históricos operativos.
              </p>
              <button className="w-full py-3.5 bg-white text-primary font-black text-xs rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2 uppercase tracking-widest mt-2 overflow-hidden relative group">
                  <motion.span initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                    Generar Borrador
                  </motion.span>
                  <ArrowRight size={16} />
              </button>
            </div>
            <LayoutGrid className="absolute -bottom-10 -right-10 text-white/10 w-48 h-48 group-hover:scale-110 transition-transform duration-700" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden relative group">
            <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2 font-display">
              <Clock size={16} className="text-amber-500" />
              Actividad Reciente
            </h3>
            <div className="space-y-6 relative">
              <div className="absolute left-4 top-4 bottom-4 w-px bg-slate-100" />
              <RecentActivityItem initial="CM" user="Carlos M." action="editó" target='"Protocolo de Oxigenación"' time="Hace 15 min" />
              <RecentActivityItem icon={<CheckCircle2 size={12} className="text-emerald-500" />} user="Sensor pH" action="ha sido" target="Validado" time="Hace 2 horas" />
              <RecentActivityItem initial="ER" user="Elena R." action="creó" target='"Dieta Juvenil"' time="Hace 5 horas" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterButton({ label, active }: any) {
  return (
    <button className={cn(
      "px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm ring-1 ring-inset",
      active ? "bg-white text-primary ring-slate-200 shadow-lg shadow-black/[0.02]" : "bg-transparent text-slate-500 ring-transparent hover:bg-white hover:ring-slate-100"
    )}>
      {label}
    </button>
  );
}

function PaginationButton({ label, active }: any) {
  return (
    <button className={cn(
      "w-9 h-9 flex items-center justify-center text-xs font-bold rounded-xl transition-all",
      active ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
    )}>
      {label}
    </button>
  );
}

function SummarySmallCard({ icon, value, label, color }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4 transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm", color)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900 font-display leading-none">{value}</p>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 text-[8px] sm:text-[10px]">{label}</p>
      </div>
    </div>
  );
}

function RecentActivityItem({ initial, icon, user, action, target, time }: any) {
  return (
    <div className="flex items-start gap-4 relative z-10">
      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center ring-1 ring-slate-200 shrink-0">
        {initial ? <span className="text-[10px] font-black text-slate-400 uppercase">{initial}</span> : icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-800 leading-tight font-medium italic">
          <strong className="not-italic text-slate-900 font-bold">{user}</strong> {action} <span className="text-primary font-bold not-italic">{target}</span>
        </p>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{time}</p>
      </div>
    </div>
  );
}
