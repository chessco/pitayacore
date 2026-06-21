import { useState, useEffect } from 'react';
import { Activity, Globe, Link, Zap, CheckCircle2, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface SystemStatusProps {
  flowApiKey: string;
}

export function SystemStatus({ flowApiKey }: SystemStatusProps) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [flowHealth, setFlowHealth] = useState<'online' | 'offline' | 'checking'>('checking');

  const fetchStatus = async () => {
    setLoading(true);
    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:3014') + '';
    try {
      const res = await fetch(`${apiUrl}/api/system/status`);
      const data = await res.json();
      setStatus(data);
      
      // Check Flow health
      if (data.flowApiUrl) {
        checkFlowHealth(data.flowApiUrl);
      }
    } catch (err) {
      console.error("Error fetching system status:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkFlowHealth = async (url: string) => {
    setFlowHealth('checking');
    try {
      // Flow usually has a / or health endpoint
      const res = await fetch(`${url}/whatsapp/settings`, {
          headers: { 'x-api-key': flowApiKey }
      });
      if (res.ok || res.status === 401) { // 401 means reachable but needs auth
          setFlowHealth('online');
      } else {
          setFlowHealth('offline');
      }
    } catch (err) {
      setFlowHealth('offline');
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-800">Estado del Ecosistema</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Monitoreo de Puentes y Túneles</p>
        </div>
        <button 
          onClick={fetchStatus}
          className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* PitayaCore Card */}
        <div className="dashboard-card p-5 bg-white border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-brand-blue">
                <Activity size={16} />
              </div>
              <span className="text-xs font-bold text-slate-700">PitayaCore API</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">Online</span>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Endpoint Local</p>
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
                <code className="text-[10px] text-slate-600 font-mono">http://localhost:3014</code>
              </div>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Túnel Público (ngrok)</p>
              <div className="flex items-center justify-between bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/50">
                <code className="text-[10px] text-indigo-600 font-mono truncate mr-2">
                  {status?.pitayacoreApiUrl || 'Detectando...'}
                </code>
                <a href={status?.pitayacoreApiUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-600">
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Flow Card */}
        <div className="dashboard-card p-5 bg-white border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500">
                <Zap size={16} />
              </div>
              <span className="text-xs font-bold text-slate-700">Flow Bridge</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
              flowHealth === 'online' ? 'bg-emerald-50 text-emerald-600' : 
              flowHealth === 'offline' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'
            }`}>
              {flowHealth}
            </span>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Target API URL</p>
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
                <code className="text-[10px] text-slate-600 font-mono truncate mr-2">
                  {status?.flowApiUrl || 'Cargando...'}
                </code>
                <Link size={12} className="text-slate-300" />
              </div>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2">
                {flowHealth === 'online' ? (
                  <CheckCircle2 size={12} className="text-emerald-500" />
                ) : (
                  <AlertCircle size={12} className="text-rose-500" />
                )}
                <p className="text-[9px] text-slate-500 font-medium">
                  {flowHealth === 'online' ? 'Comunicación bidireccional activa' : 'Verifica el túnel de Flow (puerto 3003)'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3">
        <Globe size={20} className="text-amber-500 shrink-0" />
        <div>
          <h4 className="text-xs font-bold text-amber-800">Configuración de Webhook en Meta</h4>
          <p className="text-[10px] text-amber-600 mt-1 leading-relaxed">
            Si cambias de ngrok, asegúrate de actualizar la <b>Callback URL</b> en tu App de Meta con la URL pública de Flow. 
            El endpoint debe ser: <code className="bg-white/50 px-1 rounded">/whatsapp/webhook</code>
          </p>
        </div>
      </div>
    </div>
  );
}

