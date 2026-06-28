import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTenant } from '../../contexts/TenantContext';
import {
  ShieldCheck,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sprout,
  Users,
  Key,
  Link2,
  Layers,
  Flag,
  Loader2,
} from 'lucide-react';

import { RoleFormModal } from './components/RoleFormModal';
import { PermissionFormModal } from './components/PermissionFormModal';
import { UserContextFormModal } from './components/UserContextFormModal';
import { VerticalRoleFormModal } from './components/VerticalRoleFormModal';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';

type Tab = 'status' | 'roles' | 'permissions' | 'contexts' | 'verticals' | 'features' | 'seed';

interface TableStatus {
  count: number;
  status: 'ok' | 'empty';
}

interface IdentityStatus {
  tables: Record<string, TableStatus>;
  overall: 'ready' | 'needs_seed';
}

const tableLabels: Record<string, { label: string; icon: any }> = {
  roles: { label: 'Roles', icon: Users },
  permissions: { label: 'Permisos', icon: Key },
  rolePermissions: { label: 'Role↔Permission', icon: Link2 },
  userRoles: { label: 'UserRole (usuarios)', icon: Users },
  verticalRoles: { label: 'VerticalRole', icon: Layers },
  userContexts: { label: 'UserContext', icon: Link2 },
  features: { label: 'Features', icon: Flag },
  organizations: { label: 'Organizaciones', icon: Layers },
  sessions: { label: 'Sesiones', icon: Key },
};

