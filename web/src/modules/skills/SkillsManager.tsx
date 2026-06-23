import { 
  Plus, 
  Thermometer, 
  ShieldCheck, 
  Activity, 
  Zap, 
  FileText, 
  Droplets, 
  X,
  Save,
  Loader2,
  Send,
  TrendingUp,
  Gauge
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTenant } from '../../contexts/TenantContext'
import { motion, AnimatePresence } from 'motion/react'

export function SkillsManager() {
  const { selectedTenant, flowApiKey, role } = useTenant()
  const [skills, setSkills] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingSkill, setEditingSkill] = useState<any>(null)
  const [newPrompt, setNewPrompt] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [versions, setVersions] = useState<any[]>([])
  const [activeModalTab, setActiveModalTab] = useState<'prompt' | 'history'>('prompt')

  useEffect(() => {
    fetchSkills()
  }, [selectedTenant])

  const fetchSkills = async () => {
    setIsLoading(true)
    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:3014') + '';
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/api/skills`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey
        }
      })
      const data = await response.json()
      if (Array.isArray(data)) {
        setSkills(data)
      } else {
        setSkills([])
      }
    } catch (error) {
      console.error('Error fetching skills:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchVersions = async (skillId: string) => {
    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:3014') + '';
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/api/skills/${skillId}/versions`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey
        }
      })
      const data = await response.json()
      if (Array.isArray(data)) {
        setVersions(data)
      } else {
        setVersions([])
      }
    } catch (error) {
      console.error('Error fetching versions:', error)
    }
  }

  const handleUpdatePrompt = async () => {
    if (!editingSkill) return
    setIsSaving(true)
    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:3014') + '';
    try {
      const token = localStorage.getItem('token');
      await fetch(`${apiUrl}/api/skills/${editingSkill.id}/prompt`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey
        },
        body: JSON.stringify({ prompt: newPrompt })
      })
      fetchVersions(editingSkill.id)
      fetchSkills()
      setActiveModalTab('history')
    } catch (error) {
      console.error('Error updating prompt:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRollback = async (versionId: string) => {
    if (!editingSkill) return
    setIsSaving(true)
    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:3014') + '';
    try {
      const token = localStorage.getItem('token');
      await fetch(`${apiUrl}/api/skills/${editingSkill.id}/rollback/${versionId}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey
        }
      })
      setEditingSkill(null)
      fetchSkills()
    } catch (error) {
      console.error('Error rolling back:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:3014') + '';
    try {
      const token = localStorage.getItem('token');
      await fetch(`${apiUrl}/api/skills/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey
        },
        body: JSON.stringify({ status })
      });
      fetchSkills();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    <div className="p-8 bg-surface min-h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-black font-display text-slate-800">Gestor de Habilidades</h2>
          <p className="text-sm text-slate-500 mt-1">Configura y supervisa los agentes de IA encargados de la optimización del ecosistema acuícola.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3.5 bg-brand-blue text-white font-bold rounded-2xl shadow-lg shadow-brand-blue/20 hover:opacity-90 transition-all text-sm">
          <Plus size={18} />
          Crear Nueva Habilidad
        </button>
      </div>

      {/* Stats Summary Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="dashboard-card p-5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Habilidades Activas</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-slate-800">{skills.filter(s => s.status === 'PRODUCTION').length}</span>
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5 mb-1"><TrendingUp size={12} />+{skills.filter(s => s.status !== 'PRODUCTION').length}</span>
          </div>
        </div>
        <div className="dashboard-card p-5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Éxito Global</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-slate-800">98.4%</span>
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1.5">Óptimo</span>
          </div>
        </div>
        <div className="dashboard-card p-5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Latencia Media</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-slate-800">320<span className="text-lg">ms</span></span>
            <span className="text-xs font-bold text-emerald-500 mb-1">-12ms</span>
          </div>
        </div>
        <div className="bg-brand-blue rounded-2xl p-5 text-white">
          <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-2">Despliegues Hoy</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black">{skills.length}</span>
            <span className="text-xs font-medium text-white/80 mb-1">Sin errores</span>
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-4" size={40} />
          <p className="font-bold uppercase tracking-widest text-[10px]">Sincronizando habilidades...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skills
            .filter(s => role === 'system' || s.status === 'PRODUCTION')
            .map(skill => {
              const iconMap: any = {
                'monitor': <Thermometer size={22} />,
                'agua': <Droplets size={22} />,
                'dieta': <Gauge size={22} />,
                'salud': <Activity size={22} />,
                'analista': <ShieldCheck size={22} />,
              };
              const name = skill.name.toLowerCase();
              const icon = Object.entries(iconMap).find(([k]) => name.includes(k))?.[1] || <Zap size={22} />;
              const colorMap: any = {
                'monitor': 'bg-blue-50 text-blue-500',
                'agua': 'bg-cyan-50 text-cyan-500',
                'dieta': 'bg-amber-50 text-amber-600',
                'salud': 'bg-rose-50 text-rose-500',
                'analista': 'bg-purple-50 text-purple-500',
              };
              const colorClass = Object.entries(colorMap).find(([k]) => name.includes(k))?.[1] || 'bg-brand-blue/10 text-brand-blue';

              return (
                <SkillCard
                  key={skill.id}
                  icon={icon}
                  iconColor={colorClass}
                  name={skill.name}
                  version={skill.version}
                  status={skill.status === 'PRODUCTION' ? 'Activo' : 'En Pruebas'}
                  isPreProd={skill.status !== 'PRODUCTION'}
                  description={skill.description || "Protocolo técnico especializado."}
                  successRate={skill.status === 'PRODUCTION' ? (97 + Math.random() * 2.5).toFixed(1) : (85 + Math.random() * 5).toFixed(1)}
                  latency={skill.status === 'PRODUCTION' ? Math.floor(100 + Math.random() * 350) : Math.floor(500 + Math.random() * 500)}
                  onEdit={() => {
                    setEditingSkill(skill)
                    setNewPrompt(skill.prompt)
                    setActiveModalTab('prompt')
                    fetchVersions(skill.id)
                  }}
                  onDeploy={() => {
                    const newStatus = skill.status === 'PRODUCTION' ? 'PRE_PRODUCTION' : 'PRODUCTION';
                    handleUpdateStatus(skill.id, newStatus);
                  }}
                />
              );
            })}
        </div>
      )}

      {/* Edit Prompt Modal */}
      <AnimatePresence>
        {editingSkill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-blue rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-blue/20">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">{editingSkill.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocolo de Capacidad • v{editingSkill.version}</p>
                  </div>
                </div>
                <button onClick={() => setEditingSkill(null)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="px-8 flex gap-6 bg-slate-50/50 border-b border-slate-100">
                <button onClick={() => setActiveModalTab('prompt')} className={`py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeModalTab === 'prompt' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-400'}`}>
                  Instrucciones Lógicas
                </button>
                <button onClick={() => setActiveModalTab('history')} className={`py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeModalTab === 'history' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-400'}`}>
                  Historial de Refinamiento
                </button>
              </div>

              <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                {activeModalTab === 'prompt' ? (
                  <div className="mb-6">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Lógica de Habilidad (System Prompt)</label>
                    <textarea 
                      value={newPrompt}
                      onChange={(e) => setNewPrompt(e.target.value)}
                      className="w-full h-80 p-6 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-medium leading-relaxed focus:outline-none focus:border-brand-blue focus:bg-white transition-all custom-scrollbar resize-none"
                      placeholder="Define cómo debe ejecutarse esta habilidad..."
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {versions.map((v: any, idx: number) => (
                      <div key={v.id} className="p-5 border border-slate-100 rounded-2xl flex justify-between items-center bg-white hover:border-brand-blue/20 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 font-bold text-xs">v{v.version}</div>
                          <div>
                            <p className="text-sm font-bold text-slate-700">Versión {v.version}</p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {new Date(v.createdAt).toLocaleString()} {idx === 0 && <span className="ml-2 text-emerald-500 font-black tracking-widest uppercase text-[8px]">• Actual</span>}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => handleRollback(v.id)} className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-blue hover:text-white transition-all">
                          Restaurar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {activeModalTab === 'prompt' && (
                <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                  <button onClick={() => setEditingSkill(null)} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-400 hover:bg-slate-100 transition-all">
                    Cancelar
                  </button>
                  <button 
                    onClick={handleUpdatePrompt}
                    disabled={isSaving}
                    className="flex-[2] py-4 bg-brand-blue text-white rounded-2xl text-sm font-bold shadow-xl shadow-brand-blue/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Actualizar Capacidad
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SkillCard({ icon, iconColor, name, version, status, isPreProd, description, successRate, latency, onEdit, onDeploy }: any) {
  return (
    <div className={`bg-white rounded-2xl border border-border flex flex-col transition-all hover:shadow-lg hover:shadow-slate-200/50 hover:border-brand-blue/20 ${isPreProd ? 'border-dashed' : ''}`}>
      <div className="p-6 flex-1">
        {/* Header: Icon + Name + Status */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className="font-black text-slate-800 text-sm truncate">{name}</h4>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className={`w-2 h-2 rounded-full ${isPreProd ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <span className={`text-[9px] font-black uppercase tracking-widest ${isPreProd ? 'text-amber-500' : 'text-emerald-500'}`}>{status}</span>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400">v{version}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-5">{description}</p>

        {/* Metrics */}
        <div className="flex gap-6">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Éxito</p>
            <p className="text-lg font-black text-slate-800">{successRate}%</p>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Latencia</p>
            <p className="text-lg font-black text-slate-800">{latency}<span className="text-xs font-bold text-slate-400">ms</span></p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
        <button 
          onClick={onEdit}
          className="flex-1 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:border-brand-blue hover:text-brand-blue transition-all flex items-center justify-center gap-1.5"
        >
          <FileText size={13} />
          Editar Prompts
        </button>
        <button 
          onClick={onDeploy}
          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
            isPreProd 
              ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20 hover:opacity-90' 
              : 'bg-white border border-slate-200 text-slate-500 hover:border-brand-blue hover:text-brand-blue'
          }`}
        >
          <Send size={13} />
          Desplegar
        </button>
      </div>
    </div>
  )
}

