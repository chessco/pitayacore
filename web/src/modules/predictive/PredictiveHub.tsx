import { useState } from 'react';
import axios from 'axios';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  Zap, 
  Database,
  RefreshCw,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTenant } from '../../contexts/TenantContext';

// Sample data for forecasting
const forecastData = [
  { time: '08:00', oxygen: 8.2, temp: 28.1, biomass: 1200, prediction: 1200 },
  { time: '10:00', oxygen: 7.9, temp: 28.3, biomass: 1205, prediction: 1205 },
  { time: '12:00', oxygen: 7.5, temp: 28.8, biomass: 1210, prediction: 1210 },
  { time: '14:00', oxygen: 7.2, temp: 29.2, biomass: 1215, prediction: 1215 },
  { time: '16:00', oxygen: 7.0, temp: 29.4, biomass: null, prediction: 1220 },
  { time: '18:00', oxygen: 6.8, temp: 29.1, biomass: null, prediction: 1225 },
  { time: '20:00', oxygen: 6.5, temp: 28.9, biomass: null, prediction: 1230 },
  { time: '22:00', oxygen: 6.4, temp: 28.7, biomass: null, prediction: 1228 },
];

export function PredictiveHub() {
  const { flowApiKey, selectedTenant } = useTenant();
  const [analyzing, setAnalyzing] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const tenantId = selectedTenant?.id || 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718';
      const response = await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:3014') + '/api/ai/predictive/insight', {
        sensors: forecastData.filter(d => d.biomass !== null)
      }, {
        headers: { 
          'x-tenant-id': tenantId,
          'x-api-key': flowApiKey
        }
      });
      setInsight(response.data.insight);
    } catch (error) {
      console.warn('API Insight failed, using fallback:', error);
      // Fallback mock
      setTimeout(() => {
        setInsight("Basado en la tendencia de las últimas 6 horas, se observa una fluctuación en los sensores de rendimiento de la línea principal coincidiendo con el aumento de temperatura del sistema. \n\nRECOMENDACIONES:\n1. Ajustar el sistema de enfriamiento en el Sector 04-B de inmediato.\n2. Reducir la tasa de carga de procesamiento en un 15% para los próximos ciclos.\n3. Monitorear los niveles de consumo de energía en 4 horas.");
        setAnalyzing(false);
      }, 1000);
      return;
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="px-3 py-1 bg-brand-blue/10 text-brand-blue rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-blue/20">
               Nivel: Proyección Pro
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Sincronizado
            </div>
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3 font-display">
            Hub Predictivo
          </h1>
          <p className="text-slate-500 mt-2 max-w-2xl text-sm leading-relaxed">
            Nuestra IA analiza tendencias de sensores en tiempo real para predecir anomalías operativas y optimizar el rendimiento mediante modelos de aprendizaje automático.
          </p>
        </div>
        <button 
          onClick={runAnalysis}
          disabled={analyzing}
          className="flex items-center gap-3 bg-brand-blue text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-blue/30 hover:scale-105 transition-all disabled:opacity-50 active:scale-95"
        >
          {analyzing ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
          Generar Insight IA
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* Main Chart Card */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 p-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="font-black text-slate-800 flex items-center gap-3 text-lg uppercase tracking-tight">
                <div className="w-8 h-8 bg-brand-blue-light rounded-lg flex items-center justify-center text-brand-blue">
                  <TrendingUp size={18} />
                </div>
                Proyección de Rendimiento de Producción
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 ml-11">Intervalo: 24h | Confianza: 98.4%</p>
            </div>
            <div className="flex gap-4 p-1.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-600">
                <div className="w-2 h-2 rounded-full bg-brand-blue" /> Actual
              </span>
              <span className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <div className="w-2 h-2 rounded-full bg-slate-300" /> Predicho
              </span>
            </div>
          </div>
          
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="colorBiomass" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#377DFF" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#377DFF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} 
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} 
                  domain={['dataMin - 5', 'dataMax + 5']}
                  dx={-10}
                />
                <Tooltip 
                  cursor={{ stroke: '#377DFF', strokeWidth: 1, strokeDasharray: '4 4' }}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '16px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="prediction" 
                  stroke="#E2E8F0" 
                  fill="transparent" 
                  strokeWidth={2} 
                  strokeDasharray="8 8"
                  animationDuration={2000}
                />
                <Area 
                  type="monotone" 
                  dataKey="biomass" 
                  stroke="#377DFF" 
                  fillOpacity={1} 
                  fill="url(#colorBiomass)" 
                  strokeWidth={4}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insight & Risks Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div 
              key={insight ? 'insight' : 'empty'}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-deep rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl shadow-brand-deep/20"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-xl flex items-center gap-3 font-display">
                    <Brain className="text-brand-blue" />
                    IA Insight
                  </h3>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Sparkles size={16} className="text-brand-blue" />
                  </div>
                </div>
                
                {analyzing ? (
                  <div className="space-y-4 py-4">
                    <div className="h-3 bg-white/10 rounded-full animate-pulse w-3/4" />
                    <div className="h-3 bg-white/10 rounded-full animate-pulse w-full" />
                    <div className="h-3 bg-white/10 rounded-full animate-pulse w-5/6" />
                  </div>
                ) : insight ? (
                  <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {insight}
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-slate-400 text-xs italic">Haz clic en "Generar Insight IA" para procesar tendencias.</p>
                  </div>
                )}

                {insight && !analyzing && (
                  <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Confianza IA: 94%</span>
                    <button className="text-[10px] font-black text-brand-blue uppercase tracking-widest hover:underline">Aplicar Ajustes</button>
                  </div>
                )}
              </div>
              
              {/* Background design elements */}
              <div className="absolute top-[-40px] right-[-40px] w-64 h-64 bg-brand-blue/10 rounded-full blur-[80px]" />
              <div className="absolute bottom-[-40px] left-[-40px] w-48 h-48 bg-purple-500/10 rounded-full blur-[60px]" />
            </motion.div>
          </AnimatePresence>

          <div className="bg-rose-50 border border-rose-100 rounded-[32px] p-8 flex gap-5 relative overflow-hidden group">
            <div className="w-14 h-14 bg-rose-500 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-rose-500/30 group-hover:rotate-12 transition-transform">
              <AlertTriangle size={24} />
            </div>
            <div className="relative z-10">
              <h4 className="font-black text-rose-900 text-xs uppercase tracking-widest mb-2">Alerta de Riesgo Alto</h4>
              <p className="text-rose-800/80 text-xs leading-relaxed font-medium">
                Tendencia de <span className="font-bold text-rose-600 underline">Sobrecalentamiento/Desviación</span> detectada en la Línea de Producción 04-B. Riesgo crítico estimado en <span className="font-bold">15%</span> para las próximas 3 horas.
              </p>
            </div>
            <div className="absolute top-0 right-0 p-3">
               <ArrowUpRight size={14} className="text-rose-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Temperatura Opt.', value: '28.7°C', change: '+0.4', status: 'normal', icon: <TrendingUp className="text-slate-400" size={14} /> },
          { label: 'Riesgo Operativo', value: 'Bajo', change: 'Estable', status: 'success', icon: <ShieldCheck className="text-emerald-500" size={14} /> },
          { label: 'Eficiencia FCO', value: '1.24', change: '-2%', status: 'success', icon: <Target className="text-brand-blue" size={14} /> },
          { label: 'Tasa Rendimiento P.', value: '96.2%', change: '+0.2', status: 'success', icon: <Zap className="text-amber-500" size={14} /> }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">{stat.label}</p>
              <div className="p-1.5 bg-slate-50 rounded-lg">
                {stat.icon}
              </div>
            </div>
            <div className="flex items-end justify-between">
              <h4 className="text-2xl font-black text-slate-800 tracking-tight">{stat.value}</h4>
              <div className={`flex items-center gap-0.5 px-2 py-1 rounded-full text-[9px] font-black ${
                stat.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 
                stat.status === 'warning' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'
              }`}>
                {stat.change.startsWith('+') ? <ArrowUpRight size={10} /> : stat.change.startsWith('-') ? <ArrowDownRight size={10} /> : null}
                {stat.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Data History Table */}
      <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/50">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
              <Database size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Registro de Predicciones</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Últimas 24 Horas</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all">Ver Historial Completo</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-400 tracking-widest">ID Predicción</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-400 tracking-widest">Evento Detectado</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-400 tracking-widest">Confianza</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-400 tracking-widest">Estado</th>
                <th className="px-8 py-5 text-[10px] uppercase font-black text-slate-400 tracking-widest">Acción IA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[
                { id: 'PH-402', event: 'Disminución O2', confidence: 92, status: 'Resuelto', action: 'Aireación (+2h)' },
                { id: 'PH-401', event: 'Pico Térmico', confidence: 89, status: 'En Curso', action: 'Reducción Alimento' },
                { id: 'PH-399', event: 'Anomalía Biomasa', confidence: 99, status: 'Verificado', action: 'Ajuste Parámetros' }
              ].map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <span className="font-black text-xs text-slate-800">#{row.id}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-brand-blue" />
                       <span className="text-xs font-bold text-slate-600">{row.event}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="bg-brand-blue h-full rounded-full transition-all duration-1000" style={{ width: `${row.confidence}%` }} />
                      </div>
                      <span className="text-[10px] font-black text-slate-500 tracking-tighter">{row.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      row.status === 'Resuelto' ? 'bg-emerald-50 text-emerald-600' : 
                      row.status === 'En Curso' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/10 group-hover:scale-105 transition-transform inline-block cursor-pointer">
                      {row.action}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ShieldCheck({ className, size }: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function Sparkles({ className, size }: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

