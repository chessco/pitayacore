import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, Users, Building2, Loader2 } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';

// SelectAccounts — post-OAuth screen. The backend callback redirects here with
// ?session=<id>&provider=<code>. We list the pages/accounts the user can
// connect, let them pick, and confirm (which stores them, tokens encrypted).

export function SelectAccounts() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { selectedTenant } = useTenant();

  const session = params.get('session') || '';
  const provider = params.get('provider') || '';

  const [pages, setPages] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
  const headers = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'x-tenant-id': selectedTenant?.id || '',
  });

  useEffect(() => {
    const fetchPages = async () => {
      if (!session || !provider) {
        setError('Sesión de OAuth inválida o expirada.');
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(
          `${apiUrl}/api/social/providers/${provider}/pages`,
          { headers: headers(), params: { session } },
        );
        setPages(Array.isArray(res.data) ? res.data : []);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'No se pudieron cargar las páginas.');
      } finally {
        setLoading(false);
      }
    };
    void fetchPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, provider]);

  const toggle = (id: string) =>
    setSelected((s) => ({ ...s, [id]: !s[id] }));

  const confirm = async () => {
    const accountIds = Object.keys(selected).filter((k) => selected[k]);
    if (!accountIds.length) {
      setError('Selecciona al menos una página.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await axios.post(
        `${apiUrl}/api/social/providers/${provider}/confirm`,
        { sessionId: session, accountIds },
        { headers: headers() },
      );
      setDone(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'No se pudo confirmar la selección.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-[#001A41] mb-1">
          Conectar cuentas de {provider}
        </h1>
        <p className="text-slate-500 text-sm mb-6">
          Selecciona las páginas que quieres activar en PitayaCore.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        {done ? (
          <div className="text-center py-12">
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-[#001A41]">¡Cuentas conectadas!</p>
            <p className="text-slate-500 text-sm">Redirigiendo…</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
            <Loader2 size={20} className="animate-spin" /> Cargando páginas…
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No se encontraron páginas administrables para esta cuenta.
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
              {pages.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selected[p.id]
                      ? 'border-brand-blue bg-blue-50/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!selected[p.id]}
                    onChange={() => toggle(p.id)}
                    className="w-4 h-4 accent-brand-blue"
                  />
                  {p.pictureUrl ? (
                    <img src={p.pictureUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Building2 size={18} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#001A41] truncate">{p.name}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-2">
                      {p.category && <span>{p.category}</span>}
                      {typeof p.followers === 'number' && (
                        <span className="flex items-center gap-1">
                          <Users size={12} /> {p.followers.toLocaleString()}
                        </span>
                      )}
                      {p.business && <span>· {p.business}</span>}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <button
              onClick={confirm}
              disabled={saving}
              className="btn-primary w-full mt-6 py-3 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Conectar seleccionadas'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
