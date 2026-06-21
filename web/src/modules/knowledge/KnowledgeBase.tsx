import { 
  Search, 
  Plus, 
  Download, 
  ChevronRight, 
  FileText, 
  CheckCircle2, 
  Tag,
  History,
  Edit3,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Database,
  X,
  Save,
  Eye,
  Hash,
  Activity,
  Copy
} from 'lucide-react'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useTenant } from '../../contexts/TenantContext'
import { motion, AnimatePresence } from 'motion/react'

export function KnowledgeBase() {
  const { flowApiKey, selectedTenant } = useTenant()
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newDoc, setNewDoc] = useState({ title: '', content: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isCopilotModalOpen, setIsCopilotModalOpen] = useState(false)

  const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3014') + '/api/knowledge-base'

  useEffect(() => {
    fetchDocuments()
  }, [selectedTenant])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const response = await axios.get(API_BASE, {
        headers: { 
          'x-tenant-id': selectedTenant?.id,
          'x-api-key': flowApiKey
        }
      })
      setDocuments(response.data)
      setError(null)
    } catch (err) {
      console.error('Error fetching knowledge base:', err)
      setError('No se pudo cargar la base de conocimientos.')
    } finally {
      setLoading(false)
    }
  }

  const fetchDocDetails = async (id: string) => {
    try {
      const response = await axios.get(`${API_BASE}/${id}`, {
        headers: { 
          'x-tenant-id': selectedTenant?.id,
          'x-api-key': flowApiKey
        }
      })
      setSelectedDoc(response.data)
      setIsDetailModalOpen(true)
    } catch (err) {
      console.error('Error fetching doc details:', err)
      alert('Error al cargar detalles.')
    }
  }

  const handleAiGenerate = async () => {
    if (!newDoc.title) return
    setIsGenerating(true)
    try {
      const res = await axios.post(`${API_BASE}/generate`, { 
        title: newDoc.title,
        isCopilot: isCopilotModalOpen
      }, {
        headers: { 
          'x-tenant-id': selectedTenant?.id,
          'x-api-key': flowApiKey
        }
      })
      if (isCopilotModalOpen) {
        setNewDoc(prev => ({ ...prev, content: res.data.content }))
      } else {
        setNewDoc(prev => ({ ...prev, content: res.data.content }))
      }
    } catch (err) {
      console.error('Error generating with AI:', err)
      alert('Error al generar con IA.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await axios.post(`${API_BASE}/upload`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'x-tenant-id': selectedTenant?.id,
          'x-api-key': flowApiKey
        }
      })
      // If upload is successful, it already created the entry, so we just refresh
      alert('PDF procesado e indexado con éxito.')
      setIsModalOpen(false)
      fetchDocuments()
    } catch (err) {
      console.error('Error uploading PDF:', err)
      alert('Error al procesar el PDF.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCreate = async () => {
    if (!newDoc.title || !newDoc.content) return
    setIsSaving(true)
    try {
      await axios.post(API_BASE, newDoc, {
        headers: { 
          'x-tenant-id': selectedTenant?.id,
          'x-api-key': flowApiKey
        }
      })
      setIsModalOpen(false)
      setIsCopilotModalOpen(false)
      setNewDoc({ title: '', content: '' })
      fetchDocuments()
    } catch (err) {
      console.error('Error creating document:', err)
      alert('Error al crear el documento.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este documento? Se borrarán todos sus fragmentos e índices.')) return
    try {
      await axios.delete(`${API_BASE}/${id}`, {
        headers: { 
          'x-tenant-id': selectedTenant?.id,
          'x-api-key': flowApiKey
        }
      })
      fetchDocuments()
    } catch (err) {
      console.error('Error deleting document:', err)
      alert('Error al eliminar el documento.')
    }
  }

  const handleReindex = async (id: string) => {
    try {
      await axios.post(`${API_BASE}/${id}/reindex`, {}, {
        headers: { 
          'x-tenant-id': selectedTenant?.id,
          'x-api-key': flowApiKey
        }
      })
      alert('Documento reindexado con éxito.')
      fetchDocuments()
    } catch (err) {
      console.error('Error reindexing document:', err)
      alert('Error al reindexar.')
    }
  }

  const handleToggleStatus = async (id: string) => {
    try {
      await axios.patch(`${API_BASE}/${id}/status`, {}, {
        headers: { 
          'x-tenant-id': selectedTenant?.id,
          'x-api-key': flowApiKey
        }
      })
      fetchDocuments()
    } catch (err) {
      console.error('Error toggling status:', err)
      alert('Error al cambiar el estado.')
    }
  }

  const handleCopyMarkdown = () => {
    if (!selectedDoc) return
    const md = `# ${selectedDoc.title}\n\n${selectedDoc.content || ''}`
    navigator.clipboard.writeText(md)
    alert('Markdown copiado al portapapeles')
  }

  return (
    <div className="p-8 bg-surface min-h-[calc(100vh-80px)] overflow-y-auto">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
        <span>Pitayacore AI</span>
        <ChevronRight size={10} />
        <span className="text-brand-blue">Base de Conocimientos</span>
      </div>

      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-black font-display text-slate-800">Base de Conocimientos</h2>
          <p className="text-sm text-slate-500 mt-1">Gestiona protocolos operativos y respuestas validadas del sistema.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchDocuments}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Sincronizar
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white font-bold rounded-xl text-xs shadow-lg shadow-brand-blue/20 hover:opacity-90 transition-all"
          >
            <Plus size={16} />
            Crear Nuevo Documento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Main Content: Table */}
        <div className="col-span-12 lg:col-span-9">
          <div className="dashboard-card bg-white overflow-hidden shadow-xl shadow-slate-200/50">
            {/* Filters Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50/50">
              <div className="flex gap-1">
                <TabButton label="Todos" active={true} />
                <TabButton label="Protocolos" />
                <TabButton label="Guías Técnicas" />
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <span className="uppercase tracking-widest">Ordenar por:</span>
                <button className="text-slate-800 flex items-center gap-1 uppercase tracking-widest">Más reciente <ChevronRight size={12} className="rotate-90" /></button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-border">
                    <th className="px-6 py-4">Título del Documento</th>
                    <th className="px-6 py-4 text-center">Fragmentos</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Actualizado</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="animate-spin text-brand-blue" size={32} />
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando documentación...</p>
                        </div>
                      </td>
                    </tr>
                  ) : documents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        No se encontraron documentos en la base de conocimientos.
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <KnowledgeItem 
                        key={doc.id}
                        id={doc.id}
                        title={doc.title}
                        version={`v${doc.version} - ID: ${doc.id.substring(0, 8)}`}
                        chunks={doc._count?.chunks || 0}
                        status={doc.status}
                        updated={new Date(doc.updatedAt).toLocaleDateString()}
                        onDelete={() => handleDelete(doc.id)}
                        onReindex={() => handleReindex(doc.id)}
                        onView={() => fetchDocDetails(doc.id)}
                        onToggleStatus={() => handleToggleStatus(doc.id)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-border flex justify-between items-center bg-slate-50/30">
              <span className="text-[10px] font-bold text-slate-400">
                Mostrando {documents.length} documentos encontrados
              </span>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          {/* AI Assistant Box */}
          <div className="bg-brand-deep p-8 rounded-[32px] text-white shadow-2xl shadow-brand-deep/20 relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="font-black text-xl mb-3 font-display flex items-center gap-2">
                <Sparkles className="text-brand-blue" />
                Copilot KB
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                ¿Necesitas ayuda redactando un nuevo protocolo? Mi IA puede generar borradores técnicos basados en normativas ASC y BAP de inmediato.
              </p>
              <button 
                onClick={() => setIsCopilotModalOpen(true)}
                className="w-full py-4 bg-brand-blue text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-blue/30 hover:scale-[1.02] transition-all"
              >
                Arquitectar Nuevo MD
              </button>
            </div>
            <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-brand-blue/10 rounded-full blur-3xl" />
          </div>

          {/* Recent Activity */}
          <div className="dashboard-card p-6 bg-white border border-slate-100 shadow-xl shadow-slate-200/50 rounded-[24px]">
            <div className="flex items-center gap-2 mb-6">
              <History size={16} className="text-amber-500" />
              <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-800">Actividad Reciente</h4>
            </div>
            <div className="space-y-6">
              <ActivityItem 
                icon={<Edit3 size={14} />}
                user="Sistema"
                action="ingestó masivamente .md"
                time="Hace unos instantes"
              />
              <ActivityItem 
                icon={<CheckCircle2 size={14} />}
                user="IA"
                action="validó 6 documentos"
                time="Hace 5 minutos"
                status="success"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Create/Upload Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-black font-display text-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                      <Plus size={24} />
                    </div>
                    Nuevo Documento
                  </h3>
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-1">Ingesta de conocimiento técnico</p>
                </div>
                <div className="flex gap-3">
                  <input 
                    type="file" 
                    accept=".pdf" 
                    id="pdf-upload" 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                  <label 
                    htmlFor="pdf-upload"
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    {isUploading ? 'Procesando...' : 'Subir PDF'}
                  </label>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-all">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                    Título del Documento
                  </label>
                  <div className="flex gap-3">
                    <input 
                      type="text"
                      placeholder="Ej: Protocolo de Inmunidad en Camarón"
                      className="flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all font-bold text-slate-700"
                      value={newDoc.title}
                      onChange={(e) => setNewDoc(prev => ({ ...prev, title: e.target.value }))}
                    />
                    <button 
                      onClick={handleAiGenerate}
                      disabled={isGenerating || !newDoc.title}
                      className="px-6 bg-brand-deep text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-deep/20 hover:scale-[1.05] transition-all flex items-center gap-2 disabled:opacity-50"
                      title="Generar Contenido con IA"
                    >
                      {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} className="text-brand-blue" />}
                      {isGenerating ? 'Generando...' : 'Generar con IA'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                    Contenido del Documento (.md o texto plano)
                  </label>
                  <textarea 
                    rows={10}
                    placeholder="Pega aquí el contenido técnico del protocolo o genéralo con IA..."
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all resize-none font-medium text-slate-600 leading-relaxed"
                    value={newDoc.content}
                    onChange={(e) => setNewDoc(prev => ({ ...prev, content: e.target.value }))}
                  />
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-4 text-slate-400 hover:text-slate-600 font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  Descartar
                </button>
                <button 
                  onClick={handleCreate}
                  disabled={isSaving || !newDoc.title || !newDoc.content}
                  className="px-10 py-4 bg-brand-blue text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-blue/30 disabled:opacity-50 flex items-center gap-3 hover:scale-[1.02] transition-all"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Ingestar y Indexar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Copilot KB Modal */}
      <AnimatePresence>
        {isCopilotModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCopilotModalOpen(false)}
              className="absolute inset-0 bg-brand-deep/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative bg-white w-full max-w-4xl h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-white/20"
            >
              <div className="p-10 bg-brand-deep text-white flex justify-between items-center relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-brand-blue/20 flex items-center justify-center border border-brand-blue/30 shadow-inner">
                      <Sparkles className="text-brand-blue" size={28} />
                    </div>
                    <h3 className="text-3xl font-black font-display tracking-tight">Copilot Architect</h3>
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] ml-1">Generador de Protocolos Maestros (ASC/BAP Standards)</p>
                </div>
                <button onClick={() => setIsCopilotModalOpen(false)} className="p-4 hover:bg-white/10 rounded-2xl transition-all relative z-10 border border-white/10">
                  <X size={28} className="text-slate-400" />
                </button>
                <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-brand-blue/20 rounded-full blur-[100px]" />
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-10">
                <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 shadow-inner">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">
                    Tema o Concepto a Arquitectar
                  </label>
                  <div className="flex gap-4">
                    <input 
                      type="text"
                      placeholder="Ej: Bioseguridad en Sistemas de Recirculación (RAS)..."
                      className="flex-1 px-8 py-5 bg-white border border-slate-200 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all font-black text-slate-700 text-lg shadow-sm"
                      value={newDoc.title}
                      onChange={(e) => setNewDoc(prev => ({ ...prev, title: e.target.value }))}
                    />
                    <button 
                      onClick={handleAiGenerate}
                      disabled={isGenerating || !newDoc.title}
                      className="px-10 bg-brand-blue text-white rounded-[20px] font-black text-[12px] uppercase tracking-widest shadow-2xl shadow-brand-blue/40 hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                      {isGenerating ? 'Arquitectando...' : 'Iniciar Arquitectura'}
                    </button>
                  </div>
                </div>

                <div className="relative group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">
                    Protocolo Maestro Generado
                  </label>
                  <div className="relative">
                    <textarea 
                      rows={15}
                      placeholder="El Copilot generará aquí un protocolo técnico alineado con estándares internacionales..."
                      className="w-full px-8 py-8 bg-slate-50 border border-slate-200 rounded-[32px] focus:outline-none focus:ring-4 focus:ring-brand-blue/10 focus:border-brand-blue transition-all resize-none font-medium text-slate-600 leading-relaxed shadow-inner min-h-[400px]"
                      value={newDoc.content}
                      onChange={(e) => setNewDoc(prev => ({ ...prev, content: e.target.value }))}
                    />
                    {isGenerating && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-[32px] flex items-center justify-center flex-col gap-4">
                        <div className="w-16 h-16 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
                        <p className="font-black text-[10px] text-brand-deep uppercase tracking-[0.3em]">Consultando Normativas ASC/BAP...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-end gap-6">
                <button 
                  onClick={() => setIsCopilotModalOpen(false)}
                  className="px-10 py-5 text-slate-400 hover:text-slate-600 font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  Cancelar Diseño
                </button>
                <button 
                  onClick={handleCreate}
                  disabled={isSaving || !newDoc.title || !newDoc.content}
                  className="px-12 py-5 bg-brand-deep text-white rounded-[24px] font-black text-[12px] uppercase tracking-widest shadow-2xl shadow-brand-deep/30 disabled:opacity-50 flex items-center gap-4 hover:scale-[1.02] transition-all border border-white/10"
                >
                  {isSaving ? <Loader2 size={22} className="animate-spin" /> : <Save size={22} className="text-brand-blue" />}
                  Publicar en Base de Conocimientos
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details Modal (Vectors & Source) */}
      <AnimatePresence>
        {isDetailModalOpen && selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-5xl h-[85vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-black font-display text-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                      <Database size={24} />
                    </div>
                    {selectedDoc.title}
                  </h3>
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-1">Inspección de Vectores y Fuentes</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleCopyMarkdown}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    <Copy size={16} />
                    Copiar Markdown
                  </button>
                  <button onClick={() => setIsDetailModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-2xl transition-all">
                    <X size={24} className="text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 gap-8">
                {/* Source Chunks */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Hash size={16} className="text-slate-400" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fragmentos de Origen (MySQL)</h4>
                    </div>
                  </div>
                  {selectedDoc.chunks?.map((chunk: any, i: number) => (
                    <div key={i} className="p-6 bg-slate-50 border border-slate-100 rounded-2xl relative group/chunk">
                      <div className="flex justify-between items-center mb-3">
                        <div className="text-[9px] font-black text-brand-blue uppercase tracking-widest">Chunk #{i+1}</div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(chunk.content);
                            alert('Copiado al portapapeles');
                          }}
                          className="p-1.5 bg-white border border-slate-200 rounded-lg opacity-0 group-hover/chunk:opacity-100 transition-all hover:bg-brand-blue hover:text-white"
                        >
                          <Database size={12} />
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{chunk.content}</p>
                    </div>
                  ))}
                </div>

                {/* Vectors */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Activity size={16} className="text-slate-400" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Embeddings Vectoriales (PostgreSQL)</h4>
                    </div>
                  </div>
                  {!selectedDoc.vectors || selectedDoc.vectors.length === 0 ? (
                    <div className="p-12 border-2 border-dashed border-slate-100 rounded-[32px] flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mb-4">
                        <Activity size={24} />
                      </div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No se encontraron vectores</p>
                      <p className="text-[10px] text-slate-400 mt-2 max-w-[200px]">Este documento existe en la DB pero no ha sido indexado en el motor de búsqueda.</p>
                      <button 
                        onClick={() => {
                          handleReindex(selectedDoc.id)
                          setIsDetailModalOpen(false)
                        }}
                        className="mt-6 px-6 py-3 bg-brand-blue/10 text-brand-blue text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-brand-blue hover:text-white transition-all"
                      >
                        Reindexar Ahora
                      </button>
                    </div>
                  ) : (
                    selectedDoc.vectors.map((vec: any, i: number) => (
                      <div key={i} className="p-6 bg-brand-deep text-slate-300 rounded-2xl border border-white/5 font-mono text-[10px] relative group/vec">
                        <div className="text-[9px] font-black text-brand-blue uppercase tracking-widest mb-3 flex justify-between items-center">
                          <span>Vector ID: {vec.id.substring(0, 8)}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-[8px]">pgvector record</span>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(vec.embedding));
                                alert('Vector copiado (JSON)');
                              }}
                              className="p-1 bg-white/10 rounded-md opacity-0 group-hover/vec:opacity-100 transition-all hover:bg-brand-blue hover:text-white"
                            >
                              <Activity size={10} />
                            </button>
                          </div>
                        </div>
                        <div className="max-h-40 overflow-y-auto break-all scrollbar-hide opacity-80 leading-loose">
                          {Array.isArray(vec.embedding) ? JSON.stringify(vec.embedding) : vec.embedding}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <div className="flex gap-6">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Dimensiones</span>
                    <span className="text-xs font-black text-slate-700">1536 (Gemini)</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Motor</span>
                    <span className="text-xs font-black text-slate-700">pgvector @ HeteroDB</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-10 py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-700 transition-all"
                >
                  Cerrar Inspección
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TabButton({ label, active }: any) {
  return (
    <button className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-white text-brand-blue shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>
      {label}
    </button>
  )
}

function KnowledgeItem({ title, version, chunks, status, updated, onDelete, onReindex, onView, onToggleStatus }: any) {
  return (
    <tr className="group hover:bg-slate-50/50 transition-all">
      <td className="px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-blue-light group-hover:text-brand-blue transition-all">
            <FileText size={20} />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xs text-slate-800 leading-tight group-hover:text-brand-blue transition-all cursor-pointer" onClick={onView}>{title}</span>
            <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{version}</span>
          </div>
        </div>
      </td>
      <td className="px-6 py-5 text-center">
        <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-500">{chunks} Chunks</span>
      </td>
      <td className="px-6 py-5">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleStatus(); }}
          className="flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all"
        >
          <div className={`w-1.5 h-1.5 rounded-full ${status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          <span className={`text-[10px] font-black uppercase tracking-widest ${status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'}`}>
            {status === 'ACTIVE' ? 'Publicado' : 'Inactivo'}
          </span>
        </button>
      </td>
      <td className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
        {updated}
      </td>
      <td className="px-6 py-5 text-right">
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
          <button 
            onClick={onView}
            className="p-2 hover:bg-slate-100 text-slate-400 rounded-lg transition-all"
            title="Ver Detalles"
          >
            <Eye size={16} />
          </button>
          <button 
            onClick={onReindex}
            className="p-2 hover:bg-brand-blue/10 text-brand-blue rounded-lg transition-all"
            title="Reindexar"
          >
            <RefreshCw size={16} />
          </button>
          <button 
            onClick={onDelete}
            className="p-2 hover:bg-rose-50 text-rose-500 rounded-lg transition-all"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  )
}

function ActivityItem({ icon, user, action, time, status }: any) {
  return (
    <div className="flex gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${status === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-400'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold leading-tight text-slate-600">
          <span className="font-black text-slate-800 uppercase tracking-tighter">{user}</span> {action}
        </p>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{time}</p>
      </div>
    </div>
  )
}



