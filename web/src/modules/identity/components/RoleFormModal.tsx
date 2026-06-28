import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initialData?: any;
  permissions: any[];
}

export function RoleFormModal({ isOpen, onClose, onSave, initialData, permissions }: RoleFormModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isSystem, setIsSystem] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setSlug(initialData.slug || '');
      setDescription(initialData.description || '');
      setIsSystem(initialData.isSystem || false);
      if (initialData.permissions) {
        setSelectedPermissions(initialData.permissions.map((p: any) => p.permissionId));
      } else {
        setSelectedPermissions([]);
      }
    } else {
      setName('');
      setSlug('');
      setDescription('');
      setIsSystem(false);
      setSelectedPermissions([]);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const togglePermission = (id: string) => {
    setSelectedPermissions(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ name, slug, description, isSystem, permissionIds: selectedPermissions });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1A1F2E] border border-[#2A3143] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[#2A3143]">
          <h2 className="text-xl font-semibold text-white">{initialData ? 'Editar Rol' : 'Nuevo Rol'}</h2>
          <button onClick={onClose} className="text-[#8892B0] hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#8892B0] mb-1">Nombre</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#11141D] border border-[#2A3143] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#0066FF]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8892B0] mb-1">Slug</label>
              <input type="text" required value={slug} onChange={e => setSlug(e.target.value)} className="w-full bg-[#11141D] border border-[#2A3143] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#0066FF]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8892B0] mb-1">Descripción</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[#11141D] border border-[#2A3143] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#0066FF]" rows={3} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isSystem" checked={isSystem} onChange={e => setIsSystem(e.target.checked)} className="rounded border-[#2A3143] bg-[#11141D] text-[#0066FF] focus:ring-[#0066FF]" />
              <label htmlFor="isSystem" className="text-sm font-medium text-white">Es rol del sistema</label>
            </div>
            
            <div className="pt-4 border-t border-[#2A3143]">
              <h3 className="text-lg font-medium text-white mb-4">Permisos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                {permissions.map(p => (
                  <label key={p.id} className="flex items-start gap-3 p-3 rounded-lg border border-[#2A3143] bg-[#11141D] hover:border-[#0066FF]/50 cursor-pointer transition-colors">
                    <input type="checkbox" checked={selectedPermissions.includes(p.id)} onChange={() => togglePermission(p.id)} className="mt-1 rounded border-[#2A3143] bg-[#1A1F2E] text-[#0066FF] focus:ring-[#0066FF]" />
                    <div>
                      <div className="text-sm font-medium text-white">{p.key}</div>
                      <div className="text-xs text-[#8892B0]">{p.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
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
