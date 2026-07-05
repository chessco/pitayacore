import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, CheckCircle2, ChevronRight, Zap, Target } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3014';

export function OptimizationStudio() {
  const [insights, setInsights] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const headers = {
    'x-tenant-id': localStorage.getItem('tenantId') || 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/social/optimization/insights`, { headers });
      setInsights(res.data);
    } catch (err) {
      console.error('Error fetching optimization insights', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-8">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Brain className="text-brand-blue" /> Social Optimizer (Motor de Optimización IA)
          </h2>
          <p className="text-xs text-slate-400">
            Analiza el rendimiento histórico y genera planes de contenido automatizados.
          </p>
        </div>
        <button
          onClick={fetchInsights}
          className="px-4 py-2 bg-brand-blue text-white rounded-xl text-xs font-bold hover:bg-blue-600 cursor-pointer shadow-md shadow-brand-blue/10 flex items-center gap-1.5"
        >
          <Sparkles size={14} /> Recalcular Insights
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400 py-12 text-center">Analizando el comportamiento de posts...</p>
      ) : !insights ? (
        <p className="text-xs text-slate-400 py-12 text-center">No se pudieron generar los insights.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* executive summary & A/B testing suggestions */}
          <div className="md:col-span-2 space-y-6">
            <div className="border border-brand-blue/10 bg-blue-50/5 rounded-3xl p-6">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-3">
                <Sparkles size={16} className="text-brand-blue animate-pulse" /> Resumen Ejecutivo IA
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {insights.summary}
              </p>
            </div>

            {/* A/B suggestions */}
            <div className="space-y-3">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <Target size={16} className="text-purple-500" /> Experimentos A/B Sugeridos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.abTestingSuggestions?.map((ab: any, idx: number) => (
                  <div key={idx} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/10 space-y-2">
                    <h4 className="text-xs font-black text-slate-700">{ab.test}</h4>
                    <p className="text-[10px] font-bold text-slate-400">Métrica objetivo: {ab.metric}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommendations list */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
              <Zap size={16} className="text-amber-500" /> Sugerencias de Optimización
            </h3>
            <div className="space-y-3">
              {insights.recommendations?.map((rec: any, idx: number) => (
                <div key={idx} className="border border-slate-100 rounded-2xl p-4 bg-white hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="absolute right-0 top-0 h-1 w-full bg-slate-100" />
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-xs font-black text-slate-700">{rec.title}</h4>
                    <span
                      className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                        rec.impact === 'HIGH'
                          ? 'bg-red-50 text-red-600'
                          : rec.impact === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {rec.impact} IMPACT
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {rec.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
