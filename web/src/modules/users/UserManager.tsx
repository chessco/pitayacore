import { useState, useEffect } from 'react'
import { 
  Users, 
  Plus, 
  Search, 
  MoreVertical, 
  ShieldCheck, 
  User, 
  Lock,
  Mail, 
  CheckCircle, 
  XCircle,
  Building,
  Edit2,
  Trash2,
  ChevronRight,
  RefreshCcw
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import axios from 'axios'
import { useTenant } from '../../contexts/TenantContext'

export function UserManager() {
  const { flowApiKey, selectedTenant, tenants } = useTenant()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  
  // Resolve the current user role from multiple possible localStorage keys
  const getResolvedRole = () => {
    const role = localStorage.getItem('pitayacore_role') || 
                 localStorage.getItem('userRole') || 
                 localStorage.getItem('role') || 
                 'OWNER';
    
    // Map 'tenant' to 'ADMIN' if that's what the frontend uses
    if (role.toLowerCase() === 'tenant') return 'ADMIN';
    return role.toUpperCase();
  };

  const currentUserRole = getResolvedRole();

  const handleDebugSync = () => {
    console.log('--- DEBUG SESSION ---');
    console.log('Role:', currentUserRole);
    console.log('Tenant ID (Local):', localStorage.getItem('tenantId'));
    console.log('Selected Tenant:', selectedTenant?.id);
    fetchUsers();
  }
  const [formData, setFormData] = useState<any>({
    name: '',
    email: '',
    password: '',
    role: 'OPERATOR',
    status: 'ACTIVE',
    tenantId: '',
    permissions: { menus: ['dashboard', 'conversations', 'settings'], actions: ['read'] }
  })

  // Available menus based on role buckets
  const availableMenus = [
    { id: 'dashboard', label: 'Panel Control' },
    { id: 'donjuan', label: 'Asistente Interno' },
    { id: 'conversations', label: 'Bandeja' },
    { id: 'users', label: 'Usuarios' },
    { id: 'hitl', label: 'HITL' },
    { id: 'corrections', label: 'Correcciones' },
    { id: 'kb', label: 'Conocimiento' },
    { id: 'capsules', label: 'Cápsulas' },
    { id: 'agents', label: 'Agentes' },
    { id: 'skills', label: 'Habilidades' },
    { id: 'predictive', label: 'Hub Predictivo' },
    { id: 'protocols', label: 'Arq. Protocolos' },
    { id: 'vision', label: 'Lab Visión' },
    { id: 'analytics', label: 'Analíticas' },
    { id: 'settings', label: 'Configuración' },
  ]

  const togglePermission = (menuId: string) => {
    const currentMenus = [...formData.permissions.menus]
    const index = currentMenus.indexOf(menuId)
    if (index > -1) {
      currentMenus.splice(index, 1)
    } else {
      currentMenus.push(menuId)
    }
    setFormData({
      ...formData,
      permissions: { ...formData.permissions, menus: currentMenus }
    })
  }


  useEffect(() => {
    fetchUsers()
  }, [selectedTenant?.id])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
      const token = localStorage.getItem('token');
      // If SUPERUSER, we can fetch all users or use a specific global endpoint
      const endpoint = currentUserRole === 'SYSTEM' ? `${apiUrl}/api/users` : `${apiUrl}/api/users`;
      console.log('Fetching users from:', endpoint);
      console.log('Headers:', {
        'x-tenant-id': selectedTenant?.id || localStorage.getItem('tenantId'),
        'x-user-role': currentUserRole
      });
      
      const response = await axios.get(endpoint, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || localStorage.getItem('tenantId') || 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718',
          'x-user-role': currentUserRole,
          'Authorization': `Bearer ${token}`
        }
      })
      setUsers(response.data)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
      const token = localStorage.getItem('token');
      
      const payload = {
        ...formData,
        // Ensure tenantId is sent if changed by superuser
        tenantId: formData.tenantId || selectedTenant?.id
      };

      if (editingUser) {
        await axios.patch(`${apiUrl}/api/users/${editingUser.id}`, payload, {
          headers: { 
            'x-tenant-id': selectedTenant?.id || '', 
            'x-user-role': currentUserRole,
            'x-api-key': flowApiKey,
            'Authorization': `Bearer ${token}`
          }
        })
      } else {
        await axios.post(`${apiUrl}/api/users`, payload, {
          headers: { 
            'x-tenant-id': selectedTenant?.id || '', 
            'x-user-role': currentUserRole,
            'x-api-key': flowApiKey,
            'Authorization': `Bearer ${token}`
          }
        })
      }
      setIsModalOpen(false)
      setEditingUser(null)
      fetchUsers()
    } catch (error) {
      console.error('Error saving user:', error)
      alert('Error al guardar el usuario.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return
    try {
      let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
      const token = localStorage.getItem('token');
      await axios.delete(`${apiUrl}/api/users/${id}`, {
        headers: { 
          'x-tenant-id': selectedTenant?.id || '', 
          'x-user-role': currentUserRole,
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      })
      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8 bg-surface h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar pb-32">
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            <span>Administración</span>
            <ChevronRight size={10} />
            <span className="text-brand-blue">Gestión de Usuarios</span>
          </div>
          <h2 className="text-3xl font-black font-display text-slate-800">Control de Accesos</h2>
          <p className="text-sm text-slate-500 mt-1">Gestiona los permisos y roles de los operadores del sistema.</p>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={handleDebugSync}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all text-sm font-medium"
          >
            <RefreshCcw size={16} />
            Actualizar
          </button>
          <button 
            onClick={() => {
              setEditingUser(null)
              setFormData({ 
                name: '', 
                email: '', 
                password: '', 
                role: 'OPERATOR', 
                status: 'ACTIVE', 
                tenantId: selectedTenant?.id || localStorage.getItem('tenantId') || '',
                permissions: { menus: ['dashboard', 'conversations', 'settings'], actions: ['read'] }
              })
              setIsModalOpen(true)
            }}
            className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-xl text-sm font-bold shadow-xl shadow-brand-blue/30 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus size={18} />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Stats/Filters */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="dashboard-card bg-white p-4 flex items-center gap-4 border-b-2 border-brand-blue">
          <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Usuarios</p>
            <p className="text-xl font-black text-slate-800">{users.length}</p>
          </div>
        </div>
        
        <div className="col-span-3 dashboard-card bg-white p-4 flex items-center gap-4">
          <Search className="text-slate-300" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o email..."
            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-600 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="dashboard-card bg-white overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-slate-50/50">
              <th className="text-left p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
              <th className="text-left p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol</th>
              <th className="text-left p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
              <th className="text-left p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Módulos</th>
              <th className="text-right p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className="border-b border-border hover:bg-slate-50/50 transition-all">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                    user.role === 'ADMIN' ? 'bg-amber-100 text-amber-600' : 
                    user.role === 'SYSTEM' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {user.status === 'ACTIVE' ? (
                      <CheckCircle className="text-emerald-500" size={14} />
                    ) : (
                      <XCircle className="text-rose-500" size={14} />
                    )}
                    <span className="text-xs font-bold text-slate-600">{user.status}</span>
                  </div>
                </td>
                <td className="p-4">
                   <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {user.permissions?.menus?.slice(0, 3).map((m: string) => (
                        <span key={m} className="text-[8px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase">{m}</span>
                      ))}
                      {user.permissions?.menus?.length > 3 && (
                        <span className="text-[8px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">+{user.permissions.menus.length - 3}</span>
                      )}
                   </div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => {
                        setEditingUser(user)
                        setFormData({ 
                          name: user.name, 
                          email: user.email, 
                          password: '', 
                          role: user.role, 
                          status: user.status, 
                          tenantId: user.tenantId,
                          permissions: user.permissions || { menus: ['dashboard', 'conversations', 'settings'], actions: ['read'] }
                        })
                        setIsModalOpen(true)
                      }}
                      className="p-2 hover:bg-brand-blue/5 text-slate-400 hover:text-brand-blue rounded-lg transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(user.id)}
                      className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-border bg-slate-50/50">
                <div className="flex items-center gap-3 text-brand-blue mb-2">
                  <ShieldCheck size={24} />
                  <h3 className="text-2xl font-black font-display uppercase tracking-tight">
                    {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                  </h3>
                </div>
                <p className="text-slate-500 text-sm">Configura los accesos y privilegios del personal.</p>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre Completo</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        required
                        className="w-full bg-slate-50 border border-border rounded-xl py-3 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-brand-blue transition-all"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Corporativo</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="email" 
                        required
                        className="w-full bg-slate-50 border border-border rounded-xl py-3 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-brand-blue transition-all"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Rol del Sistema</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-blue"
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                    >
                      <option value="USER">Usuario Estándar</option>
                      <option value="ADMIN">Administrador de Tenant</option>
                      <option value="SYSTEM">Administrador del Sistema (Root)</option>
                    </select>
                  </div>

                  {currentUserRole === 'SYSTEM' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Asignar a Inquilino</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-blue"
                        value={formData.tenantId || ''}
                        onChange={(e) => setFormData({...formData, tenantId: e.target.value})}
                      >
                        <option value="">Seleccionar empresa...</option>
                        {tenants.map((t: any) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</label>
                    <select 
                      className="w-full bg-slate-50 border border-border rounded-xl py-3 px-4 text-sm font-bold focus:outline-none focus:border-brand-blue transition-all"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="ACTIVE">Activo</option>
                      <option value="INACTIVE">Inactivo</option>
                      <option value="SUSPENDED">Suspendido</option>
                    </select>
                  </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Módulos Autorizados (RBAC)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {availableMenus.map(menu => (
                      <button
                        key={menu.id}
                        type="button"
                        onClick={() => togglePermission(menu.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                          formData.permissions.menus.includes(menu.id)
                            ? 'border-brand-blue bg-brand-blue/5 text-brand-blue font-bold'
                            : 'border-slate-100 bg-slate-50 text-slate-400'
                        }`}
                      >
                        <span className="text-[10px] uppercase tracking-tighter">{menu.label}</span>
                        {formData.permissions.menus.includes(menu.id) ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contraseña {editingUser && '(Opcional)'}</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="password" 
                      placeholder={editingUser ? "Dejar en blanco para no cambiar..." : "Contraseña de acceso..."}
                      required={!editingUser}
                      className="w-full bg-slate-50 border border-border rounded-xl py-3 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-brand-blue transition-all"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 border border-border rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-brand-blue text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-blue/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    {editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

