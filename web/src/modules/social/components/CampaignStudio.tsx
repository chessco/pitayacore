import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Save, Trash2, CalendarDays, DollarSign, Megaphone } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3014';

export function CampaignStudio() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [audiences, setAudiences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCampaign, setActiveCampaign] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [brandId, setBrandId] = useState('');
  const [objective, setObjective] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [channels, setChannels] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [frequency, setFrequency] = useState('diario');
  const [selectedAudienceIds, setSelectedAudienceIds] = useState<string[]>([]);

  const headers = {
    'x-tenant-id': localStorage.getItem('tenantId') || 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [campRes, brandRes, audRes] = await Promise.all([
        axios.get(`${API_URL}/api/social/campaigns`, { headers }),
        axios.get(`${API_URL}/api/social/brands`, { headers }),
        axios.get(`${API_URL}/api/social/audiences`, { headers }),
      ]);
      setCampaigns(campRes.data);
      setBrands(brandRes.data);
      setAudiences(audRes.data);
      if (campRes.data.length > 0) {
        selectCampaign(campRes.data[0]);
      } else {
        handleStartCreate();
      }
    } catch (err) {
      console.error('Error fetching campaign data', err);
    } finally {
      setLoading(false);
    }
  };

  const selectCampaign = (camp: any) => {
    setActiveCampaign(camp);
    setIsCreating(false);
    setName(camp.name || '');
    setBrandId(camp.brandId || '');
    setObjective(camp.objective || '');
    setStatus(camp.status || 'DRAFT');
    setChannels(camp.channels || []);
    setStartDate(camp.startDate ? camp.startDate.substring(0, 10) : '');
    setEndDate(camp.endDate ? camp.endDate.substring(0, 10) : '');
    setBudget(camp.budget ? String(camp.budget) : '');
    setFrequency(camp.frequency || 'diario');
    setSelectedAudienceIds(camp.audiences?.map((a: any) => a.id) || []);
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setActiveCampaign(null);
    setName('');
    setBrandId(brands[0]?.id || '');
    setObjective('');
    setStatus('DRAFT');
    setChannels(['LINKEDIN']);
    setStartDate(new Date().toISOString().substring(0, 10));
    setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
    setBudget('1000');
    setFrequency('diario');
    setSelectedAudienceIds([]);
  };

  const handleSave = async () => {
    const payload = {
      name,
      brandId,
      objective,
      status,
      channels,
      startDate,
      endDate,
      budget,
      frequency,
      audienceIds: selectedAudienceIds,
    };

    try {
      if (isCreating) {
        const res = await axios.post(`${API_URL}/api/social/campaigns`, payload, { headers });
        setCampaigns([res.data, ...campaigns]);
        selectCampaign(res.data);
      } else if (activeCampaign) {
        const res = await axios.patch(`${API_URL}/api/social/campaigns/${activeCampaign.id}`, payload, { headers });
        setCampaigns(campaigns.map((c) => (c.id === activeCampaign.id ? res.data : c)));
        selectCampaign(res.data);
      }
      alert('¡Campaña guardada con éxito!');
    } catch (err) {
      console.error('Error saving campaign', err);
    }
  };

  const handleDelete = async () => {
    if (!activeCampaign) return;
    if (!confirm('¿Estás seguro de que deseas eliminar esta campaña?')) return;

    try {
      await axios.delete(`${API_URL}/api/social/campaigns/${activeCampaign.id}`, { headers });
      const updated = campaigns.filter((c) => c.id !== activeCampaign.id);
      setCampaigns(updated);
      if (updated.length > 0) {
        selectCampaign(updated[0]);
      } else {
        handleStartCreate();
      }
    } catch (err) {
      console.error('Error deleting campaign', err);
    }
  };

  const toggleChannel = (ch: string) => {
    if (channels.includes(ch)) {
      setChannels(channels.filter((c) => c !== ch));
    } else {
      setChannels([...channels, ch]);
    }
  };

  const toggleAudience = (audId: string) => {
    if (selectedAudienceIds.includes(audId)) {
      setSelectedAudienceIds(selectedAudienceIds.filter((id) => id !== audId));
    } else {
      setSelectedAudienceIds([...selectedAudienceIds, audId]);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex h-full min-h-[600px] overflow-hidden">
      {/* Sidebar - Campaign List */}
      <div className="w-72 border-r border-slate-100 bg-slate-50/50 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <h3 className="font-extrabold text-slate-800 text-base">Campañas</h3>
          <button
            onClick={handleStartCreate}
            className="flex items-center gap-1 px-3 py-1.5 bg-brand-blue text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={14} /> Crear
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <p className="text-xs text-slate-400 p-4 text-center">Cargando...</p>
          ) : campaigns.length === 0 ? (
            <p className="text-xs text-slate-400 p-4 text-center">No hay campañas registradas.</p>
          ) : (
            campaigns.map((c) => (
              <div
                key={c.id}
                onClick={() => selectCampaign(c)}
                className={`p-3 rounded-2xl cursor-pointer transition-all border ${
                  activeCampaign?.id === c.id
                    ? 'bg-white border-brand-blue/30 shadow-md ring-1 ring-brand-blue/5'
                    : 'border-transparent hover:bg-slate-100/50 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-brand-blue flex items-center justify-center">
                    <Megaphone size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate">{c.name}</p>
                    <span
                      className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto custom-scrollbar p-8 space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-800">
              {isCreating ? 'Crear Nueva Campaña' : `Estrategia de ${name || 'sin título'}`}
            </h2>
            <p className="text-xs text-slate-400">
              Configura los canales, metas y presupuesto para coordinar la publicación.
            </p>
          </div>
          <div className="flex gap-2">
            {!isCreating && activeCampaign && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 border border-red-200 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={14} /> Eliminar
              </button>
            )}
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-brand-blue text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-all flex items-center gap-1.5 shadow-md shadow-brand-blue/10 cursor-pointer"
            >
              <Save size={14} /> Guardar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Info Básica */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
              <CalendarDays size={16} className="text-brand-blue" /> Configuración General
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 mb-1 block">Nombre de la Campaña</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-sm"
                  placeholder="ej: Lanzamiento Q3"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Marca</label>
                <select
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-sm"
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                >
                  <option value="">Selecciona una marca...</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Estado</label>
                <select
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="DRAFT">Borrador (DRAFT)</option>
                  <option value="ACTIVE">Activa (ACTIVE)</option>
                  <option value="COMPLETED">Completada (COMPLETED)</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 mb-1 block">Objetivo Estratégico</label>
                <textarea
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-xs h-16 resize-none"
                  placeholder="ej: Posicionar la marca en el sector SaaS legal..."
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Calendario y Canales */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
              <DollarSign size={16} className="text-brand-blue" /> Presupuesto y Canales
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Fecha Inicio</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Fecha Fin</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Presupuesto (USD)</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-sm"
                  placeholder="1000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Frecuencia</label>
                <select
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-sm"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                >
                  <option value="diario">Diario</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensual">Mensual</option>
                </select>
              </div>
            </div>

            {/* Canales (Multi-select) */}
            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block">Canales Sociales</label>
              <div className="flex flex-wrap gap-2">
                {['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'X', 'TIKTOK', 'WHATSAPP_STATUS'].map((ch) => (
                  <button
                    key={ch}
                    onClick={() => toggleChannel(ch)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      channels.includes(ch)
                        ? 'bg-blue-50 border-brand-blue text-brand-blue shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {ch.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Audiencias asociadas */}
        <div className="space-y-3">
          <label className="text-xs font-extrabold text-slate-600 block">Audiencias Objetivo de la Campaña</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {audiences.map((aud) => (
              <div
                key={aud.id}
                onClick={() => toggleAudience(aud.id)}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  selectedAudienceIds.includes(aud.id)
                    ? 'border-brand-blue bg-blue-50/20 shadow-sm'
                    : 'border-slate-100 bg-slate-50/30 hover:border-slate-200'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-slate-700">{aud.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {aud.segments?.slice(0, 2).join(', ')}...
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={selectedAudienceIds.includes(aud.id)}
                  onChange={() => {}} // Controlled by click wrapper
                  className="rounded text-brand-blue focus:ring-brand-blue/20 w-4 h-4 border-slate-200"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Calendar View - Premium Scheduled Events visualizer */}
        {!isCreating && activeCampaign && (
          <div className="space-y-3">
            <label className="text-xs font-extrabold text-slate-600 block flex items-center gap-1.5">
              <Calendar size={16} className="text-brand-blue" /> Calendario de Publicaciones
            </label>
            <div className="border border-slate-100 rounded-3xl bg-slate-50/30 p-4">
              {activeCampaign.publishingQueue?.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No hay publicaciones programadas para esta campaña en la cola aún.
                </p>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                    <div key={d} className="text-[10px] font-black text-slate-400 text-center py-1">
                      {d}
                    </div>
                  ))}
                  {/* Mock calendar rendering of scheduled queue items */}
                  {Array.from({ length: 28 }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const items = activeCampaign.publishingQueue?.filter((q: any) => {
                      const d = new Date(q.scheduledAt);
                      return d.getDate() === dayNum;
                    });

                    return (
                      <div key={idx} className="min-h-16 bg-white border border-slate-100 rounded-xl p-1.5 flex flex-col justify-between shadow-sm">
                        <span className="text-[9px] font-bold text-slate-400">{dayNum}</span>
                        <div className="space-y-1 overflow-y-auto max-h-10 custom-scrollbar">
                          {items?.map((it: any) => (
                            <div
                              key={it.id}
                              className={`text-[8px] font-bold px-1 py-0.5 rounded truncate ${
                                it.status === 'SUCCESS'
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                  : 'bg-amber-50 text-amber-600 border border-amber-100'
                              }`}
                            >
                              {it.provider.substring(0, 3)}: {it.contentPiece?.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
