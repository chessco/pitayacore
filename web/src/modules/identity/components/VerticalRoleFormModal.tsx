import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface VerticalRoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  roles: any[];
}

export function VerticalRoleFormModal({ isOpen, onClose, onSave, roles }: VerticalRoleFormModalProps) {
  const [verticalId, setVerticalId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVerticalId('');
      setRoleId('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ verticalId, roleId });
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
          <h2 className="text-xl font-semibold text-white">Vincular Rol a Vertical</h2>
          <button onClick={onClose} className="text-[#8892B0] hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#8892B0] mb-1">Vertical ID</label>
            <input type="text" required value={verticalId} onChange={e => setVerticalId(e.target.value)} placeholder="UUID de la vertical" className="w-full bg-[#11141D] border border-[#2A3143] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#0066FF]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#8892B0] mb-1">Rol a asignar</label>
            <select required value={roleId} onChange={e => setRoleId(e.target.value)} className="w-full bg-[#11141D] border border-[#2A3143] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#0066FF]">
              <option value="">Selecciona un rol</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
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
