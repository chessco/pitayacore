import React, { useState, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
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
  Info
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { motion } from 'motion/react';

// Sample data for forecasting
const forecastData = [
  { time: '08:00', oxygen: 8.2, temp: 15.1, biomass: 1200, prediction: 1200 },
  { time: '10:00', oxygen: 7.9, temp: 15.3, biomass: 1205, prediction: 1205 },
  { time: '12:00', oxygen: 7.5, temp: 15.8, biomass: 1210, prediction: 1210 },
  { time: '14:00', oxygen: 7.2, temp: 16.2, biomass: 1215, prediction: 1215 },
  { time: '16:00', oxygen: 7.0, temp: 16.4, biomass: null, prediction: 1220 },
  { time: '18:00', oxygen: 6.8, temp: 16.1, biomass: null, prediction: 1225 },
  { time: '20:00', oxygen: 6.5, temp: 15.9, biomass: null, prediction: 1230 },
  { time: '22:00', oxygen: 6.4, temp: 15.7, biomass: null, prediction: 1228 },
];

export default function PredictiveHub() {
  const [analyzing, setAnalyzing] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);

  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' }), []);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Actúa como un experto en analítica predictiva y optimización operativa industrial. Analiza estos datos: Tasa de flujo bajando de 8.2 a 6.4, Temperatura subiendo de 15.1 a 16.4. Predice el riesgo de desviación operativa y da 3 recomendaciones cortas. Responde en español y formato profesional.",
      });
      setInsight(response.text || "No se pudo generar el insight.");
    } catch (error) {
      console.error(error);
      setInsight("Error al conectar con el núcleo de IA.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Brain className="text-primary" size={40} />
            Hub Predictivo <span className="text-secondary text-base font-medium px-3 py-1 bg-secondary-container/30 rounded-full">Proyección Pro</span>
          </h1>
          <p className="text-slate-500 mt-2 max-w-2xl font-body">
            Algoritmos avanzados de aprendizaje automático analizan las tendencias de los sensores en tiempo real para predecir anomalías operativas antes de que ocurran.
          </p>
        </div>
        <button 
          onClick={runAnalysis}
          disabled={analyzing}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all disabled:opacity-50"
        >
          {analyzing ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} />}
          Generar Insight IA
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-bold text-slate-900 flex items-center gap-2 italic">
                <TrendingUp size={20} className="text-primary" />
                PROYECCIÓN DE RENDIMIENTO DE PRODUCCIÓN
              </h3>
              <p className="text-xs text-slate-400 font-mono">Intervalo: 24h | Confianza: 98.4%</p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                <div className="w-2 h-2 rounded-full bg-primary" /> Real
              </span>
              <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                <div className="w-2 h-2 rounded-full bg-slate-300" /> Predicho
              </span>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="colorBiomass" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  domain={['dataMin - 10', 'dataMax + 10']}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="prediction" 
                  stroke="#cbd5e1" 
                  fill="transparent" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                />
                <Area 
                  type="monotone" 
                  dataKey="biomass" 
                  stroke="#2563eb" 
                  fillOpacity={1} 
                  fill="url(#colorBiomass)" 
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insight Sidebar */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900 rounded-3xl p-8 text-white h-fit relative overflow-hidden"
          >
            <div className="relative z-10">
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                <Brain className="text-secondary" />
                Core Insight
              </h3>
              {analyzing ? (
                <div className="space-y-4">
                  <div className="h-4 bg-slate-800 rounded animate-pulse w-3/4"></div>
                  <div className="h-4 bg-slate-800 rounded animate-pulse w-full"></div>
                  <div className="h-4 bg-slate-800 rounded animate-pulse w-5/6"></div>
                </div>
              ) : insight ? (
                <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-body">
                  {insight}
                </div>
              ) : (
                <p className="text-slate-400 text-sm italic">Haz clic en "Generar Insight IA" para procesar las tendencias actuales.</p>
              )}
            </div>
            {/* Background design elements */}
            <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 bg-secondary/20 rounded-full blur-2xl"></div>
          </motion.div>

          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 flex-shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 text-sm uppercase tracking-wider">Alerta de Riesgo</h4>
              <p className="text-amber-800/80 text-xs mt-1">
                Tendencia de temperatura al alza detectada en <span className="font-bold">Línea 04-B</span>. Riesgo de desviación operativa estimado en el 15% para las próximas 3 horas.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Temperatura Opt.', value: '16.2°C', change: '+0.4', status: 'normal' },
          { label: 'Riesgo Operativo', value: 'Bajo', change: 'Estable', status: 'success' },
          { label: 'Consumo Energético', value: '840kW/h', change: '-4%', status: 'warning' },
          { label: 'Rendimiento ESP', value: '1.24 uds/s', change: '+0.2', status: 'success' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center justify-between">
              {stat.label}
              <Info size={12} className="text-slate-300" />
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-slate-900">{stat.value}</span>
              <span className={`text-[10px] font-bold ${stat.status === 'success' ? 'text-green-500' : stat.status === 'warning' ? 'text-amber-500' : 'text-slate-400'}`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Visible Data Grid Area */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <Database size={20} className="text-slate-400" />
          <h3 className="font-bold text-slate-900">Historial de Predicciones Recientes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-wider">ID</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Fecha/Hora</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Evento</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Confianza</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Acción IA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { id: 'PH-402', time: 'Hoy, 09:15', event: 'Fluctuación Flujo', confidence: '92%', action: 'Ajuste Alimentador' },
                { id: 'PH-401', time: 'Hoy, 04:30', event: 'Pico Térmico', confidence: '89%', action: 'Enfriamiento' },
                { id: 'PH-399', time: 'Ayer, 22:00', event: 'Patrón Rendimiento', confidence: '99%', action: 'Observación' }
              ].map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{row.id}</td>
                  <td className="px-6 py-4 text-xs font-semibold text-slate-700">{row.time}</td>
                  <td className="px-6 py-4 text-xs text-slate-600">{row.event}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: row.confidence }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{row.confidence}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
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
