import React, { useState, useEffect } from 'react';
import { ShieldAlert, Sparkles, Plus, Trash2, Save, MessageSquare, Palette, Globe } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3014';

export function BrandStudio() {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBrand, setActiveBrand] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('México');
  const [language, setLanguage] = useState('es');
  const [tone, setTone] = useState<string[]>([]);
  const [personality, setPersonality] = useState<string[]>([]);
  const [values, setValues] = useState<string[]>([]);
  const [prohibitedTerms, setProhibitedTerms] = useState<string[]>([]);
  const [allowedEmojis, setAllowedEmojis] = useState<string[]>([]);
  const [ctaStyle, setCtaStyle] = useState('directo y persuasivo');
  const [logoUrl, setLogoUrl] = useState('');
  const [brandColors, setBrandColors] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);

  // Helpers for list input
  const [tempTone, setTempTone] = useState('');
  const [tempPersonality, setTempPersonality] = useState('');
  const [tempValue, setTempValue] = useState('');
  const [tempProhibited, setTempProhibited] = useState('');
  const [tempEmoji, setTempEmoji] = useState('');
  const [tempColor, setTempColor] = useState('#2563EB');
  const [tempCompetitor, setTempCompetitor] = useState('');

  const headers = {
    'x-tenant-id': localStorage.getItem('tenantId') || 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/social/brands`, { headers });
      setBrands(res.data);
      if (res.data.length > 0) {
        selectBrand(res.data[0]);
      }
    } catch (err) {
      console.error('Error fetching brands', err);
    } finally {
      setLoading(false);
    }
  };

  const selectBrand = (brand: any) => {
    setActiveBrand(brand);
    setIsCreating(false);
    setName(brand.name || '');
    setIndustry(brand.industry || '');
    setCountry(brand.country || '');
    setLanguage(brand.language || '');
    setTone(brand.tone || []);
    setPersonality(brand.personality || []);
    setValues(brand.values || []);
    setProhibitedTerms(brand.prohibitedTerms || []);
    setAllowedEmojis(brand.allowedEmojis || []);
    setCtaStyle(brand.ctaStyle || 'directo y persuasivo');
    setLogoUrl(brand.logoUrl || '');
    setBrandColors(brand.brandColors || []);
    setCompetitors(brand.competitors || []);
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setActiveBrand(null);
    setName('');
    setIndustry('');
    setCountry('México');
    setLanguage('es');
    setTone([]);
    setPersonality([]);
    setValues([]);
    setProhibitedTerms([]);
    setAllowedEmojis([]);
    setCtaStyle('directo y persuasivo');
    setLogoUrl('');
    setBrandColors(['#2563EB']);
    setCompetitors([]);
  };

  const handleSave = async () => {
    const payload = {
      name,
      industry,
      country,
      language,
      tone,
      personality,
      values,
      prohibitedTerms,
      allowedEmojis,
      ctaStyle,
      logoUrl,
      brandColors,
      competitors,
    };

    try {
      if (isCreating) {
        const res = await axios.post(`${API_URL}/api/social/brands`, payload, { headers });
        setBrands([res.data, ...brands]);
        selectBrand(res.data);
      } else if (activeBrand) {
        const res = await axios.patch(`${API_URL}/api/social/brands/${activeBrand.id}`, payload, { headers });
        setBrands(brands.map((b) => (b.id === activeBrand.id ? res.data : b)));
        selectBrand(res.data);
      }
      alert('¡Identidad de marca guardada con éxito!');
    } catch (err) {
      console.error('Error saving brand', err);
      alert('Error al guardar la marca');
    }
  };

  const handleDelete = async () => {
    if (!activeBrand) return;
    if (!confirm('¿Estás seguro de que deseas eliminar esta marca y todas sus campañas asociadas?')) return;

    try {
      await axios.delete(`${API_URL}/api/social/brands/${activeBrand.id}`, { headers });
      const updated = brands.filter((b) => b.id !== activeBrand.id);
      setBrands(updated);
      if (updated.length > 0) {
        selectBrand(updated[0]);
      } else {
        handleStartCreate();
      }
    } catch (err) {
      console.error('Error deleting brand', err);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex h-full min-h-[600px] overflow-hidden">
      {/* Sidebar - Brand List */}
      <div className="w-72 border-r border-slate-100 bg-slate-50/50 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <h3 className="font-extrabold text-slate-800 text-base">Marcas</h3>
          <button
            onClick={handleStartCreate}
            className="flex items-center gap-1 px-3 py-1.5 bg-brand-blue text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={14} /> Nueva
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <p className="text-xs text-slate-400 p-4 text-center">Cargando...</p>
          ) : brands.length === 0 ? (
            <p className="text-xs text-slate-400 p-4 text-center">No hay marcas registradas.</p>
          ) : (
            brands.map((b) => (
              <div
                key={b.id}
                onClick={() => selectBrand(b)}
                className={`p-3 rounded-2xl cursor-pointer transition-all border ${
                  activeBrand?.id === b.id
                    ? 'bg-white border-brand-blue/30 shadow-md ring-1 ring-brand-blue/5'
                    : 'border-transparent hover:bg-slate-100/50 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {b.logoUrl ? (
                    <img src={b.logoUrl} alt="" className="w-8 h-8 rounded-full object-cover border" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-brand-blue flex items-center justify-center font-bold text-xs">
                      {b.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate">{b.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{b.industry || 'Sin industria'}</p>
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
              {isCreating ? 'Registrar Nueva Marca' : `Branding de ${name || 'sin título'}`}
            </h2>
            <p className="text-xs text-slate-400">
              Define la voz, personalidad y reglas estéticas para las generaciones de IA.
            </p>
          </div>
          <div className="flex gap-2">
            {!isCreating && activeBrand && (
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
          {/* Col 1 - Info General */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
              <Globe size={16} className="text-brand-blue" /> Información Básica
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 mb-1 block">Nombre de la Marca</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-sm"
                  placeholder="ej: AAA Abogados"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Industria / Nicho</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-sm"
                  placeholder="ej: Legal"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">País Objetivo</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-sm"
                  placeholder="ej: México"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Idioma Principal</label>
                <select
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-sm"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="es">Español (es)</option>
                  <option value="en">English (en)</option>
                  <option value="pt">Português (pt)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">URL del Logo (Opcional)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-sm"
                  placeholder="ej: https://logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Col 2 - Visuales */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
              <Palette size={16} className="text-brand-blue" /> Identidad Visual
            </h4>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Paleta de Colores</label>
              <div className="flex gap-2 items-center mb-2">
                <input
                  type="color"
                  className="w-10 h-10 border-0 rounded-xl cursor-pointer p-0"
                  value={tempColor}
                  onChange={(e) => setTempColor(e.target.value)}
                />
                <button
                  onClick={() => {
                    if (!brandColors.includes(tempColor)) {
                      setBrandColors([...brandColors, tempColor]);
                    }
                  }}
                  className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Añadir Color
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {brandColors.map((c, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-1"
                    style={{ backgroundColor: c }}
                  >
                    {c}
                    <button
                      onClick={() => setBrandColors(brandColors.filter((_, idx) => idx !== i))}
                      className="hover:text-slate-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Estilo de CTA</label>
              <input
                type="text"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-sm"
                placeholder="ej: directo, profesional, sutil..."
                value={ctaStyle}
                onChange={(e) => setCtaStyle(e.target.value)}
              />
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Voz y Tono */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tono */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 block flex items-center gap-1">
              <MessageSquare size={14} className="text-brand-blue" /> Tono de Voz
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                placeholder="ej: Consultivo"
                value={tempTone}
                onChange={(e) => setTempTone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tempTone.trim()) {
                    setTone([...tone, tempTone.trim()]);
                    setTempTone('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (tempTone.trim()) {
                    setTone([...tone, tempTone.trim()]);
                    setTempTone('');
                  }
                }}
                className="px-2.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold cursor-pointer"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tone.map((t, i) => (
                <span key={i} className="px-2 py-0.5 bg-blue-50 text-brand-blue text-[10px] rounded-md font-semibold flex items-center gap-1">
                  {t}
                  <button onClick={() => setTone(tone.filter((_, idx) => idx !== i))} className="hover:text-blue-800">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Personalidad */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 block flex items-center gap-1">
              <Sparkles size={14} className="text-brand-blue" /> Personalidad
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                placeholder="ej: Serio"
                value={tempPersonality}
                onChange={(e) => setTempPersonality(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tempPersonality.trim()) {
                    setPersonality([...personality, tempPersonality.trim()]);
                    setTempPersonality('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (tempPersonality.trim()) {
                    setPersonality([...personality, tempPersonality.trim()]);
                    setTempPersonality('');
                  }
                }}
                className="px-2.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold cursor-pointer"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {personality.map((p, i) => (
                <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] rounded-md font-semibold flex items-center gap-1">
                  {p}
                  <button onClick={() => setPersonality(personality.filter((_, idx) => idx !== i))} className="hover:text-purple-800">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Valores */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 block flex items-center gap-1">
              <ShieldAlert size={14} className="text-brand-blue" /> Valores de Marca
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                placeholder="ej: Honestidad"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tempValue.trim()) {
                    setValues([...values, tempValue.trim()]);
                    setTempValue('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (tempValue.trim()) {
                    setValues([...values, tempValue.trim()]);
                    setTempValue('');
                  }
                }}
                className="px-2.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold cursor-pointer"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {values.map((v, i) => (
                <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] rounded-md font-semibold flex items-center gap-1">
                  {v}
                  <button onClick={() => setValues(values.filter((_, idx) => idx !== i))} className="hover:text-emerald-800">×</button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Reglas de exclusión y emojis */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Emojis Permitidos */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 block">Emojis Permitidos</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                placeholder="ej: ⚖️"
                value={tempEmoji}
                onChange={(e) => setTempEmoji(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tempEmoji.trim()) {
                    setAllowedEmojis([...allowedEmojis, tempEmoji.trim()]);
                    setTempEmoji('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (tempEmoji.trim()) {
                    setAllowedEmojis([...allowedEmojis, tempEmoji.trim()]);
                    setTempEmoji('');
                  }
                }}
                className="px-2.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold cursor-pointer"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 text-sm">
              {allowedEmojis.map((e, idx) => (
                <span key={idx} className="p-1 bg-slate-50 border rounded-lg flex items-center gap-1 text-xs">
                  {e}
                  <button onClick={() => setAllowedEmojis(allowedEmojis.filter((_, i) => i !== idx))} className="text-[10px] text-slate-400 hover:text-red-500">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Términos Prohibidos */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 block">Términos Prohibidos</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                placeholder="ej: inteligencia artificial"
                value={tempProhibited}
                onChange={(e) => setTempProhibited(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tempProhibited.trim()) {
                    setProhibitedTerms([...prohibitedTerms, tempProhibited.trim()]);
                    setTempProhibited('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (tempProhibited.trim()) {
                    setProhibitedTerms([...prohibitedTerms, tempProhibited.trim()]);
                    setTempProhibited('');
                  }
                }}
                className="px-2.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold cursor-pointer"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {prohibitedTerms.map((t, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] rounded-md font-semibold flex items-center gap-1">
                  {t}
                  <button onClick={() => setProhibitedTerms(prohibitedTerms.filter((_, i) => i !== idx))} className="hover:text-red-800">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Competidores */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 block">Análisis de Competidores</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                placeholder="ej: Despacho Jurídico X"
                value={tempCompetitor}
                onChange={(e) => setTempCompetitor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tempCompetitor.trim()) {
                    setCompetitors([...competitors, tempCompetitor.trim()]);
                    setTempCompetitor('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (tempCompetitor.trim()) {
                    setCompetitors([...competitors, tempCompetitor.trim()]);
                    setTempCompetitor('');
                  }
                }}
                className="px-2.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold cursor-pointer"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {competitors.map((c, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded-md font-semibold flex items-center gap-1">
                  {c}
                  <button onClick={() => setCompetitors(competitors.filter((_, i) => i !== idx))} className="hover:text-slate-800">×</button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
