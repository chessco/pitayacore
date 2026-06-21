import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Search, Filter, MoreVertical, LayoutGrid, List as ListIcon, ExternalLink, BarChart3, Mail, Users, Settings, Trash2 } from 'lucide-react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useTenant } from '../../../contexts/TenantContext';

export const CapsuleList: React.FC = () => {
  const { selectedTenant, flowApiKey } = useTenant();
  const [capsules, setCapsules] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  let apiUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3014`;

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    apiUrl = `http://${window.location.hostname}:3014`;
  }

  useEffect(() => {
    fetchData();
  }, [selectedTenant]);

  const fetchData = async () => {
    if (!selectedTenant) return;
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('pitayacore_role') || 'ADMIN';

    console.log('STUDIO FETCH:', { tenantId: selectedTenant.id, role });

    try {
      setLoading(true);
      const [capsRes, agentsRes] = await Promise.all([
        axios.get(apiUrl + '/api/capsule-studio/capsules', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': selectedTenant.id,
            'x-user-role': role.toUpperCase(),
            'x-api-key': flowApiKey,
          }
        }),
        axios.get(apiUrl + '/api/agents', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': selectedTenant.id,
            'x-user-role': role.toUpperCase(),
            'x-api-key': flowApiKey,
          }
        })
      ]);
      console.log('STUDIO DATA RECEIVED:', { capsules: capsRes.data, agents: agentsRes.data });
      setCapsules(capsRes.data);
      setAgents(agentsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !selectedTenant) return;
    
    // Necesitamos al menos un agente para crear la cápsula
    if (agents.length === 0) {
      alert('Debes crear al menos un Agente de IA antes de crear una cápsula.');
      return;
    }

    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('pitayacore_role') || 'ADMIN';

      const res = await axios.post(apiUrl + '/api/capsule-studio/capsules', {
        title: newTitle,
        topic: 'General',
        slug: newTitle.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Math.random().toString(36).substring(2, 7),
        agentId: agents[0].id, // Usamos el primer agente disponible
        contentBlocks: [],
        promptConfig: { agentName: newTitle, agentGreeting: '¡Hola! Soy un experto de PitayaCore.', extraInstructions: '' },
        ctaConfig: { text: 'Contactar Experto', link: '#' }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': selectedTenant?.id || '',
          'x-user-role': role.toUpperCase(),
          'x-api-key': flowApiKey,
        }
      });
      navigate(`/app/capsules/edit/${res.data.id}`);
    } catch (err) {
      console.error('Error creating capsule:', err);
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (capsule: any) => {
    const newStatus = capsule.status.toUpperCase() === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      await axios.patch(`${apiUrl}/api/capsule-studio/capsules/${capsule.id}/status`, 
        { status: newStatus },
        {
          headers: {
            'x-tenant-id': selectedTenant?.id || '',
            'x-api-key': flowApiKey,
          }
        }
      );
      setCapsules(prev => prev.map(c => c.id === capsule.id ? { ...c, status: newStatus } : c));
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta cápsula? Esta acción no se puede deshacer.')) return;
    try {
      await axios.delete(`${apiUrl}/api/capsule-studio/capsules/${id}`, {
        headers: {
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
        }
      });
      setCapsules(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      console.error('Error deleting capsule:', err);
      alert(err.response?.data?.message || 'Error al eliminar la cápsula. Verifica si tiene campañas enviadas.');
    }
  };

  return (
    <div className="p-8 space-y-8 relative">
      {/* Modal de Creación */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#001A41]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-[#001A41]">Nueva Cápsula</h2>
              <p className="text-slate-500 font-medium text-sm">Define el nombre de tu nuevo motor de conversión.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase">Nombre de la Cápsula</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Optimización de Microalgas"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreate}
                  disabled={creating || !newTitle.trim()}
                  className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  {creating ? 'Creando...' : 'Comenzar'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-[#001A41]">Capsule Studio</h1>
          <p className="text-slate-500 font-medium">Gestiona tus motores de conversión y campañas de IA.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <Plus size={20} /> Crear Nueva Cápsula
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <LayoutGrid size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-[#001A41]">{capsules.length}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cápsulas Activas</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-[#001A41]">
              {capsules.reduce((acc, c) => acc + (c._count?.leads || 0), 0)}
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Leads Generados</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <BarChart3 size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-[#001A41]">
              {capsules.length > 0 ? (capsules.reduce((acc, c) => acc + (c._count?.leads || 0), 0) / (capsules.length * 10)).toFixed(1) : 0}%
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tasa de Conversión</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar cápsulas..." 
                className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <button className="p-2.5 text-slate-500 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all">
              <Filter size={20} />
            </button>
          </div>
          <div className="flex gap-2">
            <button className="p-2.5 bg-white text-blue-600 rounded-xl border border-slate-200 shadow-sm">
              <LayoutGrid size={20} />
            </button>
            <button className="p-2.5 text-slate-400 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all">
              <ListIcon size={20} />
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {loading ? (
            <div className="p-20 text-center text-slate-400 font-medium">Cargando estudio...</div>
          ) : capsules.length === 0 ? (
            <div className="p-20 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                <LayoutGrid size={40} />
              </div>
              <p className="text-slate-500 font-medium">No tienes cápsulas creadas aún.</p>
            </div>
          ) : (
            capsules.map((capsule) => (
              <div key={capsule.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl">
                    {capsule.title.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-[#001A41] flex items-center gap-2">
                      {capsule.title}
                      <button 
                        onClick={() => toggleStatus(capsule)}
                        className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter transition-all hover:scale-105 active:scale-95 ${
                          capsule.status.toUpperCase() === 'PUBLISHED' 
                            ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {capsule.status}
                      </button>
                    </h3>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                      <span className="flex items-center gap-1.5"><LayoutGrid size={12} /> {capsule.topic}</span>
                      <span className="flex items-center gap-1.5"><Users size={12} /> {capsule._count?.leads || 0} leads</span>
                      <span className="flex items-center gap-1.5"><Mail size={12} /> 2 campañas</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link 
                    to={`/app/capsules/edit/${capsule.id}`} 
                    className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all"
                  >
                    <Settings size={20} />
                  </Link>
                  <Link 
                    to={`/capsules/${capsule.slug}`} 
                    target="_blank"
                    className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all"
                  >
                    <ExternalLink size={20} />
                  </Link>
                  {capsule.status.toUpperCase() !== 'PUBLISHED' && (
                    <button 
                      onClick={() => handleDelete(capsule.id)}
                      className="p-2.5 text-slate-500 hover:text-red-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

