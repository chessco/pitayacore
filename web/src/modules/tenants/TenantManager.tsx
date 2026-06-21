import { 
  Plus, 
  Users, 
  Zap, 
  CheckCircle2, 
  CreditCard, 
  Search, 
  ChevronDown, 
  Filter, 
  RefreshCw, 
  Settings, 
  Edit3,
  Loader2,
  X,
  ShieldCheck,
  Building2,
  Globe,
  Save,
  Cpu,
  Shield,
  Eye,
  BarChart3,
  GitMerge,
  ShoppingBag,
  Package,
  Layout
} from 'lucide-react'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useTenant } from '../../contexts/TenantContext'

const PLAN_LIMITS: Record<string, { tokens: number; label: string; price: number; description: string }> = {
  'FREE': { 
    tokens: 10000, 
    label: 'Starter (Free)', 
    price: 0,
    description: 'Para pruebas iniciales y demos pequeñas.'
  },
  'PRO': { 
    tokens: 500000, 
    label: 'Scale (Pro)', 
    price: 149,
    description: 'Ideal para negocios en crecimiento con uso diario moderado.'
  },
  'ENTERPRISE': { 
    tokens: 5000000, 
    label: 'Ultimate (Enterprise)', 
    price: 899,
    description: 'Acceso ilimitado y soporte prioritario para grandes volúmenes.'
  }
}

