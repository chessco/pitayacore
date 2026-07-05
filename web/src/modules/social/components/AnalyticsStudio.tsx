import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, ArrowUpRight, BarChart3, RotateCw } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3014';

export function AnalyticsStudio() {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = {
    'x-tenant-id': localStorage.getItem('tenantId') || 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/social/publisher/analytics`, { headers });
      setAnalytics(res.data);
    } catch (err) {
      console.error('Error fetching analytics', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/api/social/publisher/analytics/mock`, {}, { headers });
      alert('¡Métricas de simulación creadas exitosamente!');
      fetchAnalytics();
    } catch (err) {
      console.error('Error simulating metrics', err);
    }
  };

  // Compute aggregations
  const totalReach = analytics.reduce((acc, curr) => acc + (curr.reach || 0), 0);
  const totalImpressions = analytics.reduce((acc, curr) => acc + (curr.impressions || 0), 0);
  const totalEngagement = analytics.reduce((acc, curr) => acc + (curr.engagement || 0), 0);
  const totalClicks = analytics.reduce((acc, curr) => acc + (curr.clicks || 0), 0);
  const averageCtr = analytics.length > 0 
    ? (analytics.reduce((acc, curr) => acc + (curr.ctr || 0), 0) / analytics.length).toFixed(2)
    : '0';

  // Group metrics by platform/provider for the bar chart
  const providerDataMap = analytics.reduce((acc: any, curr) => {
    const provider = curr.provider || 'MOCK';
    if (!acc[provider]) {
      acc[provider] = { provider, reach: 0, engagement: 0, clicks: 0 };
    }
    acc[provider].reach += curr.reach || 0;
    acc[provider].engagement += curr.engagement || 0;
    acc[provider].clicks += curr.clicks || 0;
    return acc;
  }, {});

  const chartData = Object.values(providerDataMap);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-8">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-black text-slate-800">Estadísticas y Analíticas Sociales</h2>
          <p className="text-xs text-slate-400">
            Monitorea el ROI, alcance orgánico e interacción consolidada por red.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSimulate}
            className="px-4 py-2 border border-brand-blue text-brand-blue rounded-xl text-xs font-bold hover:bg-blue-50/50 transition-colors cursor-pointer"
          >
            Simular Métricas
          </button>
          <button
            onClick={fetchAnalytics}
            className="p-2 border border-slate-100 rounded-xl text-slate-500 hover:bg-slate-50 cursor-pointer"
          >
            <RotateCw size={14} />
          </button>
        </div>
      </div>

      {/* Aggregated KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Reach */}
        <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/30 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Alcance Orgánico</span>
            <Users size={16} className="text-brand-blue" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800">{totalReach.toLocaleString()}</h3>
            <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5 mt-1">
              <ArrowUpRight size={12} /> +12.4% este mes
            </span>
          </div>
        </div>

        {/* Impressions */}
        <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/30 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Impresiones</span>
            <BarChart3 size={16} className="text-purple-500" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800">{totalImpressions.toLocaleString()}</h3>
            <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5 mt-1">
              <ArrowUpRight size={12} /> +8.1% vs anterior
            </span>
          </div>
        </div>

        {/* Engagement */}
        <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/30 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Interacciones</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800">{totalEngagement.toLocaleString()}</h3>
            <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5 mt-1">
              <ArrowUpRight size={12} /> +15.2% tasa promedio
            </span>
          </div>
        </div>

        {/* CTR */}
        <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/30 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">CTR Promedio</span>
            <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">%</span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800">{averageCtr}%</h3>
            <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5 mt-1">
              <ArrowUpRight size={12} /> +2.3% clic-rate
            </span>
          </div>
        </div>
      </div>

      {/* Main Bar Chart of Recharts */}
      <div className="border border-slate-100 rounded-3xl p-6 bg-slate-50/10">
        <h3 className="font-extrabold text-slate-800 text-sm mb-4">Alcance vs Clics por Plataforma</h3>
        <div className="h-80 w-full">
          {loading ? (
            <p className="text-xs text-slate-400 py-20 text-center">Cargando gráficos...</p>
          ) : chartData.length === 0 ? (
            <p className="text-xs text-slate-400 py-20 text-center">No hay datos suficientes para graficar.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="provider" tickLine={false} axisLine={false} style={{ fontSize: 10, fontWeight: 'bold', fill: '#64748B' }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                <Bar dataKey="reach" name="Alcance" fill="#2563EB" radius={[8, 8, 0, 0]} barSize={24} />
                <Bar dataKey="clicks" name="Clics" fill="#10B981" radius={[8, 8, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
