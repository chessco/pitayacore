import React, { useState, useEffect } from 'react';
import { Search, Flame, Hash, Compass, ArrowRight, Eye } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3014';

export function TrendStudio() {
  const [sector, setSector] = useState('marketing');
  const [trends, setTrends] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const headers = {
    'x-tenant-id': localStorage.getItem('tenantId') || 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  const fetchTrends = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/social/trends/trending?sector=${sector}`, { headers });
      setTrends(res.data);
    } catch (err) {
      console.error('Error fetching trends', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-8">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Flame className="text-amber-500 animate-bounce" /> Social Trends (Tendencias y Competencia)
          </h2>
          <p className="text-xs text-slate-400">
            Descubre temas virales, hashtags populares y estrategias de competidores por sector.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-blue/20 w-48"
            placeholder="Buscar sector (ej: legal, salud)"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchTrends();
            }}
          />
          <button
            onClick={fetchTrends}
            className="px-4 py-2 bg-brand-blue text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-brand-blue/10"
          >
            <Search size={14} /> Buscar
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400 py-12 text-center">Buscando tendencias virales en la web...</p>
      ) : !trends ? (
        <p className="text-xs text-slate-400 py-12 text-center">No se encontraron tendencias.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Topics and Hashtags */}
          <div className="md:col-span-2 space-y-6">
            {/* Topics */}
            <div className="space-y-3">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <Compass size={16} className="text-brand-blue" /> Temas Populares en la Web
              </h3>
              <div className="space-y-3">
                {trends.topics?.map((topic: any, idx: number) => (
                  <div key={idx} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/20 hover:border-slate-200 transition-all flex justify-between items-start gap-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-700">{topic.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">{topic.description}</p>
                    </div>
                    <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full shrink-0">
                      {topic.growth}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Competitor Analysis */}
            <div className="space-y-3">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <Eye size={16} className="text-purple-500" /> Monitoreo de Competencia Directa
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {trends.competitorAnalysis?.map((comp: any, idx: number) => (
                  <div key={idx} className="p-4 border border-slate-100 rounded-2xl bg-white space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-black text-slate-700">{comp.competitor}</h4>
                      <span className="text-[8px] font-black px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">
                        {comp.engagement} Engagement
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      {comp.recentStrategy}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hashtags and prompts */}
          <div className="space-y-6">
            {/* Hashtags */}
            <div className="space-y-3">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <Hash size={16} className="text-brand-blue" /> Hashtags en Auge
              </h3>
              <div className="flex flex-wrap gap-2">
                {trends.hashtags?.map((h: any, idx: number) => (
                  <div key={idx} className="p-2 border border-slate-100 rounded-xl bg-white flex flex-col items-start gap-1">
                    <span className="text-xs font-black text-brand-blue">{h.tag}</span>
                    <span className="text-[8px] text-slate-400 font-bold">{h.volume} / {h.context}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Prompts */}
            <div className="space-y-3">
              <h3 className="font-extrabold text-slate-800 text-sm">Prompts Sugeridos IA</h3>
              <div className="space-y-2">
                {trends.recommendedPrompts?.map((prompt: string, idx: number) => (
                  <div key={idx} className="p-3 border border-slate-100 rounded-2xl bg-amber-50/10 text-[10px] text-slate-600 leading-relaxed relative hover:border-slate-200 transition-all">
                    "{prompt}"
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
