import { BrandingSettings } from '../../modules/settings/BrandingSettings'
import { SystemSettingsPanel } from '../../modules/system/SystemSettingsPanel'
import { CommunicationSettingsPanel } from '../../modules/settings/CommunicationSettingsPanel'
import { 
  LayoutDashboard, 
  MessageSquare, 
  ShieldCheck, 
  Database, 
  Settings, 
  TrendingUp,
  AlertCircle,
  Fish,
  Search,
  Bell,
  HelpCircle,
  LogOut,
  FileText,
  Eye,
  Plus,
  Check,
  Sparkles,
  Users,
  BarChart3,
  Key,
  Loader2,
  Zap,
  MessageSquareQuote,
  Menu,
  X
} from 'lucide-react'
import { 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from 'recharts'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useTenant } from '../../contexts/TenantContext'
import { AVAILABLE_MODULES } from '../../modules/modules.config'
import { SystemStatus } from '../../modules/settings/SystemStatus'

const chartData = [
  { name: 'Mon', automation: 65, hitl: 12 },
  { name: 'Tue', automation: 72, hitl: 8 },
  { name: 'Wed', automation: 68, hitl: 15 },
  { name: 'Thu', automation: 85, hitl: 5 },
  { name: 'Fri', automation: 92, hitl: 3 },
]

import axios from 'axios'

