import React, { useState, useEffect } from 'react';
import { Send, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3014';

export function PublisherStudio() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const headers = {
    'x-tenant-id': localStorage.getItem('tenantId') || 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/social/publisher/queue`, { headers });
      setQueue(res.data);
    } catch (err) {
      console.error('Error fetching publisher queue', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishNow = async (id: string) => {
    try {
      const res = await axios.post(`${API_URL}/api/social/publisher/queue/${id}/publish`, {}, { headers });
      if (res.data.success) {
        alert('¡Publicado con éxito a través del proveedor social!');
        fetchQueue();
      } else {
        alert('Error al publicar.');
      }
    } catch (err) {
      console.error('Error executing immediate publish', err);
    }
  };

  const filteredQueue = queue.filter((item) => {
    if (filter === 'ALL') return true;
    return item.status === filter;
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6 h-full min-h-[500px]">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-black text-slate-800">Cola de Publicación (Queue)</h2>
          <p className="text-xs text-slate-400">
            Visualiza los posts programados y disparos históricos en proveedores.
          </p>
        </div>
        <button
          onClick={fetchQueue}
          className="p-2 border border-slate-100 rounded-xl text-slate-500 hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-100 pb-3">
        {['ALL', 'PENDING', 'SUCCESS', 'FAILED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              filter === tab
                ? 'bg-brand-blue text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {tab === 'ALL'
              ? 'Todos'
              : tab === 'PENDING'
              ? 'Pendientes'
              : tab === 'SUCCESS'
              ? 'Exitosos'
              : 'Fallidos'}
          </button>
        ))}
      </div>

      {/* Queue items list */}
      <div className="space-y-3 overflow-y-auto max-h-[500px] custom-scrollbar pr-2">
        {loading ? (
          <p className="text-xs text-slate-400 py-6 text-center">Cargando cola...</p>
        ) : filteredQueue.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No hay publicaciones en este estado en la cola.
          </p>
        ) : (
          filteredQueue.map((item) => (
            <div
              key={item.id}
              className="p-4 border border-slate-100 rounded-2xl flex items-center justify-between hover:border-slate-200 transition-all bg-slate-50/20"
            >
              <div className="flex items-start gap-3 min-w-0">
                {/* Status Icon */}
                <div className="mt-1">
                  {item.status === 'SUCCESS' ? (
                    <CheckCircle2 className="text-emerald-500" size={18} />
                  ) : item.status === 'FAILED' ? (
                    <XCircle className="text-red-500" size={18} />
                  ) : (
                    <Clock className="text-amber-500 animate-pulse" size={18} />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {item.provider}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">
                      Programado: {new Date(item.scheduledAt).toLocaleString()}
                    </span>
                    {item.attempts > 0 && (
                      <span className="text-[9px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded-full">
                        Intento {item.attempts}/3
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-black text-slate-700 mt-1.5">
                    {item.contentPiece?.title || 'Contenido sin título'}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 truncate max-w-xl">
                    {item.contentPiece?.humanizedContent || item.contentPiece?.rawContent}
                  </p>

                  {/* Error display */}
                  {item.error && (
                    <p className="text-[9px] text-red-500 font-bold mt-1.5 bg-red-50/50 p-1 px-2 rounded border border-red-100 flex items-center gap-1">
                      <AlertCircle size={10} /> Error: {item.error}
                    </p>
                  )}
                </div>
              </div>

              {/* Action publish now */}
              {item.status === 'PENDING' && (
                <button
                  onClick={() => handlePublishNow(item.id)}
                  className="px-3.5 py-1.5 bg-brand-blue text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                >
                  <Send size={12} /> Disparar ya
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
