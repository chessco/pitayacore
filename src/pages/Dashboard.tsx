import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  Bot, 
  MessageSquare, 
  UserCheck, 
  Share2, 
  AlertTriangle,
  History,
  CheckCircle2,
  FileEdit,
  TrendingUp,
  Circle
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

const data = [
  { name: 'LUN', auto: 85, hitl: 15 },
  { name: 'MAR', auto: 90, hitl: 10 },
  { name: 'MIE', auto: 80, hitl: 20 },
  { name: 'JUE', auto: 95, hitl: 5 },
  { name: 'VIE', auto: 88, hitl: 12 },
  { name: 'SAB', auto: 92, hitl: 8 },
  { name: 'DOM', auto: 85, hitl: 15 },
];

const activity = [
  { id: 1, type: 'ai', user: 'IA PitayaCore', action: 'resolvió consulta técnica', tenant: 'OceanPulse', time: '14:22', detail: '"Los niveles de salinidad recomendados para la etapa 2 son..."', icon: Bot, color: 'text-blue-600 bg-blue-100' },
  { id: 2, type: 'human', user: 'Admin Carlos', action: 'intervino en chat', tenant: 'AquaTech', time: '13:58', icon: UserCheck, color: 'text-purple-600 bg-purple-100' },
  { id: 3, type: 'skill', user: "Habilidad 'Soporte'", action: 'actualizada', tenant: 'Sistema', time: '12:30', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-100' },
  { id: 4, type: 'kb', user: 'Dra. Elena', action: 'creó nueva entrada en Base de Conocimiento', tenant: 'Global Bio', time: '11:15', icon: FileEdit, color: 'text-amber-600 bg-amber-100' },
];

const alerts = [
  { id: 1, title: 'Sentimiento Negativo Detectado', tenant: 'AquaTech Sur', desc: 'El usuario reportó falla crítica en sensor O2.', time: 'Hace 2 min', type: 'error' },
  { id: 2, title: 'Baja Confianza de IA (HITL)', tenant: 'BioMar Global', desc: 'Pregunta sobre protocolos de bioseguridad fase 4.', time: 'Hace 15 min', type: 'warning' },
  { id: 3, title: 'Escalado Manual Solicitado', tenant: 'Piscicultura Andes', desc: 'Usuario solicitó hablar con un supervisor.', time: 'Hace 42 min', type: 'error' },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 font-display">Bienvenido al Panel Control</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-sm font-medium text-emerald-500">Estado del sistema: Todos los sistemas operativos</p>
          </div>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2 text-slate-700 font-medium text-sm">
          <History size={16} className="text-slate-400" />
          Últimos 7 días
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          icon={<Bot size={20} />} 
          title="Tasa de Automatización IA" 
          value="94.2%" 
          trend="+2.4%" 
          trendColor="text-emerald-600 bg-emerald-50"
          progress={94}
          iconColor="bg-blue-50 text-blue-600"
        />
        <KPICard 
          icon={<MessageSquare size={20} />} 
          title="Conversaciones Activas" 
          value="1,284" 
          label="En Vivo"
          labelColor="text-orange-600 bg-orange-50"
          subValue="Promedio: 4.2 min / sesión"
          iconColor="bg-orange-50 text-orange-600"
        />
        <KPICard 
          icon={<UserCheck size={20} />} 
          title="Revisiones Pendientes" 
          value="28" 
          label="HITL"
          labelColor="text-slate-400 bg-slate-50"
          subValue="Requieren intervención humana"
          iconColor="bg-purple-50 text-purple-600"
        />
        <KPICard 
          icon={<Share2 size={20} />} 
          title="Uso por Inquilino" 
          value="12 / 15" 
          label="Activos"
          labelColor="text-blue-600 bg-blue-50"
          avatars={3}
          iconColor="bg-slate-50 text-slate-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Alerts & Chart */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2 font-display">
                <AlertTriangle size={18} className="text-error" />
                Alertas y Conversaciones Marcadas
              </h3>
              <button className="text-primary text-xs font-bold hover:underline">Ver todas</button>
            </div>
            <div className="divide-y divide-slate-100">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-4">
                  <div className={cn(
                    "w-1.5 h-12 rounded-full shrink-0 mt-1",
                    alert.type === 'error' ? "bg-error" : "bg-secondary-container"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-semibold text-slate-900">{alert.title}</h4>
                      <span className="text-xs text-slate-400">{alert.time}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5 truncate">
                      Inquilino: <span className="font-medium text-slate-900">{alert.tenant}</span> • {alert.desc}
                    </p>
                    <div className="flex gap-2 mt-2">
                       <button className="text-[10px] bg-slate-100 px-2 py-1 rounded font-bold uppercase text-slate-600 hover:bg-slate-200">Revisar Log</button>
                       <button className="text-[10px] bg-primary/10 px-2 py-1 rounded font-bold uppercase text-primary hover:bg-primary/20">Intervenir</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-lg text-slate-900 font-display">Volumen de Conversaciones</h3>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <Circle size={8} fill="currentColor" className="text-primary" />
                  Automatizado
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <Circle size={8} fill="currentColor" className="text-slate-300" />
                  HITL
                </div>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="auto" fill="#0055c7" radius={[4, 4, 0, 0]} barSize={40} />
                  <Bar dataKey="hitl" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Right: Activity Feed */}
        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-full">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-900 font-display">Actividad Reciente</h3>
            </div>
            <div className="p-6 space-y-6 relative flex-1">
              <div className="absolute left-10 top-6 bottom-6 w-px bg-slate-100" />
              {activity.map((item) => (
                <div key={item.id} className="flex gap-4 relative">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10",
                    item.color
                  )}>
                    <item.icon size={16} />
                  </div>
                  <div className="pb-2 flex-1">
                    <p className="text-sm text-slate-900 leading-tight">
                      <span className="font-bold">{item.user}</span> {item.action}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-wider">
                      Inquilino: {item.tenant} • {item.time}
                    </p>
                    {item.detail && (
                      <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100 italic text-xs text-slate-600">
                        {item.detail}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div className="text-center mt-4">
                <button className="text-xs font-bold text-slate-400 hover:text-primary transition-colors tracking-widest uppercase">
                  Cargar Más
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon, title, value, trend, trendColor, progress, label, labelColor, subValue, iconColor, avatars }: any) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow group relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-2 rounded-lg", iconColor)}>
          {icon}
        </div>
        {trend && <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full", trendColor)}>{trend}</span>}
        {label && <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider", labelColor)}>{label}</span>}
      </div>
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-none">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900 mt-2 font-display">{value}</h3>
      {progress !== undefined && (
        <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${progress}%` }} />
        </div>
      )}
      {subValue && (
        <p className="text-[11px] text-slate-400 mt-2 font-medium">{subValue}</p>
      )}
      {avatars && (
        <div className="mt-4 flex -space-x-2">
          {[...Array(avatars)].map((_, i) => (
            <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden">
               <img src={`https://i.pravatar.cc/100?img=${10+i}`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
          ))}
          <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">+9</div>
        </div>
      )}
    </div>
  );
}