export function OperationalDashboard() {
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('pitayacore_active_tab');
    if (savedTab) return savedTab;
    
    const role = localStorage.getItem('pitayacore_role');
    return role === 'operator' ? 'conversations' : 'dashboard';
  })

  useEffect(() => {
    localStorage.setItem('pitayacore_active_tab', activeTab);
  }, [activeTab]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const { 
    selectedTenant, 
    setSelectedTenant, 
    tenants, 
    flowUrl, 
    setFlowUrl, 
    flowTenantSlug, 
    setFlowTenantSlug,
    flowApiKey,
    setFlowApiKey,
    role,
    tenantLanguages,
    setTenantLanguage,
    permissions
  } = useTenant()
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

  const userJson = localStorage.getItem('user')
  const user = userJson ? JSON.parse(userJson) : { name: 'Usuario', role: 'Operador', email: '' }
  const userEmail = user.email;

  const changeLanguage = (lng: 'es' | 'en') => {
    if (selectedTenant) {
      setTenantLanguage(selectedTenant.id, lng);
    }
    i18n.changeLanguage(lng);
  };

  const [stats, setStats] = useState<any>(null)
  const [dashboardChartData, setDashboardChartData] = useState<any[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [ecommerceWidgets, setEcommerceWidgets] = useState<any>(null)
  const [showQuickAction, setShowQuickAction] = useState(false)

  const handleQuickAction = () => {
    // Aquí podemos definir acciones específicas por pestaña
    if (activeTab === 'corrections' || activeTab === 'hitl') {
      setShowQuickAction(true);
    } else if (activeTab === 'agents') {
      // setActiveTab('agents'); // Por si quisiéramos forzar algo
      setShowQuickAction(true);
    } else {
      setShowQuickAction(true); // Modal genérico por ahora
    }
  }

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardStats()
    }
  }, [activeTab, selectedTenant])

  const fetchDashboardStats = async () => {
    setLoadingStats(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
      const isGlobal = selectedTenant?.id === 'global';
      
      const endpoint = isGlobal 
        ? `${apiUrl}/api/tenants/analytics/global` 
        : `${apiUrl}/api/analytics/dashboard`;

      const response = await axios.get(endpoint, {
        headers: { 
          'x-tenant-id': isGlobal ? '' : (selectedTenant?.id || ''),
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-api-key': flowApiKey,
          'x-operator-email': userEmail || '',
          'x-user-role': user.role || ''
        }
      })

      if (isGlobal) {
        setStats({
          automationRate: '98.5%', // Mocked for global
          activeConversations: response.data.stats.leads,
          pendingReviews: 0,
          tenantUsage: `${response.data.stats.tenants} Activos`,
          global: response.data.stats,
          topTenants: response.data.topTenants
        })
        setDashboardChartData([
          { name: 'Tenants', automation: response.data.stats.tenants, hitl: 0 },
          { name: 'Capsules', automation: response.data.stats.capsules, hitl: 0 },
          { name: 'Leads', automation: response.data.stats.leads, hitl: 0 },
        ])
      } else {
        setStats({
          ...response.data.stats,
          alerts: response.data.alerts,
          activity: response.data.activity
        })
        setDashboardChartData(response.data.chartData)
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err)
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchEcommerceWidgets = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
      const response = await axios.get(`${apiUrl}/api/ecommerce/dashboard/widgets`, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || '',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      setEcommerceWidgets(response.data)
    } catch (err) {
      console.error('Error fetching ecommerce widgets:', err)
    }
  }

  useEffect(() => {
    if (activeTab === 'dashboard' && selectedTenant?.id !== 'global') {
      fetchEcommerceWidgets()
    }
  }, [activeTab, selectedTenant])

  return (
    <div className="flex h-screen bg-surface text-text-main overflow-hidden font-sans relative">
      {/* Mobile Overlay */}
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

      {/* Sidebar - Light Design */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-white border-r border-border flex flex-col transition-all duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-auto
        ${isSidebarCollapsed ? 'w-20' : 'w-64'}
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className={`p-6 mb-4 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-blue rounded-full flex items-center justify-center shadow-lg shadow-brand-blue/30 text-white shrink-0" style={selectedTenant?.brandingConfig?.primaryColor ? { backgroundColor: selectedTenant.brandingConfig.primaryColor } : {}}>
              {selectedTenant?.brandingConfig?.logoUrl ? (
                <img src={selectedTenant.brandingConfig.logoUrl?.startsWith('/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:3014'}${selectedTenant.brandingConfig.logoUrl}` : selectedTenant.brandingConfig.logoUrl} alt="logo" className="w-6 h-6 object-contain" />
              ) : (
                <Fish size={24} />
              )}
            </div>
            {!isSidebarCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="text-lg font-bold tracking-tight font-display text-brand-deep">
                  {selectedTenant?.brandingConfig?.brandName || 'PitayaCore AI'}
                </h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operaciones</p>
              </motion.div>
            )}
          </div>
          
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-white border border-border rounded-full items-center justify-center text-slate-400 hover:text-brand-blue shadow-sm z-50 transition-transform"
            style={{ transform: isSidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <Menu size={12} />
          </button>

          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:bg-slate-50 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-4 overflow-y-auto custom-scrollbar pt-4">
          {/* Categoría: Operativo */}
          <div>
            {!isSidebarCollapsed && <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-2">Operaciones</p>}
            <div className="space-y-1">
              {AVAILABLE_MODULES.filter(m => m.category === 'operativo' && hasMenu(m.id)).map(module => (
                <NavItem 
                  key={module.id}
                  icon={<module.icon size={20} />} 
                  label={module.label} 
                  active={activeTab === module.id} 
                  collapsed={isSidebarCollapsed}
                  onClick={() => {
                    setActiveTab(module.id);
                    setIsSidebarOpen(false);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Categoría: Gestión */}
          {AVAILABLE_MODULES.some(m => m.category === 'gestion' && hasMenu(m.id)) && (
            <div>
              {!isSidebarCollapsed && <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-2">Gestión</p>}
              <div className="space-y-1">
                {AVAILABLE_MODULES.filter(m => m.category === 'gestion' && hasMenu(m.id)).map(module => (
                  <NavItem 
                    key={module.id}
                    icon={<module.icon size={20} />} 
                    label={module.label} 
                    active={activeTab === module.id} 
                    collapsed={isSidebarCollapsed}
                    onClick={() => {
                      setActiveTab(module.id);
                      setIsSidebarOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Categoría: Inteligencia */}
          {AVAILABLE_MODULES.some(m => m.category === 'avanzado' && hasMenu(m.id)) && (
            <div>
              {!isSidebarCollapsed && <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-2">Inteligencia</p>}
              <div className="space-y-1">
                {AVAILABLE_MODULES.filter(m => m.category === 'avanzado' && hasMenu(m.id)).map(module => (
                  <NavItem 
                    key={module.id}
                    icon={<module.icon size={20} />} 
                    label={module.label} 
                    active={activeTab === module.id} 
                    collapsed={isSidebarCollapsed}
                    onClick={() => {
                      setActiveTab(module.id);
                      setIsSidebarOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Categoría: CRM & Ventas */}
          {AVAILABLE_MODULES.some(m => m.category === 'crm' && hasMenu(m.id)) && (
            <div>
              {!isSidebarCollapsed && <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-2">CRM & Ventas</p>}
              <div className="space-y-1">
                {AVAILABLE_MODULES.filter(m => m.category === 'crm' && hasMenu(m.id)).map(module => (
                  <NavItem 
                    key={module.id}
                    icon={<module.icon size={20} />} 
                    label={module.label} 
                    active={activeTab === module.id} 
                    collapsed={isSidebarCollapsed}
                    onClick={() => {
                      setActiveTab(module.id);
                      setIsSidebarOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Categoría: Sistema (Solo para System admins) */}
          {role === 'system' && AVAILABLE_MODULES.some(m => m.category === 'sistema' && hasMenu(m.id)) && (
            <div>
              {!isSidebarCollapsed && <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-2">Sistema</p>}
              <div className="space-y-1">
                {AVAILABLE_MODULES.filter(m => m.category === 'sistema' && hasMenu(m.id)).map(module => (
                  <NavItem 
                    key={module.id}
                    icon={<module.icon size={20} />} 
                    label={module.label} 
                    active={activeTab === module.id} 
                    collapsed={isSidebarCollapsed}
                    onClick={() => {
                      setActiveTab(module.id);
                      setIsSidebarOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="px-4 py-4 border-t border-slate-100 bg-white">
          <NavItem 
            icon={<LogOut size={20} />} 
            label="Cerrar Sesión" 
            active={false} 
            collapsed={isSidebarCollapsed}
            className="text-rose-500 hover:bg-rose-50"
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
          />
          
          <div className={`flex items-center gap-2.5 mt-2 p-2.5 bg-slate-50 rounded-2xl ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden shrink-0 border-2 border-white shadow-sm">
               <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} alt="Avatar" />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate text-slate-800">{user.name}</p>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user.role}</p>
                  <p className="text-[8px] font-bold text-blue-500/50">v1.0.5</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative flex flex-col h-screen">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-border flex items-center justify-between px-4 sm:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-xl"
            >
              <Menu size={24} />
            </button>
            <div className="relative w-64 sm:w-96 hidden xs:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar conversaciones, inquilinos..." 
                className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:border-brand-blue transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-slate-400">
              <Bell size={20} className="hover:text-brand-blue cursor-pointer transition-all" />
              <HelpCircle size={20} className="hover:text-brand-blue cursor-pointer transition-all" />
              <button 
                onClick={() => setActiveTab('settings')}
                className={`hover:text-brand-blue cursor-pointer transition-all p-1 rounded-lg ${activeTab === 'settings' ? 'bg-brand-blue-light text-brand-blue' : 'hover:bg-slate-50'}`}
              >
                <Settings size={20} />
              </button>
            </div>
            
            <div className="flex items-center gap-3 pl-6 border-l border-border">
              <div className="text-right hidden sm:block">
                {role === 'system' ? (
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
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedTenant?.name || 'Acuaequipos'}</span>
                )}
                <p className="text-[8px] font-bold text-slate-400 uppercase">{selectedTenant?.plan || 'Admin'}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs bg-brand-blue-light text-brand-blue shadow-sm`}>
                {selectedTenant?.name.split(' ').map(n => n[0]).join('') || 'AC'}
              </div>
              
              <button 
                onClick={() => {
                  console.log('Logging out...');
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = '/';
                }}
                title="Cerrar Sesión"
                className="ml-4 p-2.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm cursor-pointer relative z-50"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Tab Content Wrapper */}
        <div className="flex-1 relative overflow-y-auto custom-scrollbar bg-slate-50/50">
          {activeTab === 'dashboard' && (
            <div className="p-8">
              <div className="mb-8 flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-black font-display text-slate-800">
                    Panel: <span className="text-brand-blue">{selectedTenant?.brandingConfig?.brandName || selectedTenant?.name || 'Vista Global'}</span>
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <p className="text-xs font-bold text-emerald-600">Estado del sistema: Todos los sistemas operativos</p>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-border rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all shadow-sm">
                  <Settings size={14} />
                  Últimos 7 días
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {selectedTenant?.id === 'global' ? (
                  <>
                    <StatsCard 
                      title="INQUILINOS TOTALES" 
                      value={loadingStats ? '...' : stats?.global?.tenants || '0'} 
                      trend="+1" 
                      icon={<Plus size={16} />}
                      color="blue"
                    />
                    <StatsCard 
                      title="CÁPSULAS TOTALES" 
                      value={loadingStats ? '...' : stats?.global?.capsules || '0'} 
                      color="purple"
                    />
                    <StatsCard 
                      title="LEADS GLOBALES" 
                      value={loadingStats ? '...' : stats?.global?.leads || '0'} 
                      badge="PLATAFORMA"
                      color="amber"
                    />
                    <StatsCard 
                      title="ENGAGEMENT (OPEN/CLICK)" 
                      value={loadingStats ? '...' : `${stats?.global?.opens || 0} / ${stats?.global?.clicks || 0}`} 
                      badge="CAMPAÑAS"
                      color="slate"
                    />
                  </>
                ) : (
                  <>
                    <StatsCard 
                      title="TASA DE AUTOMATIZACIÓN IA" 
                      value={loadingStats ? '...' : stats?.automationRate || '0%'} 
                      trend="+2.4%" 
                      icon={<Plus size={16} />}
                      color="blue"
                    />
                    <StatsCard 
                      title="CONVERSACIONES ACTIVAS" 
                      value={loadingStats ? '...' : stats?.activeConversations || '0'} 
                      subtitle="Basado en volumen real"
                      badge="EN VIVO"
                      color="amber"
                    />
                    <StatsCard 
                      title="REVISIONES PENDIENTES" 
                      value={loadingStats ? '...' : stats?.pendingReviews || '0'} 
                      subtitle="Requieren intervención humana"
                      badge="HITL"
                      color="purple"
                    />
                    <StatsCard 
                      title="USO POR INQUILINO" 
                      value={loadingStats ? '...' : stats?.tenantUsage || '0 / 15'} 
                      badge="ACTIVOS"
                      avatars={true}
                      color="slate"
                    />
                  </>
                )}
              </div>

              {/* Ecommerce Quick Widgets (Phase 4) */}
              {selectedTenant?.id !== 'global' && ecommerceWidgets && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                   <motion.div 
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[32px] p-6 text-white shadow-xl shadow-emerald-200/50 flex justify-between items-center overflow-hidden relative group"
                   >
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-700">
                         <BarChart3 size={120} />
                      </div>
                      <div className="relative z-10">
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-80">Ganancia del Día</p>
                         <h3 className="text-4xl font-black font-display tracking-tight">${ecommerceWidgets.dailyProfit.toFixed(2)}</h3>
                         <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold">HOY: {ecommerceWidgets.orderCount} ÓRDENES</span>
                            <span className="text-[10px] font-bold opacity-80">Ventas: ${ecommerceWidgets.dailyRevenue.toFixed(2)}</span>
                         </div>
                      </div>
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                         <TrendingUp size={32} />
                      </div>
                   </motion.div>

                   <motion.div 
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-xl flex flex-col justify-between"
                   >
                      <div className="flex justify-between items-center mb-4">
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Alerta de Inventario</p>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">3 Productos por Agotarse</h3>
                         </div>
                         <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center">
                            <AlertCircle size={20} />
                         </div>
                      </div>
                      <div className="space-y-3">
                         {ecommerceWidgets.criticalStock.length > 0 ? ecommerceWidgets.criticalStock.map((prod: any) => (
                            <div key={prod.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-rose-200 transition-colors">
                               <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{prod.name}</span>
                               <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-rose-500 uppercase">{prod.currentStock} UNID.</span>
                                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                               </div>
                            </div>
                         )) : (
                            <div className="p-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Todo en orden ✅</div>
                         )}
                      </div>
                   </motion.div>
                </div>
              )}

              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-8 space-y-8">
                  <div className="dashboard-card p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-2 text-rose-500">
                        <AlertCircle size={20} />
                        <h3 className="font-bold">Alertas y Conversaciones Marcadas</h3>
                      </div>
                      <button className="text-brand-blue text-xs font-bold hover:underline">Ver todas</button>
                    </div>
                    <div className="space-y-6">
                      {loadingStats ? (
                        <div className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Cargando alertas...</div>
                      ) : stats?.alerts?.length > 0 ? (
                        stats.alerts.map((alert: any) => (
                          <AlertItem 
                            key={alert.id}
                            title={alert.title} 
                            desc={`Inquilino: ${alert.tenant} • ${alert.description}`} 
                            time={alert.time}
                            status={alert.title.includes('Confianza') ? 'warning' : 'urgent'}
                          />
                        ))
                      ) : (
                        <div className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">Sin alertas críticas</div>
                      )}
                    </div>
                  </div>

                  <div className="dashboard-card p-6">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="font-bold text-lg">Volumen de Conversaciones</h3>
                      <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-brand-blue rounded-full" /> AUTOMATIZADO</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-300 rounded-full" /> HITL</span>
                      </div>
                    </div>
                    <div className="h-[300px]">
                      {loadingStats ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="animate-spin text-slate-200" size={40} />
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dashboardChartData.length > 0 ? dashboardChartData : chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                            <Tooltip 
                              cursor={{fill: '#f8fafc'}}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="automation" fill="#377DFF" radius={[4, 4, 0, 0]} barSize={40} />
                            <Bar dataKey="hitl" fill="#E2E8F0" radius={[4, 4, 0, 0]} barSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-4">
                  <div className="dashboard-card p-6 h-full flex flex-col">
                    <h3 className="font-bold text-lg mb-8">
                      {selectedTenant?.id === 'global' ? 'Ranking de Inquilinos' : 'Actividad Reciente'}
                    </h3>
                    <div className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      {loadingStats ? (
                        <div className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Cargando...</div>
                      ) : selectedTenant?.id === 'global' ? (
                        stats?.topTenants?.map((t: any) => (
                          <div key={t.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-brand-blue text-white flex items-center justify-center font-bold text-xs">
                                {t.name[0]}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{t.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{t.plan}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-black text-brand-blue">{t._count.capsules} Caps.</p>
                            </div>
                          </div>
                        ))
                      ) : stats?.activity?.length > 0 ? (
                        stats.activity.map((item: any) => (
                          <ActivityItem 
                            key={item.id}
                            icon={
                              item.type === 'check' ? <Fish className="text-brand-blue" /> : 
                              item.type === 'user' ? <Users className="text-emerald-500" /> :
                              <Settings className="text-purple-500" />
                            }
                            title={item.title}
                            meta={`INQUILINO: ${item.tenant} • ${item.time}`}
                            quote={item.description}
                            color={
                              item.type === 'check' ? 'blue' : 
                              item.type === 'user' ? 'emerald' : 
                              'purple'
                            }
                          />
                        ))
                      ) : (
                        <div className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">Sin actividad reciente</div>
                      )}
                    </div>
                    <button className="mt-8 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all">
                      Refrescar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {AVAILABLE_MODULES.find(m => m.id === activeTab)?.component && (
            <div className="flex-1 flex flex-col min-h-0 h-full">
              {(() => {
                const ModuleComponent = AVAILABLE_MODULES.find(m => m.id === activeTab)!.component;
                return <ModuleComponent setActiveTab={setActiveTab} />;
              })()}
            </div>
          )}
          
          {activeTab === 'settings' && (
            <div className="p-8 max-w-4xl mx-auto w-full">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-slate-800">{t('global_config')}</h2>
                <p className="text-sm text-slate-500 mt-1">{t('global_config_subtitle')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* BRANDING SECTION */}
                <div className="dashboard-card p-6 md:col-span-2 border-2 border-brand-blue/10 bg-gradient-to-br from-white to-brand-blue/5">
                  <BrandingSettings />
                </div>

                {/* COMMUNICATION SETTINGS SECTION */}
                <div className="md:col-span-2">
                  <CommunicationSettingsPanel />
                </div>

                {/* SYSTEM SETTINGS SECTION */}
                {role === 'system' && (
                  <div className="md:col-span-2">
                    <SystemSettingsPanel />
                  </div>
                )}

                {role === 'system' && (
                  <div className="dashboard-card p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                        <Users size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">Inquilino Activo</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cambiar Contexto</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {tenants.map((tenant) => (
                        <button
                          key={tenant.id}
                          onClick={() => setSelectedTenant(tenant)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm transition-all border-2 ${
                            selectedTenant?.id === tenant.id 
                              ? 'border-brand-blue bg-brand-blue-light/30 text-brand-blue font-bold shadow-sm' 
                              : 'border-transparent bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${
                              selectedTenant?.id === tenant.id ? 'bg-brand-blue text-white' : 'bg-slate-200 text-slate-500'
                            }`}>
                              {tenant.name.substring(0,1)}
                            </div>
                            <span className="font-bold">{tenant.name}</span>
                          </div>
                          {selectedTenant?.id === tenant.id && <Check size={16} />}
                        </button>
                      ))}
                    </div>

                    <button 
                      onClick={() => setActiveTab('tenants')}
                      className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-white border border-border text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                    >
                      <Users size={16} />
                      Administración de Inquilinos
                    </button>
                  </div>
                )}

                <div className="space-y-8">
                  {role === 'system' && <SystemStatus flowApiKey={flowApiKey} />}
                  
                  <div className="dashboard-card p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                        <Search size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{t('language')}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('language_desc')}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => changeLanguage('es')}
                        className={`py-3 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border-2 ${
                          i18n.language === 'es' 
                            ? 'border-brand-blue bg-brand-blue-light/20 text-brand-blue' 
                            : 'border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        Español
                      </button>
                      <button 
                        onClick={() => changeLanguage('en')}
                        className={`py-3 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border-2 ${
                          i18n.language === 'en' 
                            ? 'border-brand-blue bg-brand-blue-light/20 text-brand-blue' 
                            : 'border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        English
                      </button>
                    </div>
                  </div>

                  <div className="dashboard-card p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500">
                        <Eye size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">Apariencia</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tema Visual</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-brand-blue text-white ring-4 ring-brand-blue/10">
                        <div className="w-full h-12 bg-white/20 rounded-lg" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Claro</span>
                      </button>
                      <button className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 border border-border text-slate-400 grayscale hover:grayscale-0 transition-all">
                        <div className="w-full h-12 bg-slate-800 rounded-lg" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Oscuro</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Fallback for other tabs only if they are not in AVAILABLE_MODULES and not special tabs */}
          {![
            'dashboard', 'settings'
          ].includes(activeTab) && !AVAILABLE_MODULES.find(m => m.id === activeTab)?.component && (
            <div className="p-8 flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-xl font-bold text-slate-400 uppercase tracking-widest">{activeTab} Section</h2>
                <p className="text-slate-400 mt-2 italic">Coming soon...</p>
              </div>
            </div>
          )}
        </div>

        {/* Floating Action Button */}
        {activeTab !== 'donjuan' && (
          <button 
            onClick={handleQuickAction}
            className="fixed bottom-8 right-8 w-14 h-14 bg-brand-blue text-white rounded-full flex items-center justify-center shadow-xl shadow-brand-blue/40 hover:scale-110 active:scale-90 transition-all z-20"
          >
            <Plus size={28} />
          </button>
        )}

        {/* Quick Action Modal Overlay */}
        <AnimatePresence>
          {showQuickAction && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowQuickAction(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-black text-slate-800">Acción Rápida</h3>
                      <p className="text-sm text-slate-500 uppercase tracking-widest font-bold mt-1">
                        {activeTab === 'hitl' || activeTab === 'corrections' ? 'Nueva Respuesta Guardada' : 'Nuevo Registro'}
                      </p>
                    </div>
                    <button onClick={() => setShowQuickAction(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Título / Atajo</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Saludo Inicial"
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-brand-blue transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Contenido de la Respuesta</label>
                      <textarea 
                        rows={4}
                        placeholder="Escribe aquí la respuesta que la IA podrá usar..."
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-brand-blue transition-all resize-none"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        alert('Acción guardada con éxito');
                        setShowQuickAction(false);
                      }}
                      className="w-full py-5 bg-brand-blue text-white font-black rounded-2xl shadow-xl shadow-brand-blue/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      Guardar y Publicar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function NavItem({ icon, label, active, onClick, className, collapsed }: any) {
  return (
    <button 
      onClick={onClick}
      title={collapsed ? label : ""}
      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 ${
        active 
          ? 'bg-brand-blue-light text-brand-blue font-bold shadow-sm' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
      } ${collapsed ? 'justify-center' : ''} ${className || ''}`}
    >
      <div className={`${active ? 'text-brand-blue' : 'text-slate-400'} shrink-0`}>
        {icon}
      </div>
      {!collapsed && (
        <motion.span 
          initial={{ opacity: 0, x: -10 }} 
          animate={{ opacity: 1, x: 0 }} 
          className="text-sm truncate"
        >
          {label}
        </motion.span>
      )}
    </button>
  )
}

function StatsCard({ title, value, trend, subtitle, badge, avatars, icon, color }: any) {
  const colorMap: any = {
    blue: 'border-b-4 border-brand-blue',
    amber: 'border-b-0',
    purple: 'border-b-0',
    slate: 'border-b-0',
  }

  return (
    <div className={`dashboard-card p-6 relative overflow-hidden ${colorMap[color] || ''}`}>
      <div className="flex justify-between items-start mb-4">
        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{title}</p>
        {trend && <span className="text-[10px] font-black text-emerald-500 flex items-center gap-0.5">{icon} {trend}</span>}
        {badge && (
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${
            badge === 'EN VIVO' ? 'bg-amber-100 text-amber-600' : 
            badge === 'HITL' ? 'bg-slate-100 text-slate-500' : 'bg-brand-blue-light text-brand-blue'
          }`}>
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <h4 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h4>
          {subtitle && <p className="text-[10px] text-slate-400 mt-1 font-medium">{subtitle}</p>}
        </div>
        {avatars && (
          <div className="flex -space-x-2">
            {[1,2,3].map(i => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200" />
            ))}
            <div className="w-6 h-6 rounded-full border-2 border-white bg-brand-blue-light text-[8px] font-bold text-brand-blue flex items-center justify-center">+9</div>
          </div>
        )}
      </div>
      {color === 'blue' && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100">
           <div className="h-full bg-brand-blue" style={{width: '94%'}} />
        </div>
      )}
    </div>
  )
}

function AlertItem({ title, desc, time, status }: any) {
  return (
    <div className="flex gap-4 p-4 border border-slate-50 rounded-xl hover:bg-slate-50 transition-all group">
      <div className={`w-1 h-full rounded-full ${status === 'urgent' ? 'bg-rose-500' : 'bg-amber-500'}`} />
      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
          <h5 className="font-bold text-sm text-slate-800">{title}</h5>
          <span className="text-[10px] text-slate-400 font-medium">{time}</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed mb-3">{desc}</p>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-white border border-slate-200 rounded-md text-[9px] font-black text-slate-400 uppercase tracking-widest hover:border-brand-blue hover:text-brand-blue transition-all">Revisar Log</button>
          <button className="px-3 py-1 bg-brand-blue-light text-brand-blue border border-brand-blue/10 rounded-md text-[9px] font-black uppercase tracking-widest hover:bg-brand-blue hover:text-white transition-all">Intervenir</button>
        </div>
      </div>
    </div>
  )
}

function ActivityItem({ icon, title, meta, quote, color }: any) {
  const bgMap: any = {
    blue: 'bg-brand-blue-light',
    purple: 'bg-purple-50',
    emerald: 'bg-emerald-50',
    amber: 'bg-amber-50',
  }

  return (
    <div className="flex gap-4">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bgMap[color] || 'bg-slate-100'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h6 className="font-bold text-sm text-slate-800 leading-tight mb-1">{title}</h6>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{meta}</p>
        {quote && (
          <div className="bg-slate-50 p-3 rounded-xl border-l-2 border-brand-blue italic text-xs text-slate-500 leading-relaxed">
            {quote}
          </div>
        )}
      </div>
    </div>
  )
}

