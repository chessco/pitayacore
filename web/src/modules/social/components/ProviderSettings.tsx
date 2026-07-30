import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  PlugZap,
  ShieldCheck,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Link2,
} from 'lucide-react';
import { useTenant } from '../../../contexts/TenantContext';

// Provider Settings — OAuth integrations + connected account health.
// Lives as a subtab inside SocialSuiteView.

const STATUS_STYLES: Record<string, string> = {
  VALID: 'bg-green-100 text-green-700',
  VERIFIED: 'bg-green-100 text-green-700',
  OK: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-amber-100 text-amber-700',
  REFRESHING: 'bg-blue-100 text-blue-700',
  FAILED: 'bg-red-100 text-red-700',
  REVOKED: 'bg-red-100 text-red-700',
};

function Badge({ value }: { value?: string | null }) {
  if (!value) return <span className="text-slate-400 text-xs">—</span>;
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        STATUS_STYLES[value] || 'bg-slate-100 text-slate-600'
      }`}
    >
      {value}
    </span>
  );
}

export function ProviderSettings() {
  const { selectedTenant } = useTenant();
  const [tab, setTab] = useState<'providers' | 'accounts'>('providers');
  const [providers, setProviders] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';

  const headers = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'x-tenant-id': selectedTenant?.id || '',
  });

  const load = async () => {
    if (!selectedTenant) return;
    setLoading(true);
    setError(null);
    try {
      const [p, a] = await Promise.all([
        axios.get(`${apiUrl}/social/providers`, { headers: headers() }),
        axios.get(`${apiUrl}/social/providers/accounts`, { headers: headers() }),
      ]);
      setProviders(Array.isArray(p.data) ? p.data : []);
      setAccounts(Array.isArray(a.data) ? a.data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Error cargando proveedores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant]);

  const connect = async (code: string) => {
    setBusy(code);
    try {
      const res = await axios.post(
        `${apiUrl}/social/providers/${code}/connect`,
        {},
        { headers: headers() },
      );
      if (res.data?.url) window.location.href = res.data.url;
    } catch (e: any) {
      setError(e?.response?.data?.message || 'No se pudo iniciar la conexión.');
      setBusy(null);
    }
  };

  const accountAction = async (id: string, action: 'verify' | 'refresh' | 'disconnect') => {
    setBusy(id + action);
    try {
      await axios.post(
        `${apiUrl}/social/providers/${id}/${action}`,
        {},
        { headers: headers() },
      );
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || `Acción ${action} falló.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-blue text-white flex items-center justify-center">
          <PlugZap size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#001A41]">Providers & OAuth</h2>
          <p className="text-slate-500 text-sm">
            Conecta plataformas y administra el estado de tus credenciales.
          </p>
        </div>
      </div>

      {/* inner tabs */}
      <div className="flex gap-2">
        {(['providers', 'accounts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer ${
              tab === t
                ? 'bg-brand-blue text-white'
                : 'bg-white text-slate-500 hover:bg-slate-100'
            }`}
          >
            {t === 'providers' ? 'Proveedores' : `Cuentas (${accounts.length})`}
          </button>
        ))}
      </div>

      {error && (
        <div className="dashboard-card p-4 bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="dashboard-card p-10 text-center text-slate-500">Cargando…</div>
      ) : tab === 'providers' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((p) => (
            <div key={p.id} className="dashboard-card p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#001A41]">{p.displayName}</p>
                  <p className="text-xs text-slate-400">{p.category} · {p.version}</p>
                </div>
                <Link2 size={18} className="text-brand-blue" />
              </div>
              <div className="flex flex-wrap gap-1">
                {p.oauthEnabled && <Badge value="OAuth" />}
                {p.publishingEnabled && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Publish</span>
                )}
                {p.analyticsEnabled && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Analytics</span>
                )}
                {p.webhookEnabled && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Webhooks</span>
                )}
              </div>
              <button
                disabled={!p.oauthEnabled || busy === p.code}
                onClick={() => connect(p.code)}
                className="mt-auto btn-primary text-sm py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy === p.code ? 'Redirigiendo…' : p.oauthEnabled ? 'Conectar' : 'Sin OAuth'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.length === 0 && (
            <div className="dashboard-card p-8 text-center text-slate-500">
              No hay cuentas conectadas todavía.
            </div>
          )}
          {accounts.map((a) => (
            <div key={a.id} className="dashboard-card p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-[#001A41] truncate">
                  {a.name || a.externalAccountId}
                </p>
                <p className="text-xs text-slate-400">
                  {a.provider}
                  {a.business ? ` · ${a.business}` : ''}
                  {a.lastVerifiedAt
                    ? ` · verificado ${new Date(a.lastVerifiedAt).toLocaleDateString()}`
                    : ''}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge value={a.oauthStatus} />
                  <Badge value={a.verificationStatus} />
                  {a.refreshStatus && <Badge value={a.refreshStatus} />}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  title="Verificar"
                  disabled={busy === a.id + 'verify'}
                  onClick={() => accountAction(a.id, 'verify')}
                  className="p-2 rounded-lg hover:bg-green-50 text-green-600 cursor-pointer"
                >
                  <ShieldCheck size={16} />
                </button>
                <button
                  title="Refrescar token"
                  disabled={busy === a.id + 'refresh'}
                  onClick={() => accountAction(a.id, 'refresh')}
                  className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 cursor-pointer"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  title="Desconectar"
                  disabled={busy === a.id + 'disconnect'}
                  onClick={() => accountAction(a.id, 'disconnect')}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-600 cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-2">
        <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-600" /> Válido/Verificado</span>
        <span className="flex items-center gap-1"><Clock size={12} className="text-amber-600" /> Expirado</span>
        <span className="flex items-center gap-1"><XCircle size={12} className="text-red-600" /> Fallido/Revocado</span>
      </div>
    </div>
  );
}
