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
  Plus,
  Pencil,
  Trash2
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
  rolePermissions: { label: 'Role?Permission', icon: Link2 },
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

  // Modal states
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [isVerticalRoleModalOpen, setIsVerticalRoleModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const headers = { 'x-api-key': flowApiKey };

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await axios.get($apiUrl/api/identity/status, { headers });
      setStatus(res.data);
    } catch (err) {
      console.error('Error fetching identity status', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await axios.get($apiUrl/api/identity/roles, { headers });
      setRoles(res.data);
    } catch (err) {
      console.error('Error fetching roles', err);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await axios.get($apiUrl/api/identity/permissions, { headers });
      setPermissions(res.data);
    } catch (err) {
      console.error('Error fetching permissions', err);
    }
  };

  const fetchVerticalRoles = async () => {
    try {
      const res = await axios.get($apiUrl/api/identity/vertical-roles, { headers });
      setVerticalRoles(res.data);
    } catch (err) {
      console.error('Error fetching vertical roles', err);
    }
  };

  const fetchUserContexts = async () => {
    try {
      const res = await axios.get($apiUrl/api/identity/user-contexts, { headers });
      setUserContexts(res.data);
    } catch (err) {
      console.error('Error fetching user contexts', err);
    }
  };

  const fetchFeatures = async () => {
    try {
      const res = await axios.get($apiUrl/api/identity/features, { headers });
      setFeatures(res.data);
    } catch (err) {
      console.error('Error fetching features', err);
    }
  };

  const runSeed = async () => {
    try {
      setSeeding(true);
      setSeedResult(null);
      const res = await axios.post($apiUrl/api/identity/seed, {}, { headers });
      setSeedResult(res.data);
      await fetchStatus();
    } catch (err: any) {
      setSeedResult({ success: false, error: err.message });
    } finally {
      setSeeding(false);
    }
  };

  // CRUD Handlers
  const handleSaveRole = async (data: any) => {
    if (editingItem) {
      await axios.put($apiUrl/api/identity/roles/ + editingItem.id, data, { headers });
    } else {
      await axios.post($apiUrl/api/identity/roles, data, { headers });
    }
    fetchRoles();
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('¿Eliminar rol?')) return;
    try {
      await axios.delete($apiUrl/api/identity/roles/ + id, { headers });
      fetchRoles();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error');
    }
  };

  const handleSavePermission = async (data: any) => {
    if (editingItem) {
      await axios.put($apiUrl/api/identity/permissions/ + editingItem.id, data, { headers });
    } else {
      await axios.post($apiUrl/api/identity/permissions, data, { headers });
    }
    fetchPermissions();
  };

  const handleDeletePermission = async (id: string) => {
    if (!confirm('¿Eliminar permiso?')) return;
    try {
      await axios.delete($apiUrl/api/identity/permissions/ + id, { headers });
      fetchPermissions();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error');
    }
  };

  const handleSaveUserContext = async (data: any) => {
    if (editingItem) {
      await axios.put($apiUrl/api/identity/user-contexts/ + editingItem.id, data, { headers });
    } else {
      await axios.post($apiUrl/api/identity/user-contexts, data, { headers });
    }
    fetchUserContexts();
  };

  const handleDeleteUserContext = async (id: string) => {
    if (!confirm('¿Revocar contexto?')) return;
    try {
      await axios.delete($apiUrl/api/identity/user-contexts/ + id, { headers });
      fetchUserContexts();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error');
    }
  };

  const handleSaveVerticalRole = async (data: any) => {
    await axios.post($apiUrl/api/identity/vertical-roles, data, { headers });
    fetchVerticalRoles();
  };

  const handleDeleteVerticalRole = async (id: string) => {
    if (!confirm('¿Quitar rol de la vertical?')) return;
    try {
      await axios.delete($apiUrl/api/identity/vertical-roles/ + id, { headers });
      fetchVerticalRoles();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error');
    }
  };


  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (activeTab === 'roles') { fetchRoles(); fetchPermissions(); }
    if (activeTab === 'permissions') fetchPermissions();
    if (activeTab === 'contexts') { fetchUserContexts(); fetchRoles(); }
    if (activeTab === 'verticals') { fetchVerticalRoles(); fetchRoles(); }
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
          <RefreshCw className={h-4 w-4 $} />
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
              className={lex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap $}
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
          <div className={lex items-center gap-3 p-4 rounded-xl border $}>
            {status.overall === 'ready' ? (
              <CheckCircle2 className="h-6 w-6 text-[#00E676]" />
            ) : (
              <AlertCircle className="h-6 w-6 text-[#FF9800]" />
            )}
            <div>
              <p className={ont-medium $}>
                {status.overall === 'ready' ? 'Identidad configurada' : 'Se requiere seed'}
              </p>
              <p className="text-sm text-[#8892B0]">
                {status.overall === 'ready'
                  ? 'Todas las tablas RBAC tienen datos.'
                  : 'Algunas tablas estan vacias. Ejecuta el seed desde la pestana Seed.'}
              </p>
            </div>
          </div>

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
          <div className="flex justify-end">
            <button onClick={() => { setEditingItem(null); setIsRoleModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-lg transition-colors font-medium">
              <Plus className="h-4 w-4" /> Crear Rol
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
                    <th className="text-right p-4 text-[#8892B0] font-medium">Acciones</th>
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
                      <td className="p-4 text-right flex justify-end gap-2">
                        <button onClick={() => { setEditingItem(role); setIsRoleModalOpen(true); }} className="p-1 text-[#8892B0] hover:text-[#0066FF]">
                          <Pencil className="h-4 w-4" />
                        </button>
                        {!role.isSystem && (
                          <button onClick={() => handleDeleteRole(role.id)} className="p-1 text-[#8892B0] hover:text-[#FF5252]">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PERMISSIONS TAB */}
      {activeTab === 'permissions' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setEditingItem(null); setIsPermissionModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-lg transition-colors font-medium">
              <Plus className="h-4 w-4" /> Crear Permiso
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
                    <th className="text-right p-4 text-[#8892B0] font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((perm) => (
                    <tr key={perm.id} className="border-b border-[#2A3143]/50 hover:bg-[#252B3D]/50">
                      <td className="p-4 text-[#0066FF] font-mono text-xs">{perm.key}</td>
                      <td className="p-4 text-white">{perm.resource}</td>
                      <td className="p-4 text-[#8892B0]">{perm.action}</td>
                      <td className="p-4 text-[#8892B0] text-xs">{perm.description || '-'}</td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <button onClick={() => { setEditingItem(perm); setIsPermissionModalOpen(true); }} className="p-1 text-[#8892B0] hover:text-[#0066FF]">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeletePermission(perm.id)} className="p-1 text-[#8892B0] hover:text-[#FF5252]">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTEXTS TAB */}
      {activeTab === 'contexts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setEditingItem(null); setIsContextModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-lg transition-colors font-medium">
              <Plus className="h-4 w-4" /> Asignar Contexto
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
                    <th className="text-right p-4 text-[#8892B0] font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {userContexts.map((ctx) => (
                    <tr key={ctx.id} className="border-b border-[#2A3143]/50 hover:bg-[#252B3D]/50">
                      <td className="p-4 text-white">{ctx.user?.email || ctx.userId}</td>
                      <td className="p-4 text-[#8892B0]">{ctx.tenant?.name || ctx.tenantId}</td>
                      <td className="p-4 text-[#8892B0]">{ctx.vertical?.name || 'Global'}</td>
                      <td className="p-4">
                        <span className="text-xs bg-[#0066FF]/10 text-[#0066FF] px-2 py-0.5 rounded-full">
                          {ctx.role?.name || '-'}
                        </span>
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <button onClick={() => handleDeleteUserContext(ctx.id)} className="p-1 text-[#8892B0] hover:text-[#FF5252]">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VERTICALS TAB */}
      {activeTab === 'verticals' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setIsVerticalRoleModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-lg transition-colors font-medium">
              <Plus className="h-4 w-4" /> Vincular Rol a Vertical
            </button>
          </div>
          {Object.entries(
            verticalRoles.reduce((acc: Record<string, any[]>, vr: any) => {
              const vName = vr.vertical?.name || vr.verticalId || 'Sin vertical';
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
                  <span
                    key={vr.id}
                    className="flex items-center gap-2 text-sm bg-[#252B3D] text-[#8892B0] px-3 py-1.5 rounded-lg border border-[#2A3143]"
                  >
                    {vr.role?.name || '-'}
                    <span className="text-xs text-[#5A6480] font-mono">({vr.role?.slug})</span>
                    <button onClick={() => handleDeleteVerticalRole(vr.id)} className="ml-2 hover:text-[#FF5252]">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
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

          {seedResult && (
            <div className={ounded-xl border p-4 $}>
              <div className="flex items-center gap-2 mb-3">
                {seedResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-[#00E676]" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-[#FF5252]" />
                )}
                <span className={ont-medium $}>
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

      {/* Modals */}
      <RoleFormModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        onSave={handleSaveRole}
        initialData={editingItem}
        permissions={permissions}
      />
      <PermissionFormModal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
        onSave={handleSavePermission}
        initialData={editingItem}
      />
      <UserContextFormModal
        isOpen={isContextModalOpen}
        onClose={() => setIsContextModalOpen(false)}
        onSave={handleSaveUserContext}
        roles={roles}
        headers={headers}
      />
      <VerticalRoleFormModal
        isOpen={isVerticalRoleModalOpen}
        onClose={() => setIsVerticalRoleModalOpen(false)}
        onSave={handleSaveVerticalRole}
        roles={roles}
      />
    </div>
  );
}
