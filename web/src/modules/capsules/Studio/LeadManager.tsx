import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  MoreVertical, 
  Mail, 
  Phone, 
  Calendar,
  ExternalLink,
  MessageSquare,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Trash2,
  CheckCircle,
  X,
  Copy,
  Check,
  ShieldAlert,
  MapPin,
  Laptop
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LeadManagerProps {
  setActiveTab?: (tab: string) => void;
}

export const LeadManager: React.FC<LeadManagerProps> = ({ setActiveTab }) => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSyncCRM = async (lead: any) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('pitayacore_role') || 'ADMIN';
      const tenantId = localStorage.getItem('tenantId') || 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718';

      const response = await axios.post(`${apiUrl}/api/capsule-studio/leads/${lead.id}/sync`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId,
          'x-user-role': role.toUpperCase()
        }
      });

      alert('Lead sincronizado con el CRM maestro con éxito.');
      
      const updatedLead = response.data.lead || { ...lead, contactId: response.data.contactId };
      setSelectedLead(updatedLead);
      fetchLeads(); // Refresh leads
    } catch (err) {
      console.error('Error syncing lead to CRM:', err);
      alert('Error al sincronizar el lead con el CRM.');
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este lead? Esta acción no se puede deshacer.')) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
      const token = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId') || 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718';

      await axios.delete(`${apiUrl}/api/capsule-studio/leads/${leadId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId
        }
      });

      alert('Lead eliminado con éxito.');
      fetchLeads(); // Refresh leads
    } catch (err) {
      console.error('Error deleting lead:', err);
      alert('Error al eliminar el lead.');
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('pitayacore_role') || 'ADMIN';
      const tenantId = localStorage.getItem('tenantId') || 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718';

      const response = await axios.get(`${apiUrl}/api/capsule-studio/leads`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId,
          'x-user-role': role.toUpperCase()
        }
      });
      setLeads(response.data);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lead.phone && lead.phone.includes(searchTerm))
  );

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'Móvil': return <Smartphone size={14} />;
      case 'Tablet': return <Tablet size={14} />;
      default: return <Monitor size={14} />;
    }
  };

  const exportLeads = () => {
    const headers = ['Nombre', 'Email', 'Teléfono', 'Cápsula', 'Campaña', 'Dispositivo', 'OS', 'Navegador', 'Fecha'];
    const csvContent = [
      headers.join(','),
      ...filteredLeads.map(lead => [
        `"${lead.name}"`,
        `"${lead.email}"`,
        `"${lead.phone || ''}"`,
        `"${lead.capsule?.title || ''}"`,
        `"${lead.campaign?.name || 'Directo'}"`,
        `"${lead.metadata?.device || 'Desconocido'}"`,
        `"${lead.metadata?.os || 'Desconocido'}"`,
        `"${lead.metadata?.browser || 'Desconocido'}"`,
        `"${new Date(lead.createdAt).toLocaleString()}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `leads_pitayacore_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando Leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Users className="text-blue-600" size={32} />
            Gestión de Leads
          </h2>
          <p className="text-slate-500 font-medium mt-1">
            Administra y exporta los contactos generados a través de tus cápsulas interactuvas.
          </p>
        </div>
        <button 
          onClick={exportLeads}
          className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-3 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
        >
          <Download size={18} />
          Exportar CSV
        </button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-900/10">
          <p className="text-blue-100 font-bold uppercase tracking-widest text-[10px] mb-2">Total Leads</p>
          <h3 className="text-4xl font-black">{leads.length}</h3>
          <p className="text-blue-200 text-xs mt-4 font-medium">Contactos históricos acumulados</p>
        </div>
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-2">Este Mes</p>
          <h3 className="text-4xl font-black text-slate-800">
            {leads.filter(l => new Date(l.createdAt).getMonth() === new Date().getMonth()).length}
          </h3>
          <p className="text-emerald-500 text-xs mt-4 font-bold">+12% vs mes anterior</p>
        </div>
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-2">Tasa de Conversión</p>
          <h3 className="text-4xl font-black text-slate-800">4.2%</h3>
          <p className="text-slate-500 text-xs mt-4 font-medium">Promedio en todas las cápsulas</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        {/* Table Filters */}
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, email o teléfono..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
              <Filter size={18} />
              Filtrar
            </button>
          </div>
        </div>

        {/* Actual Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Lead</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Contacto</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Dispositivo</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Origen</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Fecha</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLeads.map((lead, idx) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={lead.id} 
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => {
                    setSelectedLead(lead);
                    setIsDetailsOpen(true);
                  }}
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{lead.name}</p>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">{lead.capsule?.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                        <Mail size={14} className="text-slate-300" />
                        {lead.email}
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                          <Phone size={14} className="text-slate-300" />
                          {lead.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[11px]">
                        {getDeviceIcon(lead.metadata?.device)}
                        {lead.metadata?.device || 'Desktop'}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-black uppercase">
                          {lead.metadata?.os || 'Desconocido'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 text-[9px] font-black uppercase">
                          {lead.metadata?.browser || 'Browser'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    {lead.campaign ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-wider">
                        <Calendar size={10} />
                        Campaña: {lead.campaign.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider">
                        <ExternalLink size={10} />
                        Acceso Directo
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-sm font-bold text-slate-500">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      {lead.conversationId && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab?.('conversations');
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 bg-blue-50/50 rounded-lg transition-colors"
                          title="Ver conversación"
                        >
                          <MessageSquare size={18} />
                        </button>
                      )}
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLead(lead);
                          setIsDetailsOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:bg-slate-100 bg-slate-50/50 rounded-lg transition-colors"
                        title="Ver detalles"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          
          {filteredLeads.length === 0 && (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users size={32} className="text-slate-300" />
              </div>
              <h4 className="text-xl font-bold text-slate-800">No se encontraron leads</h4>
              <p className="text-slate-500 mt-2">Intenta ajustar tus filtros de búsqueda.</p>
            </div>
          )}
        </div>
      </div>

      {/* Lead Details Slide-over Panel */}
      <AnimatePresence>
        {isDetailsOpen && selectedLead && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailsOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity cursor-pointer"
            />

            {/* Slide-over panel container */}
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full rounded-l-[2.5rem] border-l border-slate-100 overflow-hidden"
              >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                      {selectedLead.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-[#001A41] text-base leading-tight">{selectedLead.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Detalles del Lead</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsDetailsOpen(false)} 
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {/* Lead Status / CRM Sync Badge */}
                  <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado CRM</p>
                      <p className="text-xs font-bold text-slate-700 mt-1">
                        {selectedLead.contactId ? 'Sincronizado con el CRM Maestro' : 'Pendiente de sincronizar'}
                      </p>
                    </div>
                    <div>
                      {selectedLead.contactId ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider">
                          <CheckCircle size={10} />
                          Sincronizado
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSyncCRM(selectedLead)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm"
                        >
                          Sincronizar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Profile Cards */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1.5">Información Personal</h4>
                    
                    {/* Email Card */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-2 relative group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Mail size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Correo Electrónico</p>
                          <p className="text-xs font-semibold text-slate-700 truncate">{selectedLead.email}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(selectedLead.email, 'email')}
                          className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
                          title="Copiar"
                        >
                          {copiedField === 'email' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Phone Card */}
                    {selectedLead.phone && (
                      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-2 relative group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Phone size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Teléfono / WhatsApp</p>
                            <p className="text-xs font-semibold text-slate-700 truncate">{selectedLead.phone}</p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => copyToClipboard(selectedLead.phone, 'phone')}
                              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
                              title="Copiar"
                            >
                              {copiedField === 'phone' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            </button>
                            <a
                              href={`https://wa.me/${selectedLead.phone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors"
                              title="Enviar WhatsApp"
                            >
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Origin Attribution */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1.5">Origen e Impacto</h4>
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-4">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Cápsula de Conversión</p>
                        <p className="text-xs font-black text-[#001A41] mt-0.5">{selectedLead.capsule?.title || 'General'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{selectedLead.capsule?.topic || 'Retail'}</p>
                      </div>

                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Campaña de Origen</p>
                        {selectedLead.campaign ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 text-[9px] font-black uppercase tracking-wider mt-1">
                            <Calendar size={10} />
                            {selectedLead.campaign.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-wider mt-1">
                            <ExternalLink size={10} />
                            Acceso Directo / Orgánico
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Fecha de Registro</p>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5">
                          {new Date(selectedLead.createdAt).toLocaleString(undefined, { 
                            dateStyle: 'long', 
                            timeStyle: 'short' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Technical Specs */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1.5">Especificaciones Técnicas</h4>
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Dispositivo</p>
                        <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-slate-700">
                          {getDeviceIcon(selectedLead.metadata?.device)}
                          {selectedLead.metadata?.device || 'Desktop'}
                        </div>
                      </div>

                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Sistema Operativo</p>
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-wide mt-1">
                          {selectedLead.metadata?.os || 'Desconocido'}
                        </span>
                      </div>

                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Navegador Web</p>
                        <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-wide mt-1">
                          {selectedLead.metadata?.browser || 'Browser'}
                        </span>
                      </div>

                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Dirección IP</p>
                        <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-slate-500">
                          <Globe size={12} className="text-slate-400" />
                          {selectedLead.metadata?.ip || 'Desconocido'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 shrink-0">
                  {selectedLead.conversationId && (
                    <button
                      onClick={() => {
                        setActiveTab?.('conversations');
                        setIsDetailsOpen(false);
                      }}
                      className="flex-1 bg-blue-600 text-white py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/10"
                    >
                      <MessageSquare size={16} />
                      Ver Chat
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleDeleteLead(selectedLead.id);
                      setIsDetailsOpen(false);
                    }}
                    className="flex-1 border border-red-200 text-red-600 py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={16} />
                    Eliminar
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

