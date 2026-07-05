import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle, AlertTriangle, Eye, Send, ArrowRight, ShieldCheck, RefreshCw, Calendar } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3014';

export function ContentStudio() {
  const [pieces, setPieces] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePiece, setActivePiece] = useState<any | null>(null);
  
  // Generation wizard
  const [brandId, setBrandId] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [contentType, setContentType] = useState('POST');
  const [title, setTitle] = useState('');
  const [promptText, setPromptText] = useState('');
  const [generating, setGenerating] = useState(false);

  // Scheduling states
  const [scheduleProvider, setScheduleProvider] = useState('LINKEDIN');
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduling, setScheduling] = useState(false);

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
      const [piecesRes, brandRes, campRes] = await Promise.all([
        axios.get(`${API_URL}/api/social/content`, { headers }),
        axios.get(`${API_URL}/api/social/brands`, { headers }),
        axios.get(`${API_URL}/api/social/campaigns`, { headers }),
      ]);
      setPieces(piecesRes.data);
      setBrands(brandRes.data);
      setCampaigns(campRes.data);
      if (brandRes.data.length > 0) setBrandId(brandRes.data[0].id);
      if (campRes.data.length > 0) setCampaignId(campRes.data[0].id);
      if (piecesRes.data.length > 0) {
        setActivePiece(piecesRes.data[0]);
      }
    } catch (err) {
      console.error('Error fetching content pieces', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!title.trim() || !promptText.trim()) {
      alert('Por favor ingresa un título y un tema/prompt de generación.');
      return;
    }
    try {
      setGenerating(true);
      const endpoint = campaignId
        ? `${API_URL}/api/social/campaigns/${campaignId}/generate-content`
        : `${API_URL}/api/social/content`;

      const payload = {
        brandId,
        contentType,
        title,
        prompt: promptText,
      };

      const res = await axios.post(endpoint, payload, { headers });
      setPieces([res.data, ...pieces]);
      setActivePiece(res.data);
      setTitle('');
      setPromptText('');
      alert('¡Pieza de contenido generada exitosamente!');
    } catch (err) {
      console.error('Error generating content piece', err);
      alert('Error en el flujo del copywriter / humanizador.');
    } finally {
      setGenerating(false);
    }
  };

  const handleHumanizeAgain = async () => {
    if (!activePiece) return;
    try {
      setGenerating(true);
      const res = await axios.post(`${API_URL}/api/social/content/${activePiece.id}/humanize`, {}, { headers });
      setPieces(pieces.map((p) => (p.id === activePiece.id ? res.data : p)));
      setActivePiece(res.data);
      alert('¡Humanización recalculada!');
    } catch (err) {
      console.error('Error recalculating humanization', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleQueue = async () => {
    if (!activePiece) return;
    if (!scheduledAt) {
      alert('Por favor selecciona una fecha y hora de calendarización.');
      return;
    }
    try {
      setScheduling(true);
      const payload = {
        provider: scheduleProvider,
        scheduledAt: new Date(scheduledAt).toISOString(),
      };
      await axios.post(`${API_URL}/api/social/content/${activePiece.id}/approve-queue`, payload, { headers });
      alert('¡Aprobado y encolado para publicación!');
      fetchData(); // Refresh queue states
    } catch (err) {
      console.error('Error queueing post', err);
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex h-full min-h-[600px] overflow-hidden">
      {/* Sidebar - Piece List */}
      <div className="w-80 border-r border-slate-100 bg-slate-50/50 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-100 bg-white">
          <h3 className="font-extrabold text-slate-800 text-base mb-3">Estudio de Contenidos</h3>
          <div className="space-y-2">
            <select
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-blue/20"
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-blue/20"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              <option value="">Campaña (Opcional)</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Piece creation fields */}
        <div className="p-4 border-b border-slate-100 bg-white/50 space-y-2">
          <input
            type="text"
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
            placeholder="Título del post..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full p-2.5 rounded-lg border border-slate-200 text-xs h-16 resize-none"
            placeholder="Tema del post (Prompt)..."
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
          />
          <div className="flex gap-2 justify-between items-center">
            <select
              className="px-2 py-1.5 border rounded-lg text-xs"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
            >
              <option value="POST">POST</option>
              <option value="CAROUSEL">CAROUSEL</option>
              <option value="VIDEO">VIDEO</option>
              <option value="ARTICLE">ARTÍCULO</option>
            </select>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-3 py-1.5 bg-brand-blue text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-all flex items-center gap-1 shadow cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={12} /> {generating ? 'Generando...' : 'Generar'}
            </button>
          </div>
        </div>

        {/* History of pieces */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <p className="text-xs text-slate-400 p-4 text-center">Cargando...</p>
          ) : pieces.length === 0 ? (
            <p className="text-xs text-slate-400 p-4 text-center">No hay piezas generadas.</p>
          ) : (
            pieces.map((p) => (
              <div
                key={p.id}
                onClick={() => setActivePiece(p)}
                className={`p-3 rounded-2xl cursor-pointer transition-all border ${
                  activePiece?.id === p.id
                    ? 'bg-white border-brand-blue/30 shadow-md'
                    : 'border-transparent hover:bg-slate-100/50 hover:border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start gap-1">
                  <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    {p.contentType}
                  </span>
                  <span
                    className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                      p.status === 'PUBLISHED'
                        ? 'bg-green-50 text-green-600'
                        : p.status === 'APPROVED'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-700 mt-2 line-clamp-1">{p.title}</p>
                <p className="text-[10px] text-slate-400 line-clamp-1">{p.prompt}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail Area */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto custom-scrollbar p-8 space-y-6">
        {activePiece ? (
          <>
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-800">{activePiece.title}</h3>
                <p className="text-[10px] text-slate-400">Generado sobre tema: {activePiece.prompt}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleHumanizeAgain}
                  disabled={generating}
                  className="px-3 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={14} className={generating ? 'animate-spin' : ''} /> {generating ? 'Re-escribiendo...' : 'Re-humanizar'}
                </button>
              </div>
            </div>

            {/* Split Screen comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Copywriter Raw output */}
              <div className="border border-slate-100 rounded-3xl p-5 bg-slate-50/50 flex flex-col h-[300px]">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                  <Sparkles size={12} className="text-slate-400" /> Copywriter Raw AI Output
                </span>
                <textarea
                  readOnly
                  className="flex-1 bg-transparent resize-none outline-none border-0 text-xs text-slate-500 custom-scrollbar"
                  value={activePiece.rawContent || ''}
                />
              </div>

              {/* Humanizer refined output */}
              <div className="border border-brand-blue/10 shadow-sm rounded-3xl p-5 bg-blue-50/10 flex flex-col h-[300px]">
                <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-3 flex items-center gap-1">
                  <CheckCircle size={12} className="text-brand-blue" /> Humanizer Final Copy
                </span>
                <textarea
                  className="flex-1 bg-transparent resize-none outline-none border-0 text-xs text-slate-700 font-medium custom-scrollbar"
                  value={activePiece.humanizedContent || ''}
                  onChange={(e) => {
                    // Local edit ability
                    setActivePiece({ ...activePiece, humanizedContent: e.target.value });
                  }}
                />
              </div>
            </div>

            {/* Brand Safety and Compliance auditing */}
            <div className="p-5 border border-slate-100 rounded-3xl bg-slate-50/30">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 mb-3">
                <ShieldCheck size={16} className="text-emerald-500" /> Auditoría de Brand Safety & Compliance
              </h4>
              {activePiece.metadata?.compliancePassed || activePiece.status === 'APPROVED' || activePiece.status === 'PUBLISHED' ? (
                <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl flex items-center gap-2 text-xs">
                  <CheckCircle size={16} /> Contenido verificado. Cumple con las directrices de marca y no contiene términos prohibidos.
                </div>
              ) : (
                <div className="p-3 bg-amber-50 text-amber-700 border border-amber-100 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle size={16} /> Se encontraron problemas potenciales de cumplimiento de políticas:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    {activePiece.metadata?.complianceChecks?.map((check: string, idx: number) => (
                      <li key={idx}>{check}</li>
                    ))}
                    {activePiece.metadata?.complianceChecks?.length === 0 && (
                      <li>Términos pendientes de aprobación manual por director creativo.</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Publisher Scheduling Area */}
            <div className="border border-slate-100 rounded-3xl p-6 bg-slate-50/20">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 mb-4">
                <Calendar size={16} className="text-brand-blue" /> Programar Publicación
              </h4>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">Canal a Publicar</label>
                  <select
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs"
                    value={scheduleProvider}
                    onChange={(e) => setScheduleProvider(e.target.value)}
                  >
                    <option value="LINKEDIN">LinkedIn</option>
                    <option value="FACEBOOK">Facebook</option>
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="X">X (Twitter)</option>
                    <option value="TIKTOK">TikTok</option>
                    <option value="WHATSAPP_STATUS">WhatsApp Status</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">Fecha y Hora</label>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleQueue}
                  disabled={scheduling}
                  className="px-6 py-2 bg-brand-blue text-white font-bold rounded-xl text-xs hover:bg-blue-600 transition-all flex items-center gap-1.5 shadow-md shadow-brand-blue/10 cursor-pointer disabled:opacity-50 h-10"
                >
                  <Send size={14} /> Encolar en Publisher
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-400 py-12 text-center">
            Selecciona una pieza existente o crea una nueva utilizando el panel izquierdo.
          </p>
        )}
      </div>
    </div>
  );
}
