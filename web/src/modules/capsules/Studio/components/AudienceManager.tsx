import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Plus, Edit, Trash2, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { AudienceEditor } from './AudienceEditor';
import { useTenant } from '../../../../contexts/TenantContext';

export const AudienceManager: React.FC = () => {
  const { selectedTenant, flowApiKey, role } = useTenant();
  const [audiences, setAudiences] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAudience, setSelectedAudience] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newAudienceName, setNewAudienceName] = useState('');
  const [newAudienceDesc, setNewAudienceDesc] = useState('');

  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const getApiContext = () => {
    let apiUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3014`;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') apiUrl = `http://${window.location.hostname}:3014`;
    const token = localStorage.getItem('token');
    const headers = { 
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': selectedTenant?.id || '', 
      'x-user-role': (role || 'ADMIN').toUpperCase(),
      'x-api-key': flowApiKey 
    };
    return { apiUrl, headers };
  };

  const fetchAudiences = async () => {
    setIsLoading(true);
    try {
      const { apiUrl, headers } = getApiContext();
      const response = await axios.get(`${apiUrl}/api/capsule-studio/audiences`, { headers });
      setAudiences(response.data);
    } catch (err) {
      console.error('Error fetching audiences', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAudiences();
  }, [selectedTenant]);

  const handleCreate = async () => {
    if (!newAudienceName) return;
    try {
      const { apiUrl, headers } = getApiContext();
      await axios.post(`${apiUrl}/api/capsule-studio/audiences`, {
        name: newAudienceName,
        description: newAudienceDesc
      }, { headers });
      
      setIsCreating(false);
      setNewAudienceName('');
      setNewAudienceDesc('');
      fetchAudiences();
    } catch (err) {
      console.error('Error creating audience', err);
    }
  };

  const startEdit = (aud: any) => {
    setEditingId(aud.id);
    setEditName(aud.name || '');
    setEditDesc(aud.description || '');
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      const { apiUrl, headers } = getApiContext();
      await axios.patch(
        `${apiUrl}/api/capsule-studio/audiences/${id}`,
        { name: editName.trim(), description: editDesc },
        { headers }
      );
      setEditingId(null);
      fetchAudiences();
    } catch (err) {
      console.error('Error renaming audience', err);
      alert('No se pudo renombrar la lista.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta lista? Se eliminarán todos sus contactos.')) return;
    try {
      const { apiUrl, headers } = getApiContext();
      await axios.delete(`${apiUrl}/api/capsule-studio/audiences/${id}`, { headers });
      fetchAudiences();
    } catch (err) {
      console.error('Error deleting audience', err);
    }
  };

  if (selectedAudience) {
    return (
      <AudienceEditor 
        audience={selectedAudience} 
        onBack={() => {
          setSelectedAudience(null);
          fetchAudiences();
        }} 
      />
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Listas de Correos (Audiencias)
          </h2>
          <p className="text-slate-500 text-sm mt-1">Gestiona tus contactos e impórtalos desde Excel o Google Sheets</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm shadow-blue-200 hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Lista
        </button>
      </div>

      {isCreating && (
        <div className="p-6 border-b border-slate-100 bg-blue-50/50">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Nombre de la lista (ej. Clientes VIP)"
              value={newAudienceName}
              onChange={(e) => setNewAudienceName(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Descripción (Opcional)"
              value={newAudienceDesc}
              onChange={(e) => setNewAudienceDesc(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCreate}
              disabled={!newAudienceName}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50"
            >
              Guardar
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="px-6 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-10 text-slate-400">Cargando listas...</div>
        ) : audiences.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">No tienes listas creadas</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-6">Crea tu primera lista para organizar tus prospectos e importar contactos fácilmente desde hojas de cálculo.</p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-sm shadow-blue-200 hover:bg-blue-700 transition"
            >
              Crear Primera Lista
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {audiences.map(aud => (
              <div key={aud.id} className="border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all group bg-white relative">
                <div className="flex justify-between items-start mb-4">
                  {editingId === aud.id ? (
                    <div className="flex-1 flex flex-col gap-2 pr-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nombre de la lista"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(aud.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Descripción (opcional)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(aud.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 text-lg mb-1 truncate">{aud.name}</h3>
                      <p className="text-slate-500 text-sm h-10 overflow-hidden">{aud.description || 'Sin descripción'}</p>
                    </div>
                  )}
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold">
                    {aud._count?.members || 0}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  {editingId === aud.id ? (
                    <>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleRename(aud.id)}
                        disabled={!editName.trim()}
                        className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                      >
                        Guardar
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(aud.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Eliminar Lista"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => startEdit(aud)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Renombrar Lista"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => setSelectedAudience(aud)}
                        className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800 transition group-hover:translate-x-1"
                      >
                        Gestionar Contactos
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
