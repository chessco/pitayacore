import React, { useState, useEffect } from 'react';
import { Target, Users, Plus, Trash2, Save, Smile, Heart, Map } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3014';

export function AudienceStudio() {
  const [audiences, setAudiences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAudience, setActiveAudience] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [segments, setSegments] = useState<string[]>([]);
  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [fears, setFears] = useState<string[]>([]);
  const [emotions, setEmotions] = useState<string[]>([]);
  
  // Demographics
  const [ageRange, setAgeRange] = useState('');
  const [gender, setGender] = useState('Todos');
  const [location, setLocation] = useState('');
  const [incomeLevel, setIncomeLevel] = useState('');

  // Psychographics
  const [interests, setInterests] = useState<string[]>([]);
  const [behaviors, setBehaviors] = useState<string[]>([]);

  // Buyer Journey
  const [journeyAwareness, setJourneyAwareness] = useState('');
  const [journeyConsideration, setJourneyConsideration] = useState('');
  const [journeyDecision, setJourneyDecision] = useState('');

  // Temp Inputs
  const [tempSegment, setTempSegment] = useState('');
  const [tempPain, setTempPain] = useState('');
  const [tempGoal, setTempGoal] = useState('');
  const [tempFear, setTempFear] = useState('');
  const [tempEmotion, setTempEmotion] = useState('');
  const [tempInterest, setTempInterest] = useState('');
  const [tempBehavior, setTempBehavior] = useState('');

  const headers = {
    'x-tenant-id': localStorage.getItem('tenantId') || 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  };

  useEffect(() => {
    fetchAudiences();
  }, []);

  const fetchAudiences = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/social/audiences`, { headers });
      setAudiences(res.data);
      if (res.data.length > 0) {
        selectAudience(res.data[0]);
      }
    } catch (err) {
      console.error('Error fetching audiences', err);
    } finally {
      setLoading(false);
    }
  };

  const selectAudience = (aud: any) => {
    setActiveAudience(aud);
    setIsCreating(false);
    setName(aud.name || '');
    setSegments(aud.segments || []);
    setPainPoints(aud.painPoints || []);
    setGoals(aud.goals || []);
    setFears(aud.fears || []);
    setEmotions(aud.emotions || []);

    const demo = aud.demographics || {};
    setAgeRange(demo.ageRange || '');
    setGender(demo.gender || 'Todos');
    setLocation(demo.location || '');
    setIncomeLevel(demo.incomeLevel || '');

    const psycho = aud.psychographics || {};
    setInterests(psycho.interests || []);
    setBehaviors(psycho.behaviors || []);

    const journey = aud.buyerJourney || {};
    setJourneyAwareness(journey.awareness || '');
    setJourneyConsideration(journey.consideration || '');
    setJourneyDecision(journey.decision || '');
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setActiveAudience(null);
    setName('');
    setSegments([]);
    setPainPoints([]);
    setGoals([]);
    setFears([]);
    setEmotions([]);
    setAgeRange('');
    setGender('Todos');
    setLocation('');
    setIncomeLevel('');
    setInterests([]);
    setBehaviors([]);
    setJourneyAwareness('');
    setJourneyConsideration('');
    setJourneyDecision('');
  };

  const handleSave = async () => {
    const payload = {
      name,
      segments,
      painPoints,
      goals,
      fears,
      emotions,
      demographics: { ageRange, gender, location, incomeLevel },
      psychographics: { interests, behaviors },
      buyerJourney: { awareness: journeyAwareness, consideration: journeyConsideration, decision: journeyDecision },
    };

    try {
      if (isCreating) {
        const res = await axios.post(`${API_URL}/api/social/audiences`, payload, { headers });
        setAudiences([res.data, ...audiences]);
        selectAudience(res.data);
      } else if (activeAudience) {
        const res = await axios.patch(`${API_URL}/api/social/audiences/${activeAudience.id}`, payload, { headers });
        setAudiences(audiences.map((a) => (a.id === activeAudience.id ? res.data : a)));
        selectAudience(res.data);
      }
      alert('¡Audiencia guardada con éxito!');
    } catch (err) {
      console.error('Error saving audience', err);
    }
  };

  const handleDelete = async () => {
    if (!activeAudience) return;
    if (!confirm('¿Estás seguro de que deseas eliminar esta audiencia?')) return;

    try {
      await axios.delete(`${API_URL}/api/social/audiences/${activeAudience.id}`, { headers });
      const updated = audiences.filter((a) => a.id !== activeAudience.id);
      setAudiences(updated);
      if (updated.length > 0) {
        selectAudience(updated[0]);
      } else {
        handleStartCreate();
      }
    } catch (err) {
      console.error('Error deleting audience', err);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex h-full min-h-[600px] overflow-hidden">
      {/* Sidebar - Audience List */}
      <div className="w-72 border-r border-slate-100 bg-slate-50/50 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <h3 className="font-extrabold text-slate-800 text-base">Audiencias</h3>
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
          ) : audiences.length === 0 ? (
            <p className="text-xs text-slate-400 p-4 text-center">No hay audiencias registradas.</p>
          ) : (
            audiences.map((a) => (
              <div
                key={a.id}
                onClick={() => selectAudience(a)}
                className={`p-3 rounded-2xl cursor-pointer transition-all border ${
                  activeAudience?.id === a.id
                    ? 'bg-white border-brand-blue/30 shadow-md ring-1 ring-brand-blue/5'
                    : 'border-transparent hover:bg-slate-100/50 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center">
                    <Target size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate">{a.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {a.segments?.length || 0} Segmentos
                    </p>
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
              {isCreating ? 'Registrar Nueva Audiencia' : `Perfil de ${name || 'sin título'}`}
            </h2>
            <p className="text-xs text-slate-400">
              Define los dolores, metas e intereses para guiar la empatía y enfoque del redactor IA.
            </p>
          </div>
          <div className="flex gap-2">
            {!isCreating && activeAudience && (
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
          {/* Col 1 - Demographics */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
              <Users size={16} className="text-brand-blue" /> Demografía
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 mb-1 block">Nombre del Arquetipo</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-sm"
                  placeholder="ej: Emprendedores Digitales"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Rango de Edad</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-sm"
                  placeholder="ej: 25-40 años"
                  value={ageRange}
                  onChange={(e) => setAgeRange(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Género</label>
                <select
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-sm"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="Todos">Todos</option>
                  <option value="Hombres">Hombres</option>
                  <option value="Mujeres">Mujeres</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Ubicación Geográfica</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-sm"
                  placeholder="ej: CDMX, Guadalajara"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Nivel de Ingresos</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-sm"
                  placeholder="ej: Medio - Alto"
                  value={incomeLevel}
                  onChange={(e) => setIncomeLevel(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Col 2 - Psychographics */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
              <Smile size={16} className="text-brand-blue" /> Psicografía
            </h4>
            {/* Intereses */}
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Intereses</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                  placeholder="ej: Tecnología SaaS"
                  value={tempInterest}
                  onChange={(e) => setTempInterest(e.target.value)}
                />
                <button
                  onClick={() => {
                    if (tempInterest.trim()) {
                      setInterests([...interests, tempInterest.trim()]);
                      setTempInterest('');
                    }
                  }}
                  className="px-2.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {interests.map((int, i) => (
                  <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] rounded-md font-semibold flex items-center gap-1">
                    {int}
                    <button onClick={() => setInterests(interests.filter((_, idx) => idx !== i))} className="hover:text-indigo-800">×</button>
                  </span>
                ))}
              </div>
            </div>
            {/* Comportamientos */}
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Comportamientos de Compra</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                  placeholder="ej: Compras en línea recurrentes"
                  value={tempBehavior}
                  onChange={(e) => setTempBehavior(e.target.value)}
                />
                <button
                  onClick={() => {
                    if (tempBehavior.trim()) {
                      setBehaviors([...behaviors, tempBehavior.trim()]);
                      setTempBehavior('');
                    }
                  }}
                  className="px-2.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {behaviors.map((b, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-50 text-slate-600 border text-[10px] rounded-md font-semibold flex items-center gap-1">
                    {b}
                    <button onClick={() => setBehaviors(behaviors.filter((_, idx) => idx !== i))} className="hover:text-slate-800">×</button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Psicología: Dolores, Metas, Miedos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Puntos de Dolor */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 block flex items-center gap-1">
              <Heart size={14} className="text-red-500" /> Dolores (Pain Points)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                placeholder="ej: Falta de tiempo"
                value={tempPain}
                onChange={(e) => setTempPain(e.target.value)}
              />
              <button
                onClick={() => {
                  if (tempPain.trim()) {
                    setPainPoints([...painPoints, tempPain.trim()]);
                    setTempPain('');
                  }
                }}
                className="px-2.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold cursor-pointer"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {painPoints.map((p, i) => (
                <span key={i} className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] rounded-md font-semibold flex items-center gap-1">
                  {p}
                  <button onClick={() => setPainPoints(painPoints.filter((_, idx) => idx !== i))} className="hover:text-red-800">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Objetivos */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 block flex items-center gap-1">
              <Target size={14} className="text-brand-blue" /> Metas y Objetivos
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                placeholder="ej: Escalar operaciones"
                value={tempGoal}
                onChange={(e) => setTempGoal(e.target.value)}
              />
              <button
                onClick={() => {
                  if (tempGoal.trim()) {
                    setGoals([...goals, tempGoal.trim()]);
                    setTempGoal('');
                  }
                }}
                className="px-2.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold cursor-pointer"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {goals.map((g, i) => (
                <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] rounded-md font-semibold flex items-center gap-1">
                  {g}
                  <button onClick={() => setGoals(goals.filter((_, idx) => idx !== i))} className="hover:text-emerald-800">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Miedos y Emociones */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 block">Miedos y Emociones Clave</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                placeholder="ej: Quedarse rezagado"
                value={tempFear}
                onChange={(e) => setTempFear(e.target.value)}
              />
              <button
                onClick={() => {
                  if (tempFear.trim()) {
                    setFears([...fears, tempFear.trim()]);
                    setTempFear('');
                  }
                }}
                className="px-2.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold cursor-pointer"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {fears.map((f, i) => (
                <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] rounded-md font-semibold flex items-center gap-1">
                  {f}
                  <button onClick={() => setFears(fears.filter((_, idx) => idx !== i))} className="hover:text-amber-800">×</button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Buyer Journey */}
        <div className="space-y-4">
          <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
            <Map size={16} className="text-brand-blue" /> Viaje del Comprador (Buyer Journey)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Concientización (Awareness)</label>
              <textarea
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-xs h-20 resize-none"
                placeholder="¿Cómo se entera de su problema?"
                value={journeyAwareness}
                onChange={(e) => setJourneyAwareness(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Consideración (Consideration)</label>
              <textarea
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-xs h-20 resize-none"
                placeholder="¿Cómo compara opciones de solución?"
                value={journeyConsideration}
                onChange={(e) => setJourneyConsideration(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Decisión (Decision)</label>
              <textarea
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-xs h-20 resize-none"
                placeholder="¿Qué gatilla la compra?"
                value={journeyDecision}
                onChange={(e) => setJourneyDecision(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
