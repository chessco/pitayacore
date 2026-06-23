import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTenant } from '../../contexts/TenantContext';
import { Layers, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export function VerticalsManager() {
  const [verticals, setVerticals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedTenant, flowApiKey } = useTenant();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';

  const fetchVerticals = async () => {
    if (!selectedTenant || !flowApiKey) return;
    try {
      setLoading(true);
      const res = await axios.get(`${apiUrl}/api/verticals`, {
        headers: { 'x-api-key': flowApiKey }
      });
      setVerticals(res.data);
    } catch (err) {
      console.error('Error fetching verticals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerticals();
  }, [selectedTenant, flowApiKey]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 text-[#0066FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-[#0066FF]" />
            Catálogo de Verticales
          </h2>
          <p className="text-[#8892B0] mt-1">
            Plataformas y soluciones de la suite PitayaCore
          </p>
        </div>
        <button 
          onClick={fetchVerticals}
          className="flex items-center gap-2 px-4 py-2 bg-[#1A1F2E] hover:bg-[#252B3D] text-white rounded-lg transition-colors border border-[#2A3143]"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {verticals.map((vertical) => (
          <div key={vertical.id} className="bg-[#1A1F2E] rounded-xl border border-[#2A3143] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[#2A3143] flex justify-between items-start bg-[#151925]">
              <div>
                <h3 className="text-lg font-medium text-white mb-1 flex items-center gap-2">
                  {vertical.name}
                  <span className="text-xs bg-[#2A3143] px-2 py-0.5 rounded-full text-[#8892B0] font-mono">
                    {vertical.slug}
                  </span>
                </h3>
                <p className="text-sm text-[#8892B0] line-clamp-2">
                  {vertical.description || 'Sin descripción'}
                </p>
              </div>
              <div className="flex-shrink-0 ml-4">
                {vertical.status === 'ACTIVE' ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-[#00E676] bg-[#00E676]/10 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="h-3 w-3" />
                    ACTIVA
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-[#FF3366] bg-[#FF3366]/10 px-2.5 py-1 rounded-full">
                    <AlertCircle className="h-3 w-3" />
                    INACTIVA
                  </span>
                )}
              </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col gap-4">
              <div>
                <h4 className="text-xs font-medium text-[#8892B0] uppercase tracking-wider mb-2">
                  URL de Aplicación
                </h4>
                <div className="bg-[#0B0F19] rounded-lg p-3 text-sm text-[#E2E8F0] font-mono break-all border border-[#2A3143]">
                  {vertical.baseUrl || 'No configurada'}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium text-[#8892B0] uppercase tracking-wider mb-2">
                  Configuración Base (Metadatos)
                </h4>
                <div className="bg-[#0B0F19] rounded-lg p-4 text-sm text-[#00E676] font-mono overflow-x-auto border border-[#2A3143] h-40 overflow-y-auto">
                  <pre>{vertical.config ? JSON.stringify(vertical.config, null, 2) : '{}'}</pre>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-[#151925] border-t border-[#2A3143] flex justify-end gap-3">
              <button disabled className="text-sm px-4 py-2 bg-transparent text-[#8892B0] hover:text-white transition-colors cursor-not-allowed opacity-50">
                Editar Configuración
              </button>
              <button disabled className="text-sm px-4 py-2 bg-[#0066FF]/20 text-[#0066FF] rounded-lg font-medium cursor-not-allowed opacity-50">
                Ver Métricas
              </button>
            </div>
          </div>
        ))}
        {verticals.length === 0 && !loading && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-[#8892B0] bg-[#1A1F2E] rounded-xl border border-[#2A3143]">
            <Layers className="h-12 w-12 mb-4 opacity-20" />
            <p>No se encontraron verticales registradas en el sistema.</p>
          </div>
        )}
      </div>
    </div>
  );
}
