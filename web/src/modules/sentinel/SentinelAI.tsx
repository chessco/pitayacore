import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import axios from 'axios';
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  MessageSquare,
  Radar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTenant } from '../../contexts/TenantContext';

// Sentinel AI — Social Intelligence Suite dashboard.
// Read-only view over the /social-intelligence analytics + alerts endpoints.

const SENTIMENT_COLORS: Record<string, string> = {
  POSITIVE: '#22c55e',
  NEGATIVE: '#ef4444',
  NEUTRAL: '#94a3b8',
  MIXED: '#f59e0b',
};

const SEVERITY_STYLES: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any;
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="dashboard-card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${accent}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-[#001A41]">{value}</p>
      </div>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: any;
}) {
  return (
    <div className="dashboard-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className="text-brand-blue" />
        <h3 className="font-semibold text-[#001A41]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// Rendered by OperationalDashboard, which passes a `setActiveTab` prop; this
// page doesn't navigate away, so it ignores props.
export function SentinelAI() {
  const { selectedTenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';

  useEffect(() => {
    const fetchAll = async () => {
      if (!selectedTenant || selectedTenant.id === 'global') {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const headers = {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': selectedTenant.id,
        };
        const [ov, tr, al, rec] = await Promise.all([
          axios.get(`${apiUrl}/social-intelligence/analytics/overview`, { headers }),
          axios.get(`${apiUrl}/social-intelligence/analytics/trends`, { headers }),
          axios.get(`${apiUrl}/social-intelligence/alerts`, {
            headers,
            params: { limit: 8 },
          }),
          axios.get(`${apiUrl}/social-intelligence/analytics/recommendations`, {
            headers,
            params: { limit: 6 },
          }),
        ]);
        setOverview(ov.data);
        setTrends(Array.isArray(tr.data) ? tr.data : []);
        setAlerts(Array.isArray(al.data) ? al.data : []);
        setRecommendations(Array.isArray(rec.data) ? rec.data : []);
      } catch (e: any) {
        setError(
          e?.response?.data?.message ||
            e?.message ||
            'No se pudo cargar la inteligencia social.',
        );
      } finally {
        setLoading(false);
      }
    };
    void fetchAll();
  }, [selectedTenant, apiUrl]);

  const sentiment = overview?.sentiment || {};
  const sentimentData = Object.keys(SENTIMENT_COLORS)
    .map((k) => ({ name: k, value: sentiment[k] ?? 0 }))
    .filter((d) => d.value > 0);
  const activityData: any[] = overview?.activityBySource || [];
  const topTopics: any[] = overview?.topTopics || [];
  const maxTopic = Math.max(1, ...topTopics.map((t) => t.count || 0));

  if (selectedTenant?.id === 'global') {
    return (
      <div className="flex-1 bg-slate-50 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          <div className="dashboard-card p-10 text-center text-slate-500">
            Selecciona un tenant específico para ver Sentinel AI.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-8 custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-brand-blue text-white flex items-center justify-center">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#001A41]">Sentinel AI</h1>
            <p className="text-slate-500 text-sm">
              Inteligencia social · últimos {overview?.windowDays ?? 30} días
            </p>
          </div>
        </motion.div>

        {error && (
          <div className="dashboard-card p-4 bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="dashboard-card p-10 text-center text-slate-500">
            Cargando inteligencia social…
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <StatCard
                icon={MessageSquare}
                label="Contenido recolectado"
                value={overview?.items?.total ?? 0}
                accent="bg-brand-blue-light text-brand-blue"
              />
              <StatCard
                icon={Radar}
                label="Analizado por IA"
                value={overview?.items?.analyzed ?? 0}
                accent="bg-indigo-100 text-indigo-600"
              />
              <StatCard
                icon={AlertTriangle}
                label="Alertas abiertas"
                value={overview?.openAlerts ?? 0}
                accent="bg-red-100 text-red-600"
              />
              <StatCard
                icon={Activity}
                label="Pendientes de análisis"
                value={overview?.items?.pending ?? 0}
                accent="bg-amber-100 text-amber-600"
              />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard icon={Activity} title="Sentimiento">
                {sentimentData.length ? (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sentimentData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={2}
                        >
                          {sentimentData.map((d) => (
                            <Cell key={d.name} fill={SENTIMENT_COLORS[d.name]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 py-10 text-center">
                    Sin datos de sentimiento.
                  </p>
                )}
              </SectionCard>

              <SectionCard icon={Activity} title="Actividad por fuente">
                {activityData.length ? (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                        <XAxis dataKey="source" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#377DFF" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 py-10 text-center">
                    Sin actividad registrada.
                  </p>
                )}
              </SectionCard>
            </div>

            {/* Topics + Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard icon={TrendingUp} title="Temas principales">
                {topTopics.length ? (
                  <div className="space-y-3">
                    {topTopics.map((t) => (
                      <div key={t.topic}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-700">{t.topic}</span>
                          <span className="text-slate-400">{t.count}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-blue rounded-full"
                            style={{ width: `${(t.count / maxTopic) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 py-6 text-center">
                    Sin temas detectados.
                  </p>
                )}
              </SectionCard>

              <SectionCard icon={TrendingUp} title="Tendencias emergentes">
                {trends.length ? (
                  <div className="space-y-2">
                    {trends.slice(0, 8).map((t) => (
                      <div
                        key={t.topic}
                        className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                      >
                        <span className="text-sm text-slate-700">{t.topic}</span>
                        <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                          <TrendingUp size={14} />+{t.score}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 py-6 text-center">
                    Sin tendencias en aumento.
                  </p>
                )}
              </SectionCard>
            </div>

            {/* Incidents / Alerts */}
            <SectionCard icon={AlertTriangle} title="Incidentes y alertas">
              {alerts.length ? (
                <div className="divide-y divide-slate-100">
                  {alerts.map((a) => (
                    <div
                      key={a.id}
                      className="py-3 flex items-start justify-between gap-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#001A41]">
                          {a.title}
                        </p>
                        {a.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {a.description}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1">
                          {a.type} · {a.status}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                          SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.LOW
                        }`}
                      >
                        {a.severity}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 py-6 text-center">
                  Sin alertas activas.
                </p>
              )}
            </SectionCard>

            {/* Recommendations */}
            <SectionCard icon={Lightbulb} title="Recomendaciones sugeridas">
              {recommendations.length ? (
                <ul className="space-y-3">
                  {recommendations.flatMap((r) =>
                    (r.recommendations || []).map((rec: string, i: number) => (
                      <li
                        key={`${r.contentItemId}-${i}`}
                        className="flex items-start gap-2 text-sm text-slate-700"
                      >
                        <Lightbulb
                          size={16}
                          className="text-brand-amber mt-0.5 shrink-0"
                        />
                        <span>{rec}</span>
                      </li>
                    )),
                  )}
                </ul>
              ) : (
                <p className="text-sm text-slate-400 py-6 text-center">
                  Sin recomendaciones por el momento.
                </p>
              )}
            </SectionCard>
          </>
        )}
      </div>
    </div>
  );
}
