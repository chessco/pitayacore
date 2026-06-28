import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';

interface UserContextFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initialData?: any;
  roles: any[];
  headers: any;
}

export function UserContextFormModal({ isOpen, onClose, onSave, initialData, roles, headers }: UserContextFormModalProps) {
  const [userId, setUserId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [verticalId, setVerticalId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [loading, setLoading] = useState(false);

  // Real app would fetch these, simulating for this component or we could fetch them here
  const [users, setUsers] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [verticals, setVerticals] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Basic fetch
      axios.get(`${apiUrl}/api/workspace/users`, { headers }).then(r => setUsers(r.data)).catch(() => {});
      // Tenants and verticals might require custom endpoints or we can just ask the user to provide IDs for now if they aren't available
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ userId, tenantId, verticalId: verticalId || undefined, roleId, isDefault });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1A1F2E] border border-[#2A3143] rounded-xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[#2A3143]">
          <h2 className="text-xl font-semibold text-white">Nueva Asignaci�n de Contexto</h2>
          <button onClick={onClose} className="text-[#8892B0] hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#8892B0] mb-1">User ID</label>
            <input type="text" required value={userId} onChange={e => setUserId(e.target.value)} placeholder="UUID del usuario" className="w-full bg-[#11141D] border border-[#2A3143] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#0066FF]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#8892B0] mb-1">Tenant ID</label>
            <input type="text" required value={tenantId} onChange={e => setTenantId(e.target.value)} placeholder="UUID del tenant" className="w-full bg-[#11141D] border border-[#2A3143] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#0066FF]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#8892B0] mb-1">Vertical ID (Opcional)</label>
            <input type="text" value={verticalId} onChange={e => setVerticalId(e.target.value)} placeholder="UUID de la vertical" className="w-full bg-[#11141D] border border-[#2A3143] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#0066FF]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#8892B0] mb-1">Rol</label>
            <select required value={roleId} onChange={e => setRoleId(e.target.value)} className="w-full bg-[#11141D] border border-[#2A3143] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#0066FF]">
              <option value="">Selecciona un rol</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input type="checkbox" id="isDefault" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} className="rounded border-[#2A3143] bg-[#11141D] text-[#0066FF] focus:ring-[#0066FF]" />
            <label htmlFor="isDefault" className="text-sm font-medium text-white">Es el contexto por defecto</label>
          </div>
        </form>

        <div className="p-6 border-t border-[#2A3143] flex justify-end gap-3 bg-[#11141D]/50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#8892B0] hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading} className="px-6 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
