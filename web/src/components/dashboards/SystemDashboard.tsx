import { BrandingSettings } from '../../modules/settings/BrandingSettings'
import { SystemSettingsPanel } from '../../modules/system/SystemSettingsPanel'
import { 
  LayoutDashboard, 
  Settings, 
  Server,
  Activity,
  Users,
  Search,
  Bell,
  HelpCircle,
  LogOut,
  Fish,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Zap,
  MessageSquareQuote,
  Database as DatabaseIcon,
  Menu,
  X,
  DollarSign
} from 'lucide-react'
import { 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis
} from 'recharts'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { AVAILABLE_MODULES } from '../../modules/modules.config'
import { useTenant } from '../../contexts/TenantContext'
import { useTranslation } from 'react-i18next'
import axios from 'axios'

const chartData = [
  { name: 'Mon', cpu: 45, inference: 32 },
  { name: 'Tue', cpu: 52, inference: 48 },
  { name: 'Wed', cpu: 48, inference: 42 },
  { name: 'Thu', cpu: 65, inference: 55 },
  { name: 'Fri', cpu: 72, inference: 68 },
]



export function SystemDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { selectedTenant, tenants, setSelectedTenant, role, permissions } = useTenant()
  const { t, i18n } = useTranslation()

  const hasMenu = (menuId: string) => {
    const module = AVAILABLE_MODULES.find(m => m.id === menuId);
    
    // Feature Flag Check (Tenant Level)
    if (module?.suiteId && selectedTenant?.enabledModules) {
       const suite = selectedTenant.enabledModules[module.suiteId];
       if (!suite?.enabled) return false;
       if (module.featureId && suite.features && suite.features[module.featureId] === false) {
         return false;
       }
    }

    if (role === 'system') return true;
    return permissions?.menus?.includes(menuId);
  };

  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash')
  const [stats, setStats] = useState<any>(null)
  const [ecommerceBrief, setEcommerceBrief] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCurrentModel()
    fetchGlobalStats()
    fetchEcommerceBrief()
  }, [selectedTenant])

  const fetchGlobalStats = async () => {
    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
      const token = localStorage.getItem('token');
      const res = await axios.get(`${apiUrl}/api/tenants/analytics/global`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStats(res.data)
    } catch (err) {
      console.error('Error fetching global stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchEcommerceBrief = async () => {
    if (!selectedTenant) return
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014'
      const token = localStorage.getItem('token')
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': selectedTenant.id
      }
      const [profitRes, stockRes] = await Promise.all([
        axios.get(`${apiUrl}/api/ecommerce/reports/profitability`, { headers }),
        axios.get(`${apiUrl}/api/ecommerce/reports/stock-predictions`, { headers })
      ])
      setEcommerceBrief({
        profit: profitRes.data,
        stock: stockRes.data.filter((s: any) => s.status === 'CRITICAL').slice(0, 3)
      })
    } catch (err) {
      console.error('Error fetching ecommerce brief:', err)
    }
  }

  const fetchCurrentModel = async () => {
    let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
    try {
      const res = await axios.post(`${apiUrl}/api/ai/model/current`)
      setSelectedModel(res.data.model)
    } catch (err) {
      console.error('Error fetching current model:', err)
    }
  }

  const handleUpdateModel = async (model: string) => {
    let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
    try {
      await axios.post(`${apiUrl}/api/ai/model`, { model })
      setSelectedModel(model)
      alert(`Motor de IA actualizado a ${model}`)
    } catch (err) {
      alert('Error al actualizar el motor de IA.')
    }
  }

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex h-screen bg-surface text-text-main overflow-hidden font-sans relative">
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-border flex flex-col transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-auto
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-deep rounded-full flex items-center justify-center shadow-lg shadow-brand-deep/30 text-white" style={selectedTenant?.brandingConfig?.primaryColor ? { backgroundColor: selectedTenant.brandingConfig.primaryColor } : {}}>
              {selectedTenant?.brandingConfig?.logoUrl ? (
                <img src={selectedTenant.brandingConfig.logoUrl?.startsWith('/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:3014'}${selectedTenant.brandingConfig.logoUrl}` : selectedTenant.brandingConfig.logoUrl} alt="logo" className="w-6 h-6 object-contain" />
              ) : (
                <Fish size={24} />
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight font-display text-brand-deep">
                {selectedTenant?.brandingConfig?.brandName || 'PitayaCore AI'}
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sistema</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 mt-4 ml-2">Operaciones</p>
          {AVAILABLE_MODULES.filter(m => m.category === 'operativo' && hasMenu(m.id)).map(module => (
            <NavItem 
              key={module.id}
              icon={<module.icon size={20} />} 
              label={module.label} 
              active={activeTab === module.id} 
              onClick={() => { setActiveTab(module.id); setIsSidebarOpen(false); }} 
            />
          ))}

          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 mt-6 ml-2">Gestión</p>
          {AVAILABLE_MODULES.filter(m => m.category === 'gestion' && hasMenu(m.id)).map(module => (
            <NavItem 
              key={module.id}
              icon={<module.icon size={20} />} 
              label={module.label} 
              active={activeTab === module.id} 
              onClick={() => { setActiveTab(module.id); setIsSidebarOpen(false); }} 
            />
          ))}

          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 mt-6 ml-2">Inteligencia</p>
          {AVAILABLE_MODULES.filter(m => (m.category === 'sistema' || m.category === 'avanzado') && hasMenu(m.id)).map(module => (
            <NavItem 
              key={module.id}
              icon={<module.icon size={20} />} 
              label={module.label} 
              active={activeTab === module.id} 
              onClick={() => { setActiveTab(module.id); setIsSidebarOpen(false); }} 
            />
          ))}

        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <div className="mb-4">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Contexto Inquilino</p>
            <div className="px-2">
              <select 
                value={selectedTenant?.id} 
                onChange={(e) => {
                  const t = tenants.find(t => t.id === e.target.value);
                  if (t) setSelectedTenant(t);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none focus:border-brand-blue"
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <NavItem icon={<Settings size={18} />} label="Configuración" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full flex items-center gap-3 p-2 rounded-lg text-rose-500 hover:bg-rose-50 font-semibold text-sm transition-all">
              <LogOut size={18} />
              Cerrar Sesión
            </button>
          </div>
          <div className="flex items-center gap-3 pt-4 border-t border-border mt-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
               <img src="https://ui-avatars.com/api/?name=Root+Admin&background=003B71&color=fff" alt="Avatar" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">Root Admin</p>
              <p className="text-xs text-brand-blue font-black uppercase tracking-tighter">Superuser</p>
            </div>
          </div>
        </div>
      </aside>

      <main className={`flex-1 relative flex flex-col ${activeTab === 'dashboard' || activeTab === 'settings' ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        <header className="h-20 bg-white border-b border-border flex items-center justify-between px-4 sm:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-xl">
              <Menu size={24} />
            </button>
            <div className="relative w-64 sm:w-96 hidden xs:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Buscar inquilinos, nodos, servicios..." className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:border-brand-blue transition-all" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-slate-400">
              <Bell size={20} className="hover:text-brand-blue cursor-pointer transition-all" />
              <HelpCircle size={20} className="hover:text-brand-blue cursor-pointer transition-all" />
            </div>
            
            <div className="flex items-center gap-3 pl-6 border-l border-border">
              <div className="text-right hidden sm:block">
                <select 
                  value={selectedTenant?.id} 
                  onChange={(e) => {
                    const tenant = tenants.find(t => t.id === e.target.value);
                    if (tenant) setSelectedTenant(tenant);
                  }}
                  className="bg-transparent border-none text-[10px] font-black text-brand-blue uppercase tracking-widest focus:ring-0 cursor-pointer text-right appearance-none"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <p className="text-[8px] font-bold text-slate-400 uppercase">Sistema Maestro</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs bg-brand-blue-light text-brand-blue shadow-sm`}>
                {selectedTenant?.name.split(' ').map(n => n[0]).join('') || 'AC'}
              </div>
            </div>

            <button className="flex items-center gap-2 px-4 py-2 bg-brand-deep text-white font-bold rounded-xl shadow-lg shadow-brand-deep/20 text-sm hover:opacity-90 transition-all">
              Desplegar Actualización
            </button>
          </div>
        </header>

        <div className="p-8 h-full flex flex-col">
          {activeTab === 'dashboard' && (
            <>
              <div className="mb-8 flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-black font-display text-slate-800">{t('system_command_center')}</h2>
                  <p className="text-sm text-slate-500">{t('system_subtitle')}</p>
                </div>
                <div className="flex gap-4">
                  <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <DollarSign size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ganancia Neta Hoy</p>
                      <p className="text-sm font-black text-slate-800">${ecommerceBrief?.profit?.netMargin?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                      <AlertCircle size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Stock Crítico</p>
                      <p className="text-sm font-black text-slate-800">{ecommerceBrief?.stock?.length || 0} productos</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatsCard title="INQUILINOS ACTIVOS" value={loading ? '...' : stats?.stats?.tenants || '0'} trend="+1" color="blue" />
                <StatsCard title="CÁPSULAS TOTALES" value={loading ? '...' : stats?.stats?.capsules || '0'} trend="+0" color="emerald" />
                <StatsCard title="LEADS GLOBALES" value={loading ? '...' : stats?.stats?.leads || '0'} trend="+0" color="indigo" />
                <StatsCard title="ENGAGEMENT (APERTURA/CLIC)" value={loading ? '...' : `${stats?.stats?.opens || 0} / ${stats?.stats?.clicks || 0}`} trend="0.0%" color="slate" />
              </div>

              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-8">
                  <div className="dashboard-card p-6 h-[400px]">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="font-bold text-lg">Escalamiento de Recursos</h3>
                      <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-brand-blue rounded-full" /> CARGA CPU</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-brand-deep rounded-full" /> INFERENCIAS IA</span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height="80%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorCPU" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#377DFF" stopOpacity={0.1}/><stop offset="95%" stopColor="#377DFF" stopOpacity={0}/></linearGradient>
                          <linearGradient id="colorInf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#003B71" stopOpacity={0.1}/><stop offset="95%" stopColor="#003B71" stopOpacity={0}/></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                        <Area type="monotone" dataKey="cpu" stroke="#377DFF" fillOpacity={1} fill="url(#colorCPU)" strokeWidth={3} />
                        <Area type="monotone" dataKey="inference" stroke="#003B71" fillOpacity={1} fill="url(#colorInf)" strokeWidth={2} strokeDasharray="5 5" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-8">
                  {/* Stock Alerts Widget */}
                  <div className="dashboard-card p-6">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                      <Zap size={20} className="text-amber-500" />
                      Riesgo de Stock
                    </h3>
                    <div className="space-y-4">
                      {ecommerceBrief?.stock?.length > 0 ? (
                        ecommerceBrief.stock.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                             <div className="flex-1">
                               <p className="text-xs font-black text-slate-800">{item.name}</p>
                               <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tight">Quedan {item.stock} unidades</p>
                             </div>
                             <div className="text-right">
                               <p className="text-[10px] font-black text-slate-400 uppercase">Agotamiento</p>
                               <p className="text-xs font-black text-rose-500">~{Math.round(item.daysRemaining)} días</p>
                             </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-4 text-center">
                          <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2 opacity-20" />
                          <p className="text-xs text-slate-400 font-medium">Inventario optimizado</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="dashboard-card p-6 h-full">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                      <Activity size={20} className="text-brand-blue" />
                      Feed de Inteligencia
                    </h3>
                    <div className="space-y-6">
                      {loading ? (
                        <p className="text-xs text-slate-400">Cargando actividad...</p>
                      ) : stats?.recentEvents?.length > 0 ? (
                        stats.recentEvents.map((event: any) => {
                          let type = 'info';
                          let title = `${event.email} - ${event.type}`;
                          
                          const userLabel = event.email ? event.email.split('@')[0] : 'Usuario';
                          
                          if (event.type === 'FOLLOWUP_SENT') {
                            type = 'success';
                            title = `IA envió seguimiento a ${userLabel}`;
                          } else if (event.type === 'OPEN') {
                            type = 'info';
                            title = `${userLabel} abrió correo`;
                          } else if (event.type === 'CLICK') {
                            type = 'warning';
                            title = `${userLabel} hizo clic`;
                          }

                          return (
                            <SystemEvent 
                              key={event.id}
                              title={title}
                              type={type}
                              time={new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              subtitle={event.campaign?.name}
                            />
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-400">No hay actividad reciente.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {AVAILABLE_MODULES.find(m => m.id === activeTab)?.component && (
            <div className="flex-1 h-full">
              {(() => {
                const ModuleComponent = AVAILABLE_MODULES.find(m => m.id === activeTab)!.component;
                return <ModuleComponent setActiveTab={setActiveTab} />;
              })()}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto">
              <div className="mb-10">
                <h2 className="text-3xl font-black font-display text-slate-800">{t('global_config')}</h2>
                <p className="text-sm text-slate-500">{t('global_config_subtitle')}</p>
              </div>
              <div className="space-y-8">
                <div className="dashboard-card p-8 border-2 border-brand-blue/10 bg-gradient-to-br from-white to-brand-blue/5">
                  <BrandingSettings />
                </div>
                
                <SystemSettingsPanel />
                
                
                <div className="dashboard-card p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500"><Search size={20} /></div>
                    <div><h3 className="text-lg font-bold">{t('language')}</h3><p className="text-xs text-slate-400">{t('language_desc')}</p></div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => changeLanguage('es')} className={`flex-1 py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border-2 ${i18n.language === 'es' ? 'border-brand-blue bg-brand-blue-light/20 text-brand-blue' : 'border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>Español</button>
                    <button onClick={() => changeLanguage('en')} className={`flex-1 py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border-2 ${i18n.language === 'en' ? 'border-brand-blue bg-brand-blue-light/20 text-brand-blue' : 'border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>English</button>
                  </div>
                </div>
                {/* ... other settings components ... */}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function NavItem({ icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 ${active ? 'bg-brand-blue-light text-brand-blue font-bold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
      <div className={`${active ? 'text-brand-blue' : 'text-slate-400'}`}>{icon}</div>
      <span className="text-sm">{label}</span>
    </button>
  )
}

function StatsCard({ title, value, trend, color }: any) {
  const colors: any = { blue: 'text-brand-blue', emerald: 'text-emerald-500', indigo: 'text-indigo-500', slate: 'text-slate-500' }
  return (
    <div className="dashboard-card p-6">
      <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">{title}</p>
      <div className="flex items-end justify-between">
        <h4 className={`text-2xl font-black tracking-tight ${colors[color] || 'text-slate-800'}`}>{value}</h4>
        <span className={`text-xs font-bold ${trend.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>{trend}</span>
      </div>
    </div>
  )
}

function SystemEvent({ title, type, time, subtitle }: any) {
  const icons: any = { success: <CheckCircle2 className="text-emerald-500" size={16} />, warning: <AlertCircle className="text-amber-500" size={16} />, info: <Activity className="text-brand-blue" size={16} /> }
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1">{icons[type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 leading-tight truncate">{title}</p>
        <div className="flex justify-between items-center mt-1">
          {subtitle && <p className="text-[10px] text-slate-500 font-bold italic truncate flex-1">{subtitle}</p>}
          <p className="text-[9px] text-slate-400 font-medium ml-2 shrink-0">{time}</p>
        </div>
      </div>
    </div>
  )
}