export function TenantManager({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { tenants, setSelectedTenant, refreshTenants } = useTenant()
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<any>(null)
  const [detailsTenant, setDetailsTenant] = useState<any>(null)
  const [markupFactor, setMarkupFactor] = useState(10)
  const [showRealCosts, setShowRealCosts] = useState(false)

  const filteredTenants = tenants.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.id && t.id.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const currentUserRole = (() => {
    const role = localStorage.getItem('pitayacore_role') || 
                 localStorage.getItem('userRole') || 
                 localStorage.getItem('role') || 
                 'OWNER';
    if (role.toLowerCase() === 'tenant') return 'ADMIN';
    return role.toUpperCase();
  })();

  const handleSave = async (data: any) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'x-user-role': currentUserRole,
        'x-tenant-id': localStorage.getItem('tenantId') || 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718'
      };

      if (editingTenant?.id) {
        await axios.patch(`${apiUrl}/api/tenants/${editingTenant.id}`, data, { headers });
      } else {
        await axios.post(`${apiUrl}/api/tenants`, data, { headers });
      }
      setIsModalOpen(false);
      refreshTenants();
    } catch (error) {
      console.error('Error saving tenant:', error);
      alert('Error al guardar los cambios del inquilino.');
    }
  }

  const totalTokens = tenants.reduce((acc: number, t: any) => acc + (t.consumption?.totalTokens || 0), 0)
  const totalCost = tenants.reduce((acc: number, t: any) => acc + (t.consumption?.totalCost || 0), 0)
  const activeTenants = tenants.filter(t => t.status?.toLowerCase() === 'active' || t.status?.toLowerCase() === 'activo').length

  return (
    <div className="p-8 bg-surface min-h-[calc(100vh-80px)] overflow-y-auto">
      <div className="flex justify-between items-start mb-10">
        <div>
          <h2 className="text-3xl font-black font-display text-slate-800">Panel General de Acceso</h2>
          <p className="text-sm text-slate-500 mt-1">Monitorea y gestiona los accesos de las organizaciones activas.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-100 rounded-xl shadow-sm">
             <div className="flex items-center gap-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Margen IA</p>
                <select 
                  value={markupFactor}
                  onChange={(e) => setMarkupFactor(Number(e.target.value))}
                  className="text-xs font-black text-brand-blue bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value={1}>x1 (Real)</option>
                  <option value={5}>x5</option>
                  <option value={10}>x10</option>
                  <option value={20}>x20</option>
                  <option value={50}>x50</option>
                </select>
             </div>
             <div className="w-px h-4 bg-slate-100 mx-2" />
             <button 
               onClick={() => setShowRealCosts(!showRealCosts)}
               className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black transition-all ${showRealCosts ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}
             >
               {showRealCosts ? <Shield size={12} /> : <Zap size={12} />}
               {showRealCosts ? 'VISTA: COSTO REAL' : 'VISTA: RETAIL'}
             </button>
          </div>
          <button 
            onClick={() => {
              setEditingTenant(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white font-bold rounded-xl shadow-lg shadow-brand-blue/20 hover:opacity-90 transition-all"
          >
            <Plus size={20} />
            Nuevo Inquilino
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-6 mb-10">
        <SummaryCard 
          title="TOTAL INQUILINOS" 
          value={tenants.length.toString()} 
          trend={`+${tenants.length}`} 
          icon={<Users size={20} className="text-brand-blue" />}
          color="blue"
        />
        <SummaryCard 
          title="TOKENS MENSUALES" 
          value={`${(totalTokens / 1000).toFixed(1)}k`} 
          limit="/ 1M"
          icon={<Zap size={20} className="text-amber-500" />}
          color="amber"
        />
        <SummaryCard 
          title={showRealCosts ? "GASTO TOTAL GOOGLE" : "INGRESOS ESTIMADOS IA"} 
          value={`$${(totalCost * (showRealCosts ? 1 : markupFactor)).toFixed(2)}`} 
          dot={true}
          icon={<CreditCard size={20} className={showRealCosts ? "text-rose-500" : "text-emerald-500"} />}
          color={showRealCosts ? "rose" : "emerald"}
        />
        <SummaryCard 
          title="SUSCRIPCIONES ACTIVAS" 
          value={activeTenants.toString()} 
          trend="Auditoría OK"
          icon={<ShieldCheck size={20} className="text-purple-500" />}
          color="purple"
        />
      </div>

      {/* Main Table Section */}
      <div className="dashboard-card bg-white p-6">
        <div className="flex justify-between items-center mb-8">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, ID o contacto..." 
              className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={40} className="animate-spin text-brand-blue mb-4" />
            <p className="text-slate-400 font-bold text-sm">Cargando organizaciones...</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-border">
                <th className="px-4 py-4">Inquilino</th>
                <th className="px-4 py-4">Plan</th>
                <th className="px-4 py-4 text-center">Estado</th>
                <th className="px-4 py-4">Consumo Mensual</th>
                <th className="px-4 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTenants.length > 0 ? (
                filteredTenants.map((tenant: any) => (
                  <TenantRow 
                    key={tenant.id}
                    tenant={tenant}
                    setSelectedTenant={setSelectedTenant}
                    setActiveTab={setActiveTab}
                    markupFactor={markupFactor}
                    showRealCosts={showRealCosts}
                    onShowDetails={(t: any) => setDetailsTenant(t)}
                    onEdit={(t: any) => {
                      setEditingTenant(t);
                      setIsModalOpen(true);
                    }}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 font-bold">
                    No se encontraron inquilinos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <TenantModal 
          tenant={editingTenant} 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSave} 
        />
      )}

      {/* CONSUMPTION DETAILS MODAL (MOVED OUTSIDE TABLE) */}
      <ConsumptionDetailsModal 
        tenant={detailsTenant}
        isOpen={!!detailsTenant}
        onClose={() => setDetailsTenant(null)}
        markupFactor={markupFactor}
        showRealCosts={showRealCosts}
      />
    </div>
  )
}

function ConsumptionDetailsModal({ tenant, isOpen, onClose, markupFactor, showRealCosts }: any) {
  const { refreshTenants } = useTenant()
  const [breakdown, setBreakdown] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isChangingPlan, setIsChangingPlan] = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)
  
  const { name, plan = 'FREE', consumption: realConsumption, id } = tenant || {}
  const limitData = PLAN_LIMITS[plan] || PLAN_LIMITS['FREE']
  const currentTokens = realConsumption?.totalTokens || 0
  const consumptionPercentage = Math.min(100, Math.round((currentTokens / limitData.tokens) * 100))

  const displayCost = (rawCost: number) => {
    const finalFactor = showRealCosts ? 1 : markupFactor
    return (rawCost * finalFactor).toFixed(showRealCosts ? 4 : 2)
  }

  useEffect(() => {
    if (isOpen && id) {
      const fetchDetails = async () => {
        setLoading(true)
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
          const token = localStorage.getItem('token');
          const res = await axios.get(`${apiUrl}/api/tenants/${id}/consumption`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          setBreakdown(res.data)
        } catch (err) {
          console.error("Error fetching consumption details:", err)
        } finally {
          setLoading(false)
        }
      }
      fetchDetails()
    }
  }, [isOpen, id])

  const handleSwitchPlan = async (newPlan: string) => {
    setSavingPlan(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
      const token = localStorage.getItem('token');
      await axios.patch(`${apiUrl}/api/tenants/${id}`, { plan: newPlan }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setIsChangingPlan(false)
      refreshTenants()
      onClose()
      alert(`Plan actualizado a ${newPlan} exitosamente.`)
    } catch (err) {
      console.error("Error updating plan:", err)
      alert("No se pudo actualizar el plan.")
    } finally {
      setSavingPlan(false)
    }
  }

  if (!isOpen) return null;

  const planColors: any = {
    'ENTERPRISE': 'bg-brand-blue-light text-brand-blue border-brand-blue/10',
    'PRO': 'bg-purple-50 text-purple-600 border-purple-100',
    'FREE': 'bg-slate-100 text-slate-500 border-slate-200',
  }
  const currentPlanColor = planColors[plan] || 'bg-slate-100 text-slate-500 border-slate-200'

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                <Zap size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800">{isChangingPlan ? 'Cambiar Plan de Suscripción' : 'Consumo de IA'}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          {!isChangingPlan ? (
            <div className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      {showRealCosts ? 'Costo de Infraestructura' : 'Valor Estimado (Retail)'}
                    </p>
                    <h4 className="text-3xl font-black text-slate-800">${displayCost(realConsumption?.totalCost || 0)} <span className="text-sm font-bold text-slate-400">USD</span></h4>
                  </div>
                  <div className="text-right">
                    <button 
                      onClick={() => setIsChangingPlan(true)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all hover:scale-105 active:scale-95 ${currentPlanColor}`}
                    >
                      PLAN {plan} • CAMBIAR
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                   <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase">
                     <span>Progreso de Cuota ({limitData.label})</span>
                     <span>{consumptionPercentage}%</span>
                   </div>
                   <div className="h-2 bg-white rounded-full overflow-hidden border border-slate-200 p-0.5">
                     <div 
                       className={`h-full rounded-full transition-all duration-1000 ${consumptionPercentage > 90 ? 'bg-rose-500' : 'bg-amber-500'}`} 
                       style={{width: `${consumptionPercentage}%`}} 
                     />
                   </div>
                </div>
              </div>

              <div>
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Desglose por Modelo</h5>
                <div className="space-y-3">
                  {loading ? (
                    <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-300" /></div>
                  ) : breakdown.length > 0 ? (
                    breakdown.map((item: any) => (
                      <div key={item.model} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                            <Cpu size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{item.model}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{item._sum.tokensIn + item._sum.tokensOut} tokens</p>
                          </div>
                        </div>
                        <div className="text-right">
                        <p className="text-xs font-black text-slate-700">${displayCost(item._sum.costUsd || 0)}</p>
                        <p className="text-[8px] text-emerald-500 font-bold uppercase">{showRealCosts ? 'Costo Base' : 'Valor Auditado'}</p>
                      </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-4 text-xs text-slate-400 font-bold">No hay consumos registrados este mes.</p>
                  )}
                </div>
              </div>
              
              <div className="mt-8">
                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl text-sm hover:bg-slate-200 transition-all"
                >
                  Cerrar Panel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(PLAN_LIMITS).map(([key, data]) => (
                <button 
                  key={key}
                  disabled={savingPlan}
                  onClick={() => handleSwitchPlan(key)}
                  className={`w-full p-6 rounded-2xl border-2 text-left transition-all group ${plan === key ? 'border-brand-blue bg-brand-blue/5' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-black text-slate-800">{data.label}</h4>
                      <p className="text-xs text-slate-500 font-medium">{data.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-slate-800">${data.price}<span className="text-[10px] text-slate-400">/mes</span></p>
                      <p className="text-[9px] font-bold text-brand-blue uppercase tracking-widest">{data.tokens.toLocaleString()} tokens incl.</p>
                    </div>
                  </div>
                  {plan === key && (
                    <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-brand-blue uppercase tracking-widest">
                      <CheckCircle2 size={12} /> Plan Actual Seleccionado
                    </div>
                  )}
                </button>
              ))}

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setIsChangingPlan(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl text-sm hover:bg-slate-200 transition-all"
                >
                  Regresar
                </button>
                {savingPlan && (
                  <div className="flex items-center gap-2 text-brand-blue font-bold text-xs">
                    <Loader2 className="animate-spin" size={16} />
                    Guardando...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TenantRow({ tenant, setSelectedTenant, setActiveTab, onEdit, onShowDetails, markupFactor, showRealCosts }: any) {
  const { name, id, plan = 'FREE', status = 'active', isDefault, consumption: realConsumption } = tenant

  const limitData = PLAN_LIMITS[plan] || PLAN_LIMITS['FREE']
  const currentTokens = realConsumption?.totalTokens || 0
  const currentRawCost = realConsumption?.totalCost || 0
  const consumptionPercentage = Math.min(100, Math.round((currentTokens / limitData.tokens) * 100))
  
  const finalFactor = showRealCosts ? 1 : markupFactor
  const displayCost = (currentRawCost * finalFactor).toFixed(showRealCosts ? 3 : 2)
  const consumptionText = `${(currentTokens / 1000).toFixed(1)}k ($${displayCost}) / ${(limitData.tokens / 1000).toFixed(0)}k`

  const statusColors: any = {
    'Activo': 'text-emerald-500 bg-emerald-500',
    'active': 'text-emerald-500 bg-emerald-500',
    'ACTIVE': 'text-emerald-500 bg-emerald-500',
    'Pendiente': 'text-amber-500 bg-amber-500',
    'pending': 'text-amber-500 bg-amber-500',
    'Suspendido': 'text-rose-500 bg-rose-500',
    'suspended': 'text-rose-500 bg-rose-500',
    'SUSPENDED': 'text-rose-500 bg-rose-500',
  }

  const planColors: any = {
    'ENTERPRISE': 'bg-brand-blue-light text-brand-blue border-brand-blue/10',
    'PRO': 'bg-purple-50 text-purple-600 border-purple-100',
    'FREE': 'bg-slate-100 text-slate-500 border-slate-200',
  }

  const currentStatusColor = statusColors[status] || 'text-slate-400 bg-slate-400'
  const currentPlanColor = planColors[plan] || 'bg-slate-100 text-slate-500 border-slate-200'

  const handleManageUsers = () => {
    setSelectedTenant(tenant)
    setActiveTab('users')
  }

  return (
    <tr className="group hover:bg-slate-50/50 transition-all">
      <td className="px-4 py-5">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs ${plan === 'ENTERPRISE' ? 'bg-brand-blue-light text-brand-blue' : 'bg-slate-100 text-slate-400'}`}>
            {name ? name.split(' ').map((n: string) => n[0]).join('') : '??'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h5 className="font-bold text-sm text-slate-800 leading-tight group-hover:text-brand-blue transition-all cursor-pointer">{name || 'Sin nombre'}</h5>
              {isDefault && <Globe size={12} className="text-brand-blue" />}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-tighter font-medium">ID: #{id?.slice(0, 8)}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-5">
        <button 
          onClick={() => onShowDetails(tenant)}
          className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-transform active:scale-95 ${currentPlanColor}`}
        >
          {plan}
        </button>
      </td>
      <td className="px-4 py-5">
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
          <div className={`w-1.5 h-1.5 rounded-full ${currentStatusColor.split(' ')[1]}`} />
          {status}
        </div>
      </td>
      <td className="px-4 py-5">
        <div className="w-48 cursor-pointer group/bar" onClick={() => onShowDetails(tenant)}>
          <div className="flex justify-between items-center mb-1 text-[9px] font-black text-slate-400">
            <span className={consumptionPercentage > 90 ? 'text-rose-500' : ''}>{consumptionPercentage}%</span>
            <span className="uppercase group-hover/bar:text-brand-blue transition-colors">{consumptionText}</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${consumptionPercentage > 90 ? 'bg-rose-500' : 'bg-brand-blue'}`} 
              style={{width: `${consumptionPercentage}%`}} 
            />
          </div>
        </div>
      </td>
      <td className="px-4 py-5 text-right">
        <div className="flex items-center justify-end gap-2 text-slate-400">
          <button 
            onClick={handleManageUsers}
            title="Gestionar Usuarios"
            className="p-2 hover:bg-white hover:text-brand-blue hover:shadow-sm rounded-lg transition-all"
          >
            <Users size={16} />
          </button>
          <button 
            onClick={() => onShowDetails(tenant)}
            title="Ver Consumo Detallado"
            className="p-2 hover:bg-white hover:text-amber-500 hover:shadow-sm rounded-lg transition-all"
          >
            <Zap size={16} />
          </button>
          <button 
            onClick={() => onEdit(tenant)}
            title="Editar Inquilino"
            className="p-2 hover:bg-white hover:text-brand-blue hover:shadow-sm rounded-lg transition-all"
          >
            <Edit3 size={16} />
          </button>
        </div>
      </td>
    </tr>
  )
}

function TenantModal({ tenant, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    name: tenant?.name || '',
    status: tenant?.status || 'ACTIVE',
    plan: tenant?.plan || 'ENTERPRISE',
    sector: tenant?.sector || 'retail',
    isDefault: tenant?.isDefault || false,
    enabledModules: tenant?.enabledModules || {
      intelligence: { enabled: true, features: { vision: true, predictive: true, protocols: true, agents: true } },
      ecommerce: { enabled: false, features: { catalog: true, orders: true } }
    }
  })

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800">{tenant ? 'Editar Empresa' : 'Nueva Empresa'}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configuración de Organización</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre de la Organización</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-brand-blue transition-all"
                placeholder="Ej. Acuaequipos MX"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-brand-blue appearance-none cursor-pointer"
                >
                  <option value="ACTIVE">Activo</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="SUSPENDED">Suspendido</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Plan</label>
                <select 
                  value={formData.plan}
                  onChange={(e) => setFormData({...formData, plan: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-brand-blue appearance-none cursor-pointer"
                >
                  <option value="ENTERPRISE">Enterprise</option>
                  <option value="PRO">Pro (Scale)</option>
                  <option value="FREE">Free (Starter)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sector</label>
                <select 
                  value={formData.sector || 'retail'}
                  onChange={(e) => setFormData({...formData, sector: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-brand-blue appearance-none cursor-pointer"
                >
                  <option value="retail">Retail / General</option>
                  <option value="acuacultura">Acuacultura</option>
                  <option value="tecnologia">Tecnología</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-brand-blue/5 rounded-2xl border border-brand-blue/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-brand-blue shadow-sm">
                  <Globe size={18} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800">Organización Principal</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Default System Tenant</p>
                </div>
              </div>
              <button 
                onClick={() => setFormData({...formData, isDefault: !formData.isDefault})}
                className={`w-12 h-6 rounded-full transition-all flex items-center px-1 ${formData.isDefault ? 'bg-brand-blue' : 'bg-slate-200'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-all ${formData.isDefault ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Módulos & Suites</label>
              
              <div className="space-y-4">
                {/* Intelligence Suite */}
                <div className={`p-4 rounded-2xl border transition-all ${formData.enabledModules?.intelligence?.enabled ? 'bg-brand-blue/5 border-brand-blue/20' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.enabledModules?.intelligence?.enabled ? 'bg-brand-blue text-white' : 'bg-slate-200 text-slate-400'}`}>
                        <Cpu size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800">Intelligence Suite</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Núcleo de IA Avanzada</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        const current = formData.enabledModules?.intelligence || { enabled: false, features: {} };
                        setFormData({
                          ...formData,
                          enabledModules: {
                            ...formData.enabledModules,
                            intelligence: { ...current, enabled: !current.enabled }
                          }
                        })
                      }}
                      className={`w-10 h-5 rounded-full transition-all flex items-center px-1 ${formData.enabledModules?.intelligence?.enabled ? 'bg-brand-blue' : 'bg-slate-200'}`}
                    >
                      <div className={`w-3 h-3 bg-white rounded-full transition-all ${formData.enabledModules?.intelligence?.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {formData.enabledModules?.intelligence?.enabled && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      {[
                        { id: 'vision', label: 'Vision Lab', icon: <Eye size={12} /> },
                        { id: 'predictive', label: 'Predictive Hub', icon: <BarChart3 size={12} /> },
                        { id: 'protocols', label: 'Protocol Arq', icon: <GitMerge size={12} /> },
                        { id: 'agents', label: 'AI Agents', icon: <Cpu size={12} /> },
                      ].map(feat => (
                        <button 
                          key={feat.id}
                          onClick={() => {
                            const intelligence = formData.enabledModules.intelligence;
                            const features = { ...intelligence.features, [feat.id]: !intelligence.features?.[feat.id] };
                            setFormData({
                              ...formData,
                              enabledModules: {
                                ...formData.enabledModules,
                                intelligence: { ...intelligence, features }
                              }
                            })
                          }}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-[10px] font-bold transition-all ${formData.enabledModules.intelligence.features?.[feat.id] ? 'bg-white border-brand-blue/20 text-brand-blue shadow-sm' : 'bg-transparent border-slate-200 text-slate-400'}`}
                        >
                          {feat.icon}
                          {feat.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* E-commerce Suite */}
                <div className={`p-4 rounded-2xl border transition-all ${formData.enabledModules?.ecommerce?.enabled ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.enabledModules?.ecommerce?.enabled ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        <ShoppingBag size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800">E-commerce Suite</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Gestión de Ventas</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        const current = formData.enabledModules?.ecommerce || { enabled: false, features: {} };
                        setFormData({
                          ...formData,
                          enabledModules: {
                            ...formData.enabledModules,
                            ecommerce: { ...current, enabled: !current.enabled }
                          }
                        })
                      }}
                      className={`w-10 h-5 rounded-full transition-all flex items-center px-1 ${formData.enabledModules?.ecommerce?.enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
                    >
                      <div className={`w-3 h-3 bg-white rounded-full transition-all ${formData.enabledModules?.ecommerce?.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {formData.enabledModules?.ecommerce?.enabled && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      {[
                        { id: 'catalog', label: 'Catálogo', icon: <Package size={12} /> },
                        { id: 'orders', label: 'Órdenes', icon: <ShoppingBag size={12} /> },
                        { id: 'storefront', label: 'Tienda', icon: <Layout size={12} /> },
                        { id: 'payments', label: 'Pagos', icon: <CreditCard size={12} /> },
                      ].map(feat => (
                        <button 
                          key={feat.id}
                          onClick={() => {
                            const ecommerce = formData.enabledModules.ecommerce;
                            const features = { ...ecommerce.features, [feat.id]: !ecommerce.features?.[feat.id] };
                            setFormData({
                              ...formData,
                              enabledModules: {
                                ...formData.enabledModules,
                                ecommerce: { ...ecommerce, features }
                              }
                            })
                          }}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-[10px] font-bold transition-all ${formData.enabledModules.ecommerce.features?.[feat.id] ? 'bg-white border-emerald-200 text-emerald-600 shadow-sm' : 'bg-transparent border-slate-200 text-slate-400'}`}
                        >
                          {feat.icon}
                          {feat.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl text-sm hover:bg-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={() => onSave(formData)}
              className="flex-1 px-6 py-3 bg-brand-blue text-white font-bold rounded-xl text-sm shadow-lg shadow-brand-blue/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ title, value, limit, trend, icon, color, dot }: any) {
  const bgMap: any = {
    blue: 'bg-brand-blue/5',
    amber: 'bg-amber-50',
    emerald: 'bg-emerald-50',
    purple: 'bg-purple-50',
  }

  return (
    <div className="dashboard-card bg-white p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgMap[color] || 'bg-slate-50'}`}>
          {icon}
        </div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight">{title}</p>
      </div>
      <div className="flex items-baseline gap-2">
        <h4 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h4>
        {limit && <span className="text-xs font-bold text-slate-300">{limit}</span>}
        {dot && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mb-1.5" />}
        {trend && <span className={`text-[10px] font-bold ${trend.startsWith('+') ? 'text-emerald-500' : 'text-slate-400'}`}>{trend}</span>}
      </div>
    </div>
  )
}