export function IdentityPlatform() {
  const { flowApiKey } = useTenant();
  const [activeTab, setActiveTab] = useState<Tab>('status');
  const [status, setStatus] = useState<IdentityStatus | null>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [verticalRoles, setVerticalRoles] = useState<any[]>([]);
  const [userContexts, setUserContexts] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);

  const headers = { 'x-api-key': flowApiKey };

  // Modals state
  const [roleModal, setRoleModal] = useState({ isOpen: false, data: null as any });
  const [permissionModal, setPermissionModal] = useState({ isOpen: false, data: null as any });
  const [userContextModal, setUserContextModal] = useState({ isOpen: false, data: null as any });
  const [verticalRoleModal, setVerticalRoleModal] = useState({ isOpen: false, data: null as any });

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${apiUrl}/api/identity/status`, { headers });
      setStatus(res.data);
    } catch (err) {
      console.error('Error fetching identity status', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/identity/roles`, { headers });
      setRoles(res.data);
    } catch (err) {
      console.error('Error fetching roles', err);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/identity/permissions`, { headers });
      setPermissions(res.data);
    } catch (err) {
      console.error('Error fetching permissions', err);
    }
  };

  const fetchUserRoles = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/identity/user-roles`, { headers });
      setUserRoles(res.data);
    } catch (err) {
      console.error('Error fetching user roles', err);
    }
  };

  const fetchVerticalRoles = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/identity/vertical-roles`, { headers });
      setVerticalRoles(res.data);
    } catch (err) {
      console.error('Error fetching vertical roles', err);
    }
  };

  const fetchUserContexts = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/identity/user-contexts`, { headers });
      setUserContexts(res.data);
    } catch (err) {
      console.error('Error fetching user contexts', err);
    }
  };

  const fetchFeatures = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/identity/features`, { headers });
      setFeatures(res.data);
    } catch (err) {
      console.error('Error fetching features', err);
    }
  };

  const runSeed = async () => {
    try {
      setSeeding(true);
      setSeedResult(null);
      const res = await axios.post(`${apiUrl}/api/identity/seed`, {}, { headers });
      setSeedResult(res.data);
      await fetchStatus();
    } catch (err: any) {
      setSeedResult({ success: false, error: err.message });
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (activeTab === 'roles') fetchRoles();
    if (activeTab === 'permissions') fetchPermissions();
    if (activeTab === 'contexts') fetchUserContexts();
    if (activeTab === 'verticals') fetchVerticalRoles();
    if (activeTab === 'features') fetchFeatures();
  }, [activeTab]);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'status', label: 'Estado', icon: ShieldCheck },
    { id: 'roles', label: 'Roles', icon: Users },
    { id: 'permissions', label: 'Permisos', icon: Key },
    { id: 'contexts', label: 'Contextos', icon: Link2 },
    { id: 'verticals', label: 'Verticales', icon: Layers },
    { id: 'features', label: 'Features', icon: Flag },
    { id: 'seed', label: 'Seed', icon: Sprout },
  ];

  const handleDelete = async (type: string, id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este registro?')) return;
    try {
      await axios.delete(`${apiUrl}/api/identity/${type}/${id}`, { headers });
      fetchStatus();
      if (activeTab === 'roles') fetchRoles();
      if (activeTab === 'permissions') fetchPermissions();
      if (activeTab === 'contexts') fetchUserContexts();
      if (activeTab === 'verticals') fetchVerticalRoles();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar registro');
    }
  };

  const handleSaveRole = async (data: any) => {
    if (roleModal.data?.id) {
      await axios.put(`${apiUrl}/api/identity/roles/${roleModal.data.id}`, data, { headers });
    } else {
      await axios.post(`${apiUrl}/api/identity/roles`, data, { headers });
    }
    fetchStatus();
    fetchRoles();
  };

  const handleSavePermission = async (data: any) => {
    if (permissionModal.data?.id) {
      await axios.put(`${apiUrl}/api/identity/permissions/${permissionModal.data.id}`, data, { headers });
    } else {
      await axios.post(`${apiUrl}/api/identity/permissions`, data, { headers });
    }
    fetchStatus();
    fetchPermissions();
  };

  const handleSaveUserContext = async (data: any) => {
    if (userContextModal.data?.id) {
      await axios.put(`${apiUrl}/api/identity/user-contexts/${userContextModal.data.id}`, data, { headers });
    } else {
      await axios.post(`${apiUrl}/api/identity/user-contexts`, data, { headers });
    }
    fetchStatus();
    fetchUserContexts();
  };

  const handleSaveVerticalRole = async (data: any) => {
    if (verticalRoleModal.data?.id) {
    } else {
      await axios.post(`${apiUrl}/api/identity/vertical-roles`, data, { headers });
    }
    fetchStatus();
    fetchVerticalRoles();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[#0066FF]" />
            Plataforma de Identidad
          </h2>
          <p className="text-[#8892B0] mt-1">
            RBAC centralizado, verticales y permisos
          </p>
        </div>
        <button
          onClick={() => { fetchStatus(); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1A1F2E] hover:bg-[#252B3D] text-white rounded-lg transition-colors border border-[#2A3143]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1A1F2E] rounded-lg p-1 border border-[#2A3143] overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#0066FF] text-white'
                  : 'text-[#8892B0] hover:text-white hover:bg-[#252B3D]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* STATUS TAB */}
      {activeTab === 'status' && status && (
        <div className="space-y-4">
          {/* Overall Status */}
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${
            status.overall === 'ready'
              ? 'bg-[#00E676]/5 border-[#00E676]/20'
              : 'bg-[#FF9800]/5 border-[#FF9800]/20'
          }`}>
            {status.overall === 'ready' ? (
              <CheckCircle2 className="h-6 w-6 text-[#00E676]" />
            ) : (
              <AlertCircle className="h-6 w-6 text-[#FF9800]" />
            )}
            <div>
              <p className={`font-medium ${status.overall === 'ready' ? 'text-[#00E676]' : 'text-[#FF9800]'}`}>
                {status.overall === 'ready' ? 'Identidad configurada' : 'Se requiere seed'}
              </p>
              <p className="text-sm text-[#8892B0]">
                {status.overall === 'ready'
                  ? 'Todas las tablas RBAC tienen datos.'
                  : 'Algunas tablas estan vacias. Ejecuta el seed desde la pestana Seed.'}
              </p>
            </div>
          </div>

          {/* Table Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(status.tables).map(([key, table]) => {
              const meta = tableLabels[key] || { label: key, icon: Database };
              const Icon = meta.icon;
              return (
                <div key={key} className="bg-[#1A1F2E] rounded-xl border border-[#2A3143] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-[#0066FF]" />
                      <span className="text-sm font-medium text-white">{meta.label}</span>
                    </div>
                    {table.status === 'ok' ? (
                      <CheckCircle2 className="h-4 w-4 text-[#00E676]" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-[#FF9800]" />
                    )}
                  </div>
                  <p className="text-2xl font-bold text-white">{table.count}</p>
                  <p className="text-xs text-[#8892B0]">
                    {table.status === 'ok' ? 'Registros encontrados' : 'Tabla vacia'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ROLES TAB */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Roles del Sistema</h3>
            <button 
              onClick={() => setRoleModal({ isOpen: true, data: null })}
              className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-lg transition-colors text-sm font-medium"
            >
              Crear Rol
            </button>
          </div>
          <div className="bg-[#1A1F2E] rounded-xl border border-[#2A3143] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A3143]">
                    <th className="text-left p-4 text-[#8892B0] font-medium">Nombre</th>
                    <th className="text-left p-4 text-[#8892B0] font-medium">Slug</th>
                    <th className="text-left p-4 text-[#8892B0] font-medium">Sistema</th>
                    <th className="text-left p-4 text-[#8892B0] font-medium">Permisos</th>
                    <th className="text-left p-4 text-[#8892B0] font-medium">Usuarios</th>
                    <th className="text-left p-4 text-[#8892B0] font-medium">Verticales</th>
                    <th className="text-left p-4 text-[#8892B0] font-medium">Acciones</th>
                  </tr>
                </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id} className="border-b border-[#2A3143]/50 hover:bg-[#252B3D]/50">
                    <td className="p-4 text-white font-medium">{role.name}</td>
                    <td className="p-4 text-[#8892B0] font-mono text-xs">{role.slug}</td>
                    <td className="p-4">
                      {role.isSystem ? (
                        <span className="text-xs bg-[#0066FF]/10 text-[#0066FF] px-2 py-0.5 rounded-full">System</span>
                      ) : (
                        <span className="text-xs bg-[#2A3143] text-[#8892B0] px-2 py-0.5 rounded-full">Custom</span>
                      )}
                    </td>
                    <td className="p-4 text-[#8892B0]">{role.permissions?.length || 0}</td>
                    <td className="p-4 text-[#8892B0]">{role._count?.userRoles || 0}</td>
                    <td className="p-4 text-[#8892B0]">
                      {role.verticalRoles?.length > 0
                        ? role.verticalRoles.map((vr: any) => vr.vertical?.name).join(', ')
                        : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setRoleModal({ isOpen: true, data: role })}
                          className="text-[#0066FF] hover:text-[#3385FF]"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDelete('roles', role.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {roles.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#8892B0]">
                      No hay roles. Ejecuta el seed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* PERMISSIONS TAB */}
      {activeTab === 'permissions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Catálogo de Permisos</h3>
            <button 
              onClick={() => setPermissionModal({ isOpen: true, data: null })}
              className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-lg transition-colors text-sm font-medium"
            >
              Crear Permiso
            </button>
          </div>
          <div className="bg-[#1A1F2E] rounded-xl border border-[#2A3143] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A3143]">
                    <th className="text-left p-4 text-[#8892B0] font-medium">Key</th>
                    <th className="text-left p-4 text-[#8892B0] font-medium">Recurso</th>
                    <th className="text-left p-4 text-[#8892B0] font-medium">Accion</th>
                    <th className="text-left p-4 text-[#8892B0] font-medium">Descripcion</th>
                    <th className="text-left p-4 text-[#8892B0] font-medium">Roles</th>
                    <th className="text-left p-4 text-[#8892B0] font-medium">Acciones</th>
                  </tr>
                </thead>
              <tbody>
                {permissions.map((perm) => (
                  <tr key={perm.id} className="border-b border-[#2A3143]/50 hover:bg-[#252B3D]/50">
                    <td className="p-4 text-[#0066FF] font-mono text-xs">{perm.key}</td>
                    <td className="p-4 text-white">{perm.resource}</td>
                    <td className="p-4 text-[#8892B0]">{perm.action}</td>
                    <td className="p-4 text-[#8892B0] text-xs">{perm.description || '-'}</td>
                    <td className="p-4 text-[#8892B0]">{perm._count?.rolePermissions || 0}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setPermissionModal({ isOpen: true, data: perm })}
                          className="text-[#0066FF] hover:text-[#3385FF]"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDelete('permissions', perm.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {permissions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#8892B0]">
                      No hay permisos. Ejecuta el seed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* CONTEXTS TAB */}
      {activeTab === 'contexts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Contextos de Usuario</h3>
            <button 
              onClick={() => setUserContextModal({ isOpen: true, data: null })}
              className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-lg transition-colors text-sm font-medium"
            >
              Crear Contexto
            </button>
          </div>
          <div className="bg-[#1A1F2E] rounded-xl border border-[#2A3143] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A3143]">
                    <th className="text-left p-4 text-[#8892B0] font-medium">Usuario</th>
                    <th className="text-left p-4 text-[#8892B0] font-medium">Tenant</th>
                    <th className="text-left p-4 text-[#8892B0] font-medium">Vertical</th>
                    <th className="text-left p-4 text-[#8892B0] font-medium">Rol</th>
                    <th className="text-left p-4 text-[#8892B0] font-medium">Default</th>
                    <th className="text-left p-4 text-[#8892B0] font-medium">Acciones</th>
                  </tr>
                </thead>
              <tbody>
                {userContexts.map((ctx) => (
                  <tr key={ctx.id} className="border-b border-[#2A3143]/50 hover:bg-[#252B3D]/50">
                    <td className="p-4 text-white">{ctx.user?.email || '-'}</td>
                    <td className="p-4 text-[#8892B0]">{ctx.tenant?.name || '-'}</td>
                    <td className="p-4 text-[#8892B0]">{ctx.vertical?.name || 'Global'}</td>
                    <td className="p-4">
                      <span className="text-xs bg-[#0066FF]/10 text-[#0066FF] px-2 py-0.5 rounded-full">
                        {ctx.role?.name || '-'}
                      </span>
                    </td>
                    <td className="p-4">
                      {ctx.isDefault ? (
                        <span className="text-xs bg-[#00E676]/10 text-[#00E676] px-2 py-0.5 rounded-full">Si</span>
                      ) : (
                        <span className="text-xs bg-[#2A3143] text-[#8892B0] px-2 py-0.5 rounded-full">No</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setUserContextModal({ isOpen: true, data: ctx })}
                          className="text-[#0066FF] hover:text-[#3385FF]"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDelete('user-contexts', ctx.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {userContexts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#8892B0]">
                      No hay contextos de usuario.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* VERTICALS TAB */}
      {activeTab === 'verticals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Roles por Vertical</h3>
            <button 
              onClick={() => setVerticalRoleModal({ isOpen: true, data: null })}
              className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-lg transition-colors text-sm font-medium"
            >
              Asignar Rol a Vertical
            </button>
          </div>
          {Object.entries(
            verticalRoles.reduce((acc: Record<string, any[]>, vr: any) => {
              const vName = vr.vertical?.name || 'Sin vertical';
              if (!acc[vName]) acc[vName] = [];
              acc[vName].push(vr);
              return acc;
            }, {})
          ).map(([verticalName, vrs]) => (
            <div key={verticalName} className="bg-[#1A1F2E] rounded-xl border border-[#2A3143] p-4">
              <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#0066FF]" />
                {verticalName}
              </h3>
              <div className="flex flex-wrap gap-2">
                {vrs.map((vr: any) => (
                  <div
                    key={vr.id}
                    className="flex items-center gap-2 bg-[#252B3D] px-3 py-1.5 rounded-lg border border-[#2A3143]"
                  >
                    <span className="text-sm text-[#8892B0]">
                      {vr.role?.name || '-'}
                      <span className="text-xs text-[#5A6480] ml-1 font-mono">({vr.role?.slug})</span>
                    </span>
                    <button
                      onClick={() => handleDelete('vertical-roles', vr.id)}
                      className="ml-2 text-red-500 hover:text-red-400 text-xs"
                      title="Eliminar asignación"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {verticalRoles.length === 0 && (
            <div className="bg-[#1A1F2E] rounded-xl border border-[#2A3143] p-8 text-center text-[#8892B0]">
              No hay roles por vertical. Ejecuta el seed.
            </div>
          )}
        </div>
      )}

      {/* FEATURES TAB */}
      {activeTab === 'features' && (
        <div className="bg-[#1A1F2E] rounded-xl border border-[#2A3143] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A3143]">
                  <th className="text-left p-4 text-[#8892B0] font-medium">Nombre</th>
                  <th className="text-left p-4 text-[#8892B0] font-medium">Slug</th>
                  <th className="text-left p-4 text-[#8892B0] font-medium">Descripcion</th>
                  <th className="text-left p-4 text-[#8892B0] font-medium">Tenants habilitados</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feat) => (
                  <tr key={feat.id} className="border-b border-[#2A3143]/50 hover:bg-[#252B3D]/50">
                    <td className="p-4 text-white font-medium">{feat.name}</td>
                    <td className="p-4 text-[#8892B0] font-mono text-xs">{feat.slug || '-'}</td>
                    <td className="p-4 text-[#8892B0] text-xs">{feat.description || '-'}</td>
                    <td className="p-4 text-[#8892B0]">
                      {feat.tenantFeatures?.filter((tf: any) => tf.enabled).length || 0}
                    </td>
                  </tr>
                ))}
                {features.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-[#8892B0]">
                      No hay features. Ejecuta el seed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEED TAB */}
      {activeTab === 'seed' && (
        <div className="space-y-4">
          <div className="bg-[#1A1F2E] rounded-xl border border-[#2A3143] p-6">
            <h3 className="text-lg font-medium text-white mb-2 flex items-center gap-2">
              <Sprout className="h-5 w-5 text-[#0066FF]" />
              Ejecutar Seed de Identidad
            </h3>
            <p className="text-sm text-[#8892B0] mb-4">
              Esto creara: permisos, roles, asignaciones rol-permiso, roles por vertical,
              features, y migrara los usuarios existentes a la tabla UserRole.
            </p>
            <button
              onClick={runSeed}
              disabled={seeding}
              className="flex items-center gap-2 px-6 py-3 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              {seeding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sprout className="h-4 w-4" />
              )}
              {seeding ? 'Ejecutando seed...' : 'Ejecutar Seed'}
            </button>
          </div>

          {/* Seed Result */}
          {seedResult && (
            <div className={`rounded-xl border p-4 ${
              seedResult.success
                ? 'bg-[#00E676]/5 border-[#00E676]/20'
                : 'bg-[#FF5252]/5 border-[#FF5252]/20'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                {seedResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-[#00E676]" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-[#FF5252]" />
                )}
                <span className={`font-medium ${seedResult.success ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                  {seedResult.success ? 'Seed completado' : 'Seed con errores'}
                </span>
              </div>
              {seedResult.logs && (
                <div className="bg-[#0D1117] rounded-lg p-3 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-[#8892B0] font-mono">
                    {seedResult.logs.join('\n')}
                  </pre>
                </div>
              )}
              {seedResult.error && (
                <p className="text-sm text-[#FF5252] mt-2">{seedResult.error}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {roleModal.isOpen && (
        <RoleFormModal 
          isOpen={roleModal.isOpen} 
          onClose={() => setRoleModal({ isOpen: false, data: null })} 
          onSave={handleSaveRole}
          initialData={roleModal.data}
          permissions={permissions}
        />
      )}
      {permissionModal.isOpen && (
        <PermissionFormModal 
          isOpen={permissionModal.isOpen} 
          onClose={() => setPermissionModal({ isOpen: false, data: null })} 
          onSave={handleSavePermission}
          initialData={permissionModal.data}
        />
      )}
      {userContextModal.isOpen && (
        <UserContextFormModal 
          isOpen={userContextModal.isOpen} 
          onClose={() => setUserContextModal({ isOpen: false, data: null })} 
          onSave={handleSaveUserContext}
          initialData={userContextModal.data}
          roles={roles}
          headers={headers}
        />
      )}
      {verticalRoleModal.isOpen && (
        <VerticalRoleFormModal 
          isOpen={verticalRoleModal.isOpen} 
          onClose={() => setVerticalRoleModal({ isOpen: false, data: null })} 
          onSave={handleSaveVerticalRole}
          initialData={verticalRoleModal.data}
          roles={roles}
        />
      )}
    </div>
  );
}
