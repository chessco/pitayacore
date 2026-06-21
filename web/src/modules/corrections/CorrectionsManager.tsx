import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  CheckCircle2, 
  AlertCircle,
  MessageSquareQuote,
  Zap,
  Download
} from 'lucide-react'
import { useTenant } from '../../contexts/TenantContext'

interface Correction {
  id: string
  trigger: string
  response: string
  isActive: boolean
  createdAt: string
}

export function CorrectionsManager() {
  const { selectedTenant, flowApiKey } = useTenant()
  const [corrections, setCorrections] = useState<Correction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<Correction> | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3014') + '/api/corrections'

  const fetchCorrections = async () => {
    try {
      const res = await fetch(`${API_BASE}?tenantId=${selectedTenant?.id}`, {
        headers: {
          'x-api-key': flowApiKey || ''
        }
      })
      const data = await res.json()
      setCorrections(data)
    } catch (err) {
      console.error('Error fetching corrections:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCorrections()
  }, [selectedTenant])
  
  const handleExportMD = () => {
    let md = '# Correcciones Humanas (Golden Answers)\n\n'
    md += `Inquilino: ${selectedTenant?.name || 'PitayaCore'}\n`
    md += `Fecha: ${new Date().toLocaleDateString()}\n\n---\n\n`
    
    corrections.forEach(c => {
      md += `### TRIGGER: ${c.trigger}\n`
      md += `**Estado:** ${c.isActive ? 'ACTIVO' : 'INACTIVO'}\n`
      md += `**Respuesta:**\n${c.response}\n\n---\n\n`
    })
    
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `correcciones-${selectedTenant?.name?.toLowerCase().replace(/\s+/g, '-') || 'tenant'}.md`
    a.click()
  }

  const handleSave = async () => {
    if (!editingItem?.trigger || !editingItem?.response) return
    setIsSaving(true)
    try {
      const method = editingItem.id ? 'PATCH' : 'POST'
      const url = editingItem.id ? `${API_BASE}/${editingItem.id}` : API_BASE
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': flowApiKey || ''
        },
        body: JSON.stringify({
          ...editingItem,
          tenantId: selectedTenant?.id
        })
      })

      if (res.ok) {
        setIsModalOpen(false)
        setEditingItem(null)
        fetchCorrections()
      }
    } catch (err) {
      console.error('Error saving correction:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta corrección?')) return
    try {
      await fetch(`${API_BASE}/${id}`, { 
        method: 'DELETE',
        headers: {
          'x-api-key': flowApiKey || ''
        }
      })
      fetchCorrections()
    } catch (err) {
      console.error('Error deleting correction:', err)
    }
  }

  const filteredCorrections = corrections.filter(c => 
    c.trigger.toLowerCase().includes(search.toLowerCase()) || 
    c.response.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <MessageSquareQuote className="text-blue-600" />
            Correcciones Humanas
          </h1>
          <p className="text-slate-500 mt-1">
            Define respuestas garantizadas que anulan a la IA y la base de conocimientos.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExportMD}
            className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl flex items-center gap-2 transition-all hover:bg-slate-50"
          >
            <Download size={20} />
            Exportar MD
          </button>
          <button 
            onClick={() => { setEditingItem({}); setIsModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-200"
          >
            <Plus size={20} />
            Nueva Corrección
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por disparador o respuesta..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Disparador (Trigger)</th>
                <th className="px-6 py-4 font-semibold">Respuesta Humana (Golden Answer)</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">Cargando correcciones...</td></tr>
              ) : filteredCorrections.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No hay correcciones que coincidan con tu búsqueda.</td></tr>
              ) : filteredCorrections.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-amber-500 shrink-0" />
                      <span className="font-medium text-slate-700">{c.trigger}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-md">
                    <p className="text-slate-600 line-clamp-2">{c.response}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingItem(c); setIsModalOpen(true); }}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(c.id)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  {editingItem?.id ? 'Editar Corrección' : 'Nueva Corrección'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Frase Disparadora (Trigger)
                  </label>
                  <input 
                    type="text"
                    placeholder="Ej: ¿Qué sabes de ostiones?"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={editingItem?.trigger || ''}
                    onChange={(e) => setEditingItem(prev => ({ ...prev, trigger: e.target.value }))}
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Si el mensaje del usuario contiene esta frase, se activará la corrección.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Respuesta Humana (Golden Answer)
                  </label>
                  <textarea 
                    rows={4}
                    placeholder="Escribe la respuesta exacta que debe dar el sistema..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                    value={editingItem?.response || ''}
                    onChange={(e) => setEditingItem(prev => ({ ...prev, response: e.target.value }))}
                  />
                </div>

                <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-2xl">
                  <AlertCircle className="text-blue-600 shrink-0" size={20} />
                  <p className="text-sm text-blue-700">
                    Las correcciones humanas tienen <strong>prioridad absoluta</strong> sobre la IA y la base de conocimientos.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving || !editingItem?.trigger || !editingItem?.response}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center gap-2"
                >
                  {isSaving ? <Zap size={18} className="animate-pulse" /> : <Save size={18} />}
                  Guardar Corrección
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

