import { 
  Plus, 
  Settings, 
  ShieldCheck, 
  Activity, 
  Zap, 
  Clock, 
  FileText, 
  ChevronRight,
  Sparkles,
  Droplets,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Loader2,
  Thermometer,
  Brain,
  Wand2,
  Bot,
  Globe,
  Eye,
  EyeOff,
  Link2,
  Shield,
  Send,
  RefreshCw,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTenant } from '../../contexts/TenantContext'
import { motion, AnimatePresence } from 'motion/react'
import axios from 'axios'

export function AgentsManager() {
  const { selectedTenant, flowApiKey } = useTenant()
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014'
  
  const [agents, setAgents] = useState<any[]>([])
  const [selectedAgent, setSelectedAgent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [modalTab, setModalTab] = useState<'prompt' | 'skills' | 'history'>('prompt')
  
  const [allSkills, setAllSkills] = useState<any[]>([])
  const [versions, setVersions] = useState<any[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createAgentData, setCreateAgentData] = useState({ name: '', slug: '', prompt: '' })

  // Webhook technical capability state
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [isTestingWebhook, setIsTestingWebhook] = useState(false)
  const [testWebhookResult, setTestWebhookResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    if (selectedAgent) {
      const cfg = selectedAgent.config?.webhookConfig || {}
      setWebhookUrl(cfg.url || '')
      setWebhookSecret(cfg.secret || '')
      setTestWebhookResult(null)
    }
  }, [selectedAgent])

  useEffect(() => {
    fetchAgents()
  }, [selectedTenant])

  const fetchAgents = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${apiUrl}/api/agents`, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      })
      setAgents(Array.isArray(response.data) ? response.data : [])
      
      // Fetch skills for assignments
      const skillsRes = await axios.get(`${apiUrl}/api/skills`, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      })
      setAllSkills(Array.isArray(skillsRes.data) ? skillsRes.data : [])
    } catch (error) {
      console.error('Error fetching agents:', error)
      setAgents([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedAgent) return
    setIsSaving(true)
    setMessage(null)
    try {
      const token = localStorage.getItem('token')
      await axios.patch(`${apiUrl}/api/agents/${selectedAgent.id}`, {
        name: selectedAgent.name,
        prompt: selectedAgent.prompt,
        description: selectedAgent.description
      }, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      })
      setMessage({ type: 'success', text: 'Agente actualizado con éxito' })
      fetchAgents()
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar los cambios' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateAgent = async () => {
    if (!createAgentData.name || !createAgentData.slug || !createAgentData.prompt) return
    setIsSaving(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post(`${apiUrl}/api/agents`, createAgentData, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      })
      await fetchAgents()
      setIsCreateModalOpen(false)
      setCreateAgentData({ name: '', slug: '', prompt: '' })
    } catch (error) {
      console.error('Error creating agent:', error)
      alert('Error al crear el agente.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeploy = async (agentId: string) => {
    setIsSaving(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post(`${apiUrl}/api/agents/${agentId}/deploy`, {}, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      })
      fetchAgents()
      setMessage({ type: 'success', text: 'Agente desplegado en producción' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al desplegar agente' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleSkill = async (skillId: string) => {
    if (!selectedAgent) return
    setIsSaving(true)
    
    const currentConfig = selectedAgent.config || {}
    const assignedSkills = currentConfig.assignedSkills || []
    
    const newAssignedSkills = assignedSkills.includes(skillId)
      ? assignedSkills.filter((id: string) => id !== skillId)
      : [...assignedSkills, skillId]
    
    const newConfig = { ...currentConfig, assignedSkills: newAssignedSkills }
    
    try {
      const token = localStorage.getItem('token')
      const response = await axios.patch(`${apiUrl}/api/agents/${selectedAgent.id}`, {
        config: newConfig
      }, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      })
      setSelectedAgent({ ...selectedAgent, config: response.data.config })
      fetchAgents()
    } catch (error) {
      console.error('Error toggling skill:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveWebhookConfig = async () => {
    if (!selectedAgent) return
    setIsSaving(true)
    setMessage(null)
    try {
      const token = localStorage.getItem('token')
      const currentConfig = selectedAgent.config || {}
      const newConfig = {
        ...currentConfig,
        webhookConfig: {
          url: webhookUrl.trim(),
          secret: webhookSecret.trim(),
          enabled: true,
        },
      }

      const res = await axios.patch(
        `${apiUrl}/api/agents/${selectedAgent.id}`,
        { config: newConfig },
        {
          headers: {
            'x-tenant-id': selectedTenant?.id || '',
            'x-api-key': flowApiKey,
            Authorization: `Bearer ${token}`,
          },
        }
      )
      setSelectedAgent({ ...selectedAgent, config: res.data.config })
      setMessage({ type: 'success', text: 'Configuración técnica del Webhook guardada exitosamente' })
      fetchAgents()
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Error al guardar la configuración del Webhook' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestWebhook = async () => {
    if (!webhookUrl) {
      setTestWebhookResult({
        success: false,
        message: 'Por favor ingresa la URL del webhook antes de probar.',
      })
      return
    }
    setIsTestingWebhook(true)
    setTestWebhookResult(null)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${apiUrl}/api/agents/${selectedAgent.id}/test-webhook`,
        {
          webhookUrl: webhookUrl.trim(),
          webhookSecret: webhookSecret.trim(),
        },
        {
          headers: {
            'x-tenant-id': selectedTenant?.id || '',
            'x-api-key': flowApiKey,
            Authorization: `Bearer ${token}`,
          },
        }
      )
      if (res.data?.success) {
        setTestWebhookResult({
          success: true,
          message: `Conexión exitosa (HTTP ${res.data.statusCode || 200}): Pro Buyer recibió la solicitud de prueba correctamente.`,
        })
      } else {
        setTestWebhookResult({
          success: false,
          message:
            res.data?.error ||
            `Error HTTP ${res.data?.statusCode || 500}: No se pudo verificar el webhook.`,
        })
      }
    } catch (err: any) {
      setTestWebhookResult({
        success: false,
        message:
          err.response?.data?.message ||
          err.message ||
          'Error al conectar con el servidor de webhook.',
      })
    } finally {
      setIsTestingWebhook(false)
    }
  }

  return (
    <div className="p-8 bg-surface min-h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black font-display text-slate-800 flex items-center gap-3">
              <Brain className="text-brand-blue" size={32} />
              Orquestador de Staff Virtual
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-slate-500 font-medium">Gestionando agentes para:</p>
              <span className="px-3 py-0.5 bg-brand-blue/10 text-brand-blue text-[10px] font-black uppercase tracking-widest rounded-full border border-brand-blue/10 shadow-sm shadow-brand-blue/5">
                {selectedTenant?.name || 'Inquilino por defecto'}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-brand-deep text-white font-bold rounded-2xl shadow-xl shadow-brand-deep/20 hover:opacity-90 transition-all"
          >
            <Plus size={20} />
            Contratar Nuevo Perfil
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="font-bold uppercase tracking-widest text-[10px]">Llamando al staff...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {agents.map(agent => (
              <AgentCard 
                key={agent.id}
                agent={agent}
                isSelected={selectedAgent?.id === agent.id}
                allSkills={allSkills}
                onSelect={() => {
                  setSelectedAgent(agent)
                  setModalTab('prompt')
                }}
                onDeploy={() => handleDeploy(agent.id)}
              />
            ))}
            
            <div 
              onClick={() => setIsCreateModalOpen(true)}
              className="border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 flex flex-col items-center justify-center group cursor-pointer hover:bg-white hover:border-brand-blue/30 transition-all min-h-[300px] bg-slate-50/30"
            >
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 group-hover:text-brand-blue group-hover:shadow-lg transition-all text-slate-300">
                <Plus size={28} />
              </div>
              <p className="font-black text-slate-300 group-hover:text-brand-blue uppercase tracking-widest text-[10px]">Nuevo Perfil de Staff</p>
            </div>
          </div>
        )}
      </div>

      {/* Editor Modal Overlay */}
      <AnimatePresence>
        {selectedAgent && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-brand-blue text-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-brand-blue/20">
                    <Wand2 size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{selectedAgent.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Persona & Misión • v{selectedAgent.version}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${
                        selectedAgent.status === 'PRODUCTION' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {selectedAgent.status === 'PRODUCTION' ? 'Producción' : 'Pre-Producción'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-8 py-4 bg-brand-deep text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 shadow-xl shadow-brand-deep/20"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Guardar Cambios
                    </button>
                    <button 
                        onClick={() => setSelectedAgent(null)}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-400 hover:bg-slate-50 transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="px-8 bg-slate-50/30 flex gap-10 border-b border-slate-100">
                {[
                  { id: 'prompt', label: 'Personalidad (Prompt)', icon: Sparkles },
                  { id: 'skills', label: 'Capacidades Técnicas', icon: Zap },
                  { id: 'history', label: 'Historial', icon: Clock }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setModalTab(tab.id as any)}
                    className={`py-6 text-[11px] font-black uppercase tracking-widest border-b-4 transition-all flex items-center gap-2 ${
                      modalTab === tab.id ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-white">
                {message && (
                  <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}>
                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span className="text-sm font-bold">{message.text}</span>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {modalTab === 'prompt' ? (
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        className="space-y-8"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Público</label>
                          <input 
                            type="text"
                            value={selectedAgent.name}
                            onChange={(e) => setSelectedAgent({ ...selectedAgent, name: e.target.value })}
                            className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand-blue transition-all"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificador del Motor (Slug)</label>
                          <input 
                            type="text"
                            value={selectedAgent.slug}
                            readOnly
                            className="w-full px-6 py-4 bg-slate-100 border-none rounded-2xl text-sm font-bold text-slate-400 cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Misión y Personalidad Maestro (Prompt)</label>
                        <div className="relative">
                            <textarea 
                                value={selectedAgent.prompt}
                                onChange={(e) => setSelectedAgent({ ...selectedAgent, prompt: e.target.value })}
                                className="w-full min-h-[400px] p-8 bg-brand-deep text-blue-50 border-none rounded-[2.5rem] text-sm font-medium leading-relaxed focus:ring-2 focus:ring-brand-blue transition-all font-mono custom-scrollbar resize-none shadow-inner"
                            />
                            <div className="absolute top-4 right-8 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
                                <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Nano Banana Engine</span>
                            </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : modalTab === 'skills' ? (
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-8"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Matriz de Habilidades y Capacidades</h4>
                              <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Activa o desactiva capacidades y configura sus parámetros de integración</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {allSkills.map(skill => {
                                const isAssigned = selectedAgent.config?.assignedSkills?.includes(skill.id);
                                return (
                                    <div key={skill.id} className={`p-6 rounded-[2rem] border transition-all flex items-center justify-between ${
                                        isAssigned ? 'bg-white border-brand-blue/30 shadow-lg shadow-brand-blue/5' : 'bg-slate-50 border-slate-100 opacity-60'
                                    }`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                                isAssigned ? 'bg-brand-blue/10 text-brand-blue' : 'bg-slate-200 text-slate-400'
                                            }`}>
                                                {skill.slug?.includes('probuyer') || skill.slug?.includes('webhook') ? (
                                                  <Globe size={20} />
                                                ) : (
                                                  <Zap size={20} />
                                                )}
                                            </div>
                                            <div>
                                                <h5 className="font-bold text-sm text-slate-800">{skill.name}</h5>
                                                <p className="text-[10px] text-slate-400 font-medium">v{skill.version || '1.0'} {skill.category ? `• ${skill.category}` : ''}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleToggleSkill(skill.id)}
                                            className={`w-12 h-7 rounded-full p-1 transition-all ${isAssigned ? 'bg-brand-blue' : 'bg-slate-200'}`}
                                            title={isAssigned ? "Desactivar capacidad" : "Activar capacidad"}
                                        >
                                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-all ${isAssigned ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Panel de Configuración Técnica de Webhook Pro Buyer */}
                        {(selectedAgent.slug === 'icellshop-autorizaciones' ||
                          selectedAgent.config?.assignedSkills?.some((id: string) => {
                            const s = allSkills.find((item: any) => item.id === id);
                            return s?.slug?.includes('probuyer') || s?.name?.includes('Pro Buyer');
                          })) && (
                          <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/90 shadow-sm space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center">
                                  <Globe size={22} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-black text-sm text-slate-800 uppercase tracking-wider">
                                      Webhook HTTP de Autorización (Pro Buyer)
                                    </h5>
                                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 border border-emerald-200">
                                      Capacidad Activa
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 font-medium">
                                    Llama a Pro Buyer con el resultado de la autorización al procesar la respuesta del autorizador en WhatsApp.
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono font-bold text-slate-400 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                                POST /api/sales/authorizations/webhook
                              </span>
                            </div>

                            {/* Inputs de Configuración */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                  <Globe size={12} className="text-brand-blue" />
                                  URL del Webhook de Pro Buyer
                                </label>
                                <input
                                  type="text"
                                  value={webhookUrl}
                                  onChange={(e) => setWebhookUrl(e.target.value)}
                                  placeholder="https://[TU-DOMINIO]/api/sales/authorizations/webhook"
                                  className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all shadow-sm"
                                />
                                <p className="text-[10px] text-slate-400 ml-1">
                                  Endpoint completo donde Pro Buyer escucha las decisiones de autorización.
                                </p>
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                  <ShieldCheck size={12} className="text-brand-blue" />
                                  Secret de Autenticación (Header x-pitayacore-secret)
                                </label>
                                <div className="relative">
                                  <input
                                    type={showSecret ? 'text' : 'password'}
                                    value={webhookSecret}
                                    onChange={(e) => setWebhookSecret(e.target.value)}
                                    placeholder="••••••••••••••••••••"
                                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all shadow-sm pr-12"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowSecret(!showSecret)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                  >
                                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>
                                </div>
                                <p className="text-[10px] text-slate-400 ml-1">
                                  Debe coincidir exactamente con el valor configurado en Pro Buyer (Ajustes &gt; Integraciones).
                                </p>
                              </div>
                            </div>

                            {/* Alerta de Resultado de Prueba */}
                            {testWebhookResult && (
                              <div
                                className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${
                                  testWebhookResult.success
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {testWebhookResult.success ? (
                                  <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                                ) : (
                                  <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
                                )}
                                <span>{testWebhookResult.message}</span>
                              </div>
                            )}

                            {/* Schema Preview */}
                            <div className="p-4 bg-slate-900 rounded-2xl text-[11px] text-blue-100 font-mono space-y-1">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Payload Estructurado Enviado por el Agente:
                              </p>
                              <pre className="text-[10px] text-emerald-400 overflow-x-auto custom-scrollbar">
{`{
  "authorizationId": "string (UUID)",
  "action": "APPROVE" | "APPROVE_PARTIAL" | "REJECT",
  "partialAmount": 300,
  "responseNote": "Texto original del autorizador",
  "authorizedByPhone": "521XXXXXXXXXX"
}`}
                              </pre>
                            </div>

                            {/* Botones de Acción */}
                            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                              <button
                                type="button"
                                onClick={handleTestWebhook}
                                disabled={isTestingWebhook || !webhookUrl}
                                className="px-5 py-3 rounded-2xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                              >
                                {isTestingWebhook ? (
                                  <>
                                    <Loader2 size={14} className="animate-spin text-brand-blue" />
                                    Probando Webhook...
                                  </>
                                ) : (
                                  <>
                                    <Activity size={14} className="text-brand-blue" />
                                    Probar Conectividad
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={handleSaveWebhookConfig}
                                disabled={isSaving}
                                className="px-6 py-3 rounded-2xl text-xs font-bold bg-brand-deep text-white hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-brand-deep/20 disabled:opacity-50"
                              >
                                {isSaving ? (
                                  <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Guardando...
                                  </>
                                ) : (
                                  <>
                                    <Save size={14} />
                                    Guardar Configuración Técnica
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                    </motion.div>
                  ) : (
                    <div className="text-center py-20">
                        <Clock className="mx-auto text-slate-200 mb-4" size={48} />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Historial de versiones próximamente</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-deep/10 text-brand-deep rounded-xl flex items-center justify-center">
                    <Plus size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Contratar Agente</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Define el rol de tu colaborador virtual</p>
                  </div>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)}><X size={20} className="text-slate-400" /></button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Nombre</label>
                    <input 
                      type="text"
                      value={createAgentData.name}
                      onChange={(e) => setCreateAgentData({...createAgentData, name: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:border-brand-blue transition-all"
                      placeholder="Ej: Don Juan"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Slug</label>
                    <input 
                      type="text"
                      value={createAgentData.slug}
                      onChange={(e) => setCreateAgentData({...createAgentData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:border-brand-blue transition-all"
                      placeholder="ej: marketing-pro"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Misión Inicial</label>
                  <textarea 
                    value={createAgentData.prompt}
                    onChange={(e) => setCreateAgentData({...createAgentData, prompt: e.target.value})}
                    className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:border-brand-blue transition-all resize-none"
                    placeholder="Describe cómo debe actuar..."
                  />
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 flex gap-4">
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-400"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreateAgent}
                  disabled={isSaving || !createAgentData.name}
                  className="flex-1 py-4 bg-brand-deep text-white rounded-2xl text-sm font-bold shadow-xl shadow-brand-deep/20"
                >
                  {isSaving ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Crear Perfil de Staff'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AgentCard({ agent, isSelected, allSkills, onSelect, onDeploy }: any) {
  const isProd = agent.status === 'PRODUCTION'
  const assignedSkills = allSkills.filter((s: any) => agent.config?.assignedSkills?.includes(s.id))

  return (
    <div 
        onClick={onSelect}
        className={`bg-white rounded-[2.5rem] border-2 flex flex-col overflow-hidden group transition-all hover:shadow-2xl hover:shadow-brand-blue/10 cursor-pointer ${
        isSelected ? 'border-brand-blue' : 'border-slate-50'
    }`}>
      <div className="p-8 flex-1">
        <div className="flex justify-between items-start mb-6">
          <div className="flex gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md border-2 border-white ring-4 ring-slate-50">
               <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=random`} alt={agent.name} />
            </div>
            <div>
              <h4 className="font-black text-slate-800 text-base">{agent.name}</h4>
              <p className="text-[10px] text-brand-blue font-black uppercase tracking-widest mt-0.5">{agent.slug}</p>
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${isProd ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
            {isProd ? 'Producción' : 'Entrenamiento'}
          </div>
        </div>
        
        <p className="text-xs text-slate-500 leading-relaxed mb-6 line-clamp-2 italic font-medium">
          {agent.description || "Asesor virtual especializado en optimización acuícola."}
        </p>

        <div className="space-y-3">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Capacidades Asignadas</p>
          <div className="flex flex-wrap gap-1.5">
            {assignedSkills.length > 0 ? assignedSkills.map((skill: any) => (
              <span key={skill.id} className="flex items-center gap-1 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-[9px] font-bold text-slate-500">
                <Zap size={10} className="text-brand-blue" />
                {skill.name}
              </span>
            )) : <span className="text-[9px] font-medium text-slate-300 italic">Sin habilidades asignadas</span>}
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-50/50 border-t border-slate-50 flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
        <button 
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-brand-blue hover:text-brand-blue transition-all"
        >
          Editar Persona
        </button>
        {!isProd && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDeploy(); }}
            className="px-4 py-3 bg-brand-deep text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg"
          >
            Activar
          </button>
        )}
      </div>
    </div>
  )
}
