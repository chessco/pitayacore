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
  Gauge,
  Globe,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Play,
  Settings,
  Clock
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTenant } from '../../contexts/TenantContext'
import { motion, AnimatePresence } from 'motion/react'
import axios from 'axios'

export function SkillsManager() {
  const { selectedTenant, flowApiKey, role } = useTenant()
  const [skills, setSkills] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingSkill, setEditingSkill] = useState<any>(null)
  const [newPrompt, setNewPrompt] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [versions, setVersions] = useState<any[]>([])
  const [activeModalTab, setActiveModalTab] = useState<'prompt' | 'history' | 'webhook'>('prompt')

  // Webhook Configuration State
  const [targetAgent, setTargetAgent] = useState<any>(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [isTestingWebhook, setIsTestingWebhook] = useState(false)
  const [testWebhookResult, setTestWebhookResult] = useState<{
    success: boolean
    message?: string
    statusCode?: number
    error?: string
    data?: any
  } | null>(null)
  const [webhookSavedMessage, setWebhookSavedMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014'

  useEffect(() => {
    fetchSkills()
  }, [selectedTenant])

  const isWebhookSkill = (skill: any) => {
    if (!skill) return false
    const name = (skill.name || '').toLowerCase()
    const slug = (skill.slug || '').toLowerCase()
    return slug.includes('probuyer') || slug.includes('webhook') || name.includes('webhook') || name.includes('pro buyer')
  }

  const fetchSkills = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
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

  const fetchAgentWebhookConfig = async (skill: any) => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${apiUrl}/api/agents`, {
        headers: {
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      })
      const agents = res.data || []
      const found = agents.find((a: any) => 
        a.slug === 'icellshop-autorizaciones' || 
        a.config?.assignedSkills?.includes(skill.id) ||
        (a.name || '').toLowerCase().includes('autorizaciones')
      ) || agents[0]

      if (found) {
        setTargetAgent(found)
        const whConfig = found.config?.webhookConfig || {}
        setWebhookUrl(whConfig.url || '')
        setWebhookSecret(whConfig.secret || '')
      }
    } catch (err) {
      console.error('Error fetching agent for webhook:', err)
    }
  }

  const fetchVersions = async (skillId: string) => {
    try {
      const token = localStorage.getItem('token')
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

  const handleOpenEdit = (skill: any, defaultTab: 'prompt' | 'webhook' = 'prompt') => {
    setEditingSkill(skill)
    setNewPrompt(skill.prompt || '')
    setTestWebhookResult(null)
    setWebhookSavedMessage(null)

    if (isWebhookSkill(skill)) {
      setActiveModalTab(defaultTab === 'webhook' ? 'webhook' : 'webhook')
      fetchAgentWebhookConfig(skill)
    } else {
      setActiveModalTab('prompt')
    }
    fetchVersions(skill.id)
  }

  const handleUpdatePrompt = async () => {
    if (!editingSkill) return
    setIsSaving(true)
    try {
      const token = localStorage.getItem('token')
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

  const handleSaveWebhook = async () => {
    if (!targetAgent) {
      setWebhookSavedMessage({ type: 'error', text: 'No se encontró el agente asociado para guardar la configuración.' })
      return
    }
    setIsSaving(true)
    setWebhookSavedMessage(null)
    try {
      const token = localStorage.getItem('token')
      const newConfig = {
        ...(targetAgent.config || {}),
        webhookConfig: {
          url: webhookUrl.trim(),
          secret: webhookSecret.trim(),
          enabled: true,
        },
      }

      await axios.patch(
        `${apiUrl}/api/agents/${targetAgent.id}`,
        { config: newConfig },
        {
          headers: {
            'x-tenant-id': selectedTenant?.id || '',
            'x-api-key': flowApiKey,
            'Authorization': `Bearer ${token}`
          }
        }
      )
      setWebhookSavedMessage({ type: 'success', text: `Configuración guardada en ${targetAgent.name}` })
    } catch (err: any) {
      setWebhookSavedMessage({ type: 'error', text: 'Error al guardar la configuración del Webhook' })
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
    if (!targetAgent) {
      setTestWebhookResult({
        success: false,
        message: 'No se encontró el agente objetivo para ejecutar la prueba.',
      })
      return
    }
    setIsTestingWebhook(true)
    setTestWebhookResult(null)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${apiUrl}/api/agents/${targetAgent.id}/test-webhook`,
        {
          webhookUrl: webhookUrl.trim(),
          webhookSecret: webhookSecret.trim(),
        },
        {
          headers: {
            'x-tenant-id': selectedTenant?.id || '',
            'x-api-key': flowApiKey,
            'Authorization': `Bearer ${token}`
          },
        }
      )
      setTestWebhookResult(res.data)
    } catch (err: any) {
      setTestWebhookResult({
        success: false,
        message: err.response?.data?.message || err.message,
      })
    } finally {
      setIsTestingWebhook(false)
    }
  }

  const handleRollback = async (versionId: string) => {
    if (!editingSkill) return
    setIsSaving(true)
    try {
      const token = localStorage.getItem('token')
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
    try {
      const token = localStorage.getItem('token')
      await fetch(`${apiUrl}/api/skills/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey
        },
        body: JSON.stringify({ status })
      })
      fetchSkills()
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  return (
    <div className="p-8 bg-surface min-h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-black font-display text-slate-800">Gestor de Habilidades</h2>
          <p className="text-sm text-slate-500 mt-1">Configura y supervisa las capacidades y conectores de IA del ecosistema.</p>
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
            <span className="text-3xl font-black text-slate-800">99.0%</span>
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1.5">Óptimo</span>
          </div>
        </div>
        <div className="dashboard-card p-5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Latencia Media</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-slate-800">382<span className="text-lg">ms</span></span>
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
                'webhook': <Globe size={22} />,
                'autorización': <Zap size={22} />,
              }
              const name = skill.name.toLowerCase()
              const isWebhook = isWebhookSkill(skill)
              const icon = isWebhook ? <Zap size={22} /> : (Object.entries(iconMap).find(([k]) => name.includes(k))?.[1] || <Zap size={22} />)
              const colorClass = isWebhook ? 'bg-blue-50 text-blue-600' : 'bg-brand-blue/10 text-brand-blue'

              return (
                <SkillCard
                  key={skill.id}
                  icon={icon}
                  iconColor={colorClass}
                  name={skill.name}
                  version={skill.version}
                  status={skill.status === 'PRODUCTION' ? 'Activo' : 'En Pruebas'}
                  isPreProd={skill.status !== 'PRODUCTION'}
                  isWebhook={isWebhook}
                  description={skill.description || "Protocolo técnico especializado."}
                  successRate={skill.status === 'PRODUCTION' ? '99.0' : '88.5'}
                  latency={skill.status === 'PRODUCTION' ? 382 : 450}
                  onEdit={() => handleOpenEdit(skill, isWebhook ? 'webhook' : 'prompt')}
                  onConfigureWebhook={() => handleOpenEdit(skill, 'webhook')}
                  onDeploy={() => {
                    const newStatus = skill.status === 'PRODUCTION' ? 'PRE_PRODUCTION' : 'PRODUCTION'
                    handleUpdateStatus(skill.id, newStatus)
                  }}
                />
              )
            })}
        </div>
      )}

      {/* Edit Prompt & Webhook Modal */}
      <AnimatePresence>
        {editingSkill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Header */}
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-blue rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-blue/20">
                    {isWebhookSkill(editingSkill) ? <Globe size={24} /> : <Zap size={24} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">{editingSkill.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Protocolo de Capacidad • v{editingSkill.version}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingSkill(null)} 
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-8 flex gap-6 bg-slate-50/50 border-b border-slate-100">
                {isWebhookSkill(editingSkill) && (
                  <button 
                    onClick={() => setActiveModalTab('webhook')} 
                    className={`py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                      activeModalTab === 'webhook' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Settings size={13} />
                    Configuración Webhook (URL & Secreto)
                  </button>
                )}
                <button 
                  onClick={() => setActiveModalTab('prompt')} 
                  className={`py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                    activeModalTab === 'prompt' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <FileText size={13} />
                  Instrucciones Lógicas
                </button>
                <button 
                  onClick={() => setActiveModalTab('history')} 
                  className={`py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                    activeModalTab === 'history' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Clock size={13} />
                  Historial de Refinamiento
                </button>
              </div>

              {/* Content */}
              <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                {webhookSavedMessage && (
                  <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 ${
                    webhookSavedMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}>
                    {webhookSavedMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span className="text-xs font-bold">{webhookSavedMessage.text}</span>
                  </div>
                )}

                {activeModalTab === 'webhook' ? (
                  <div className="space-y-6">
                    {/* Info Card */}
                    <div className="p-5 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-start gap-4">
                      <div className="w-9 h-9 rounded-xl bg-brand-blue text-white flex items-center justify-center shrink-0 shadow-md shadow-brand-blue/20">
                        <Globe size={18} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                          Conector Webhook HTTP hacia Pro Buyer
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Cuando el agente interprete la respuesta del autorizador en WhatsApp, enviará automáticamente la decisión a este endpoint HTTP con la cabecera de autenticación <code className="bg-white px-1.5 py-0.5 rounded text-[11px] font-mono text-brand-blue border border-blue-200">x-pitayacore-secret</code>.
                        </p>
                        {targetAgent && (
                          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-white rounded-lg border border-blue-200 text-[10px] font-bold text-slate-600">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Agente Vinculado: <span className="text-brand-blue font-black">{targetAgent.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* URL Input */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Globe size={13} className="text-brand-blue" />
                        URL del Endpoint Webhook de Pro Buyer
                      </label>
                      <input
                        type="url"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://tu-ngrok-o-dominio.com/api/sales/authorizations/webhook"
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all shadow-sm"
                      />
                      <p className="text-[10px] text-slate-400">
                        Ruta objetivo: <code className="font-mono text-slate-600 font-bold">/api/sales/authorizations/webhook</code>
                      </p>
                    </div>

                    {/* Secret Input */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Key size={13} className="text-brand-blue" />
                        Llave Secreta Compartida (x-pitayacore-secret)
                      </label>
                      <div className="relative">
                        <input
                          type={showSecret ? 'text' : 'password'}
                          value={webhookSecret}
                          onChange={(e) => setWebhookSecret(e.target.value)}
                          placeholder="Ingresa la llave secreta configurada en tu .env de Pro Buyer"
                          className="w-full pl-5 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Debe coincidir exactamente con la variable de entorno <code className="font-mono text-slate-600 font-bold">PITAYACORE_WEBHOOK_SECRET</code> en Pro Buyer.
                      </p>
                    </div>

                    {/* Ping Test Button & Result */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-bold text-slate-700">Verificación de Conectividad en Tiempo Real</p>
                          <p className="text-[10px] text-slate-400">Envía un ping de prueba HTTP hacia el endpoint configurado.</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleTestWebhook}
                          disabled={isTestingWebhook || !webhookUrl}
                          className="px-4 py-2 bg-white border border-slate-200 hover:border-brand-blue text-slate-700 hover:text-brand-blue text-[11px] font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-40 shadow-sm"
                        >
                          {isTestingWebhook ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} className="fill-current" />}
                          Probar Conectividad
                        </button>
                      </div>

                      {testWebhookResult && (
                        <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                          testWebhookResult.success 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}>
                          {testWebhookResult.success ? (
                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="font-bold">
                              {testWebhookResult.success 
                                ? `¡Conexión Exitosa! Código HTTP: ${testWebhookResult.statusCode || 200}` 
                                : 'Error de Conectividad'}
                            </p>
                            <p className="text-[11px] mt-0.5 opacity-90">
                              {testWebhookResult.message || (testWebhookResult.success ? 'El webhook de Pro Buyer respondió correctamente al ping.' : testWebhookResult.error)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : activeModalTab === 'prompt' ? (
                  <div className="space-y-4">
                    {isWebhookSkill(editingSkill) && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Settings size={18} className="text-amber-600 shrink-0" />
                          <p className="text-xs text-amber-800 font-medium">
                            ¿Buscas configurar la <strong>URL</strong> o la <strong>Llave Secreta</strong>?
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveModalTab('webhook')}
                          className="px-3 py-1.5 bg-amber-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-amber-700 transition-all shadow-sm"
                        >
                          Ir a Configuración Webhook
                        </button>
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">
                        Lógica de Habilidad (System Prompt)
                      </label>
                      <textarea 
                        value={newPrompt}
                        onChange={(e) => setNewPrompt(e.target.value)}
                        className="w-full h-72 p-6 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-medium leading-relaxed focus:outline-none focus:border-brand-blue focus:bg-white transition-all custom-scrollbar resize-none"
                        placeholder="Define cómo debe ejecutarse esta habilidad..."
                      />
                    </div>
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

              {/* Footer */}
              <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                <button 
                  onClick={() => setEditingSkill(null)} 
                  className="flex-1 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all"
                >
                  Cerrar
                </button>

                {activeModalTab === 'webhook' ? (
                  <button 
                    onClick={handleSaveWebhook}
                    disabled={isSaving}
                    className="flex-[2] py-3.5 bg-brand-blue text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-brand-blue/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    Guardar Configuración de Webhook
                  </button>
                ) : activeModalTab === 'prompt' ? (
                  <button 
                    onClick={handleUpdatePrompt}
                    disabled={isSaving}
                    className="flex-[2] py-3.5 bg-brand-blue text-white rounded-2xl text-xs font-bold shadow-xl shadow-brand-blue/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Actualizar Capacidad
                  </button>
                ) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SkillCard({ 
  icon, 
  iconColor, 
  name, 
  version, 
  status, 
  isPreProd, 
  isWebhook, 
  description, 
  successRate, 
  latency, 
  onEdit, 
  onConfigureWebhook, 
  onDeploy 
}: any) {
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
        {isWebhook ? (
          <>
            <button 
              onClick={onConfigureWebhook}
              className="flex-1 py-2.5 bg-brand-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-brand-blue/20 hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Settings size={13} />
              Configurar Webhook
            </button>
            <button 
              onClick={onEdit}
              className="py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:border-brand-blue hover:text-brand-blue transition-all flex items-center justify-center"
              title="Editar Prompts"
            >
              <FileText size={13} />
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
