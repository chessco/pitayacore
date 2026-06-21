import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, PieChart, ArrowUpRight, ArrowDownRight, Loader2, RefreshCcw, Star, Package, Globe, Sparkles } from 'lucide-react'
import axios from 'axios'
import { useTenant } from '../../contexts/TenantContext'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts'
import { motion, AnimatePresence } from 'motion/react'
import ReactMarkdown from 'react-markdown'

export function ProfitabilityReport() {
  const { selectedTenant } = useTenant()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [insights, setInsights] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    fetchReport()
  }, [selectedTenant])

  const fetchReport = async () => {
    if (!selectedTenant) return
    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014'
      const token = localStorage.getItem('token')
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': selectedTenant.id
      }
      
      const res = await axios.get(`${apiUrl}/api/ecommerce/reports/profitability`, { headers })
      setData(res.data)
    } catch (err) {
      console.error('Error fetching profitability report:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateInsights = async () => {
    if (!selectedTenant) return
    setIsGenerating(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014'
      const token = localStorage.getItem('token')
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': selectedTenant.id
      }
      const res = await axios.get(`${apiUrl}/api/ecommerce/reports/ai-insights`, { headers })
      setInsights(res.data.insights)
    } catch (err) {
      console.error('Error generating AI insights:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 size={40} className="animate-spin text-emerald-500 mb-4" />
        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Calculando Rentabilidad...</p>
      </div>
    )
  }

  return (
    <div className="p-8 bg-surface min-h-screen overflow-y-auto">
      <div className="flex justify-between items-start mb-10">
        <div>
          <h2 className="text-3xl font-black font-display text-slate-800">Reporte de Rentabilidad</h2>
          <p className="text-sm text-slate-500 mt-1">Análisis de margen real y costos operativos.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={generateInsights}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="text-amber-400" />}
            {insights ? 'Refrescar Insights IA' : 'Copiloto de Estrategia IA'}
          </button>
          <button 
            onClick={fetchReport}
            className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-emerald-500 hover:border-emerald-200 transition-all shadow-sm"
          >
            <RefreshCcw size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {insights && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 p-8 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[32px] text-white shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Sparkles size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles size={20} className="text-amber-300" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Análisis Estratégico de PitayaCore AI</h3>
              </div>
              <div className="prose prose-invert max-w-none prose-sm">
                <ReactMarkdown>{insights}</ReactMarkdown>
              </div>
              <button 
                onClick={() => setInsights('')}
                className="mt-8 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
              >
                Cerrar Análisis
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatsCard 
          title="Ventas Totales" 
          value={`$${data?.totalRevenue?.toFixed(2) || '0.00'}`} 
          icon={<TrendingUp size={20} />}
          color="emerald"
        />
        <StatsCard 
          title="Costo de Ventas" 
          value={`$${data?.totalCost?.toFixed(2) || '0.00'}`} 
          icon={<DollarSign size={20} />}
          color="rose"
        />
        <StatsCard 
          title="Margen Neto" 
          value={`$${data?.netMargin?.toFixed(2) || '0.00'}`} 
          icon={<PieChart size={20} />}
          color="blue"
        />
        <StatsCard 
          title="Margen %" 
          value={`${data?.marginPercentage?.toFixed(1) || '0'}%`} 
          icon={<ArrowUpRight size={20} />}
          color={data?.marginPercentage > 20 ? 'emerald' : 'amber'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Top Products Table */}
        <div className="dashboard-card bg-white p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
              <Star size={20} />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Productos Estrella</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="text-left pb-4">Producto</th>
                  <th className="text-right pb-4">Cant.</th>
                  <th className="text-right pb-4">Margen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data?.topProducts?.map((p: any) => (
                  <tr key={p.id} className="group">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 overflow-hidden shrink-0">
                          {p.image ? (
                            <img src={p.image} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-200">
                              <Package size={16} />
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-slate-700 text-sm truncate max-w-[150px] inline-block">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-right font-black text-slate-400 text-sm">{p.quantity}</td>
                    <td className="py-4 text-right font-black text-emerald-600 text-sm">${p.profit.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attribution Table */}
        <div className="dashboard-card bg-white p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
              <Globe size={20} />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Atribución por Campaña</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="text-left pb-4">Cápsula / Campaña</th>
                  <th className="text-right pb-4">Ventas</th>
                  <th className="text-right pb-4">Ingresos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data?.attribution?.map((a: any) => (
                  <tr key={a.id} className="group">
                    <td className="py-4">
                      <span className="font-bold text-slate-700 text-sm">{a.name}</span>
                    </td>
                    <td className="py-4 text-right font-black text-slate-400 text-sm">{a.orders}</td>
                    <td className="py-4 text-right font-black text-blue-600 text-sm">${a.revenue.toFixed(2)}</td>
                  </tr>
                ))}
                {(!data?.attribution || data.attribution.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-10 text-center text-slate-400 italic text-xs uppercase font-bold">Sin datos de atribución</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatsCard({ title, value, icon, color }: any) {
  const colors: any = {
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600'
  }

  return (
    <div className="dashboard-card bg-white p-6 hover:shadow-lg transition-all border border-slate-100">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colors[color] || 'bg-slate-50 text-slate-400'}`}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
          <h4 className="text-xl font-black text-slate-800">{value}</h4>
        </div>
      </div>
    </div>
  )
}
