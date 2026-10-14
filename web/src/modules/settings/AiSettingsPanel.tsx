import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Cpu, 
  Sparkles, 
  Server, 
  Key, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  Zap, 
  Check,
  Globe
} from 'lucide-react';

interface ModelOption {
  id: string;
  name: string;
  available?: boolean;
}

interface AiConfigState {
  provider: 'gemini' | 'freellmapi';
  model: string;
  gemini: {
    hasEnvKey: boolean;
    isConfiguredInDb: boolean;
    maskedKey: string;
    activeKeySource: 'DATABASE' | 'ENV' | 'NONE';
  };
  freellmapi: {
    url: string;
    isConfigured: boolean;
    maskedKey: string;
  };
}

export const AiSettingsPanel: React.FC = () => {
  const [provider, setProvider] = useState<'gemini' | 'freellmapi'>('gemini');
  const [model, setModel] = useState<string>('gemini-2.5-flash');
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelName, setCustomModelName] = useState('');

  // Credentials
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  
  const [freellmUrl, setFreellmUrl] = useState('http://llm.pitayacode.io/v1');
  const [freellmApiKey, setFreellmApiKey] = useState('');
  const [showFreellmKey, setShowFreellmKey] = useState(false);

  // Status & metadata
  const [configSummary, setConfigSummary] = useState<AiConfigState | null>(null);
  const [modelsList, setModelsList] = useState<ModelOption[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const getApiUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:3014';
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    fetchModels(provider);
  }, [provider]);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const res = await axios.post(`${getApiUrl()}/api/ai/config/get`, {}, { headers: getHeaders() });
      const data: AiConfigState = res.data;
      setConfigSummary(data);
      setProvider(data.provider || 'gemini');
      setModel(data.model || (data.provider === 'freellmapi' ? 'auto' : 'gemini-2.5-flash'));
      if (data.freellmapi?.url) {
        setFreellmUrl(data.freellmapi.url);
      }
    } catch (err) {
      console.error('[AiSettingsPanel] Error fetching AI config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModels = async (prov: 'gemini' | 'freellmapi') => {
    setIsLoadingModels(true);
    try {
      const res = await axios.post(
        `${getApiUrl()}/api/ai/models`,
        {
          provider: prov,
          url: prov === 'freellmapi' ? freellmUrl : undefined,
          key: prov === 'freellmapi' ? (freellmApiKey || undefined) : undefined,
        },
        { headers: getHeaders() }
      );
      if (Array.isArray(res.data)) {
        setModelsList(res.data);
      }
    } catch (err) {
      console.warn('[AiSettingsPanel] Error fetching models list:', err);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const effectiveModel = isCustomModel && customModelName.trim() ? customModelName.trim() : model;
      const res = await axios.post(
        `${getApiUrl()}/api/ai/test`,
        {
          provider,
          model: effectiveModel,
          geminiApiKey: geminiApiKey.trim() || undefined,
          freellmUrl: freellmUrl.trim(),
          freellmApiKey: freellmApiKey.trim() || undefined,
        },
        { headers: getHeaders() }
      );
      setTestResult(res.data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Error desconocido al probar la conexión',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const effectiveModel = isCustomModel && customModelName.trim() ? customModelName.trim() : model;
      const payload: any = {
        provider,
        model: effectiveModel,
        freellmUrl: freellmUrl.trim(),
      };
      if (geminiApiKey.trim()) {
        payload.geminiApiKey = geminiApiKey.trim();
      }
      if (freellmApiKey.trim()) {
        payload.freellmApiKey = freellmApiKey.trim();
      }

      const res = await axios.post(`${getApiUrl()}/api/ai/config`, payload, { headers: getHeaders() });
      setConfigSummary(res.data);
      setSaveSuccess(true);
      // Clear inputs if they were updated so we don't display raw secrets
      setGeminiApiKey('');
      setFreellmApiKey('');
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('[AiSettingsPanel] Error saving configuration:', err);
      alert('Error al guardar la configuración: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
      {/* HEADER */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 backdrop-blur-sm border border-white/10">
            <Cpu size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">Motor de Inteligencia Artificial (LLM)</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                {provider === 'freellmapi' ? 'PitayaCode LLM' : 'Google Gemini'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Administra el proveedor activo, el modelo neuronal y las credenciales API.
            </p>
          </div>
        </div>

        {configSummary && (
          <div className="text-right text-xs">
            <span className="text-slate-400">Modelo Activo: </span>
            <span className="font-mono font-bold text-amber-300">{configSummary.model}</span>
          </div>
        )}
      </div>

      <div className="p-6 space-y-8">
        {/* PROVIDER SELECTION TILES */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            1. Seleccionar Proveedor de Inteligencia Artificial
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GOOGLE GEMINI TILE */}
            <div
              onClick={() => {
                setProvider('gemini');
                if (model === 'auto') setModel('gemini-2.5-flash');
              }}
              className={`relative cursor-pointer rounded-xl p-5 border-2 transition-all flex flex-col justify-between ${
                provider === 'gemini'
                  ? 'border-blue-600 bg-blue-50/40 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${provider === 'gemini' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Google Gemini</h4>
                    <p className="text-xs text-slate-500">Gemini 2.5 Flash, 1.5 Pro</p>
                  </div>
                </div>
                {provider === 'gemini' && (
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Google Generative AI SDK</span>
                <span className={`font-bold ${configSummary?.gemini.hasEnvKey || configSummary?.gemini.isConfiguredInDb ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {configSummary?.gemini.activeKeySource === 'DATABASE' ? 'Clave en BD' : configSummary?.gemini.hasEnvKey ? 'Clave en .env' : 'Sin Clave'}
                </span>
              </div>
            </div>

            {/* PITAYACODE LLM (FREELLMAPI) TILE */}
            <div
              onClick={() => {
                setProvider('freellmapi');
                if (model.includes('gemini')) setModel('auto');
              }}
              className={`relative cursor-pointer rounded-xl p-5 border-2 transition-all flex flex-col justify-between ${
                provider === 'freellmapi'
                  ? 'border-amber-500 bg-amber-50/40 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${provider === 'freellmapi' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-100 text-slate-600'}`}>
                    <Server size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-slate-900 text-sm">PitayaCode LLM (FreeLLMAPI)</h4>
                      <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">Propio</span>
                    </div>
                    <p className="text-xs text-slate-500">llm.pitayacode.io (OpenAI Compatible)</p>
                  </div>
                </div>
                {provider === 'freellmapi' && (
                  <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Auto Fallback + Multi-Model</span>
                <span className={`font-bold ${configSummary?.freellmapi.isConfigured ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {configSummary?.freellmapi.isConfigured ? 'Clave Configurada' : 'Sin Clave'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MODEL SELECTION */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Zap size={14} className="text-amber-500" />
              2. Modelo de Lenguaje a Utilizar
            </label>
            <button
              onClick={() => fetchModels(provider)}
              disabled={isLoadingModels}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors disabled:opacity-50"
              title="Actualizar lista de modelos"
            >
              <RefreshCw size={12} className={isLoadingModels ? 'animate-spin' : ''} />
              Refrescar modelos
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <select
                value={isCustomModel ? 'custom' : model}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setIsCustomModel(true);
                  } else {
                    setIsCustomModel(false);
                    setModel(e.target.value);
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                {modelsList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.id}
                  </option>
                ))}
                <option value="custom">✏️ Especificar otro modelo personalizado...</option>
              </select>
            </div>

            {isCustomModel && (
              <div className="sm:col-span-3">
                <input
                  type="text"
                  value={customModelName}
                  onChange={(e) => setCustomModelName(e.target.value)}
                  placeholder="Ej. deepseek-ai/DeepSeek-V3 o gpt-4o"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {provider === 'freellmapi' 
              ? 'El modelo "auto" balancea automáticamente entre proveedores gratuitos y de alta capacidad configurados en FreeLLMAPI.' 
              : 'Gemini 2.5 Flash ofrece el balance óptimo entre velocidad, capacidad multimodal y coste.'}
          </p>
        </div>

        {/* CREDENTIALS CONFIGURATION */}
        <div className="space-y-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            3. Asignación de Credenciales (API Keys)
          </label>

          {/* GOOGLE GEMINI KEY INPUT */}
          <div className={`p-5 rounded-xl border transition-all ${provider === 'gemini' ? 'bg-white border-blue-200 ring-1 ring-blue-100' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Key size={16} className="text-blue-600" />
                <span className="text-sm font-bold text-slate-800">API Key de Google Gemini</span>
              </div>

              {configSummary?.gemini && (
                <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-slate-100 text-slate-600">
                  {configSummary.gemini.activeKeySource === 'DATABASE' ? (
                    <span className="text-emerald-700 font-bold">● Clave en BD: {configSummary.gemini.maskedKey}</span>
                  ) : configSummary.gemini.hasEnvKey ? (
                    <span className="text-blue-700 font-bold">● Clave en .env: {configSummary.gemini.maskedKey}</span>
                  ) : (
                    <span className="text-rose-600 font-bold">● No configurada</span>
                  )}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Usada para Gemini en las variables de entorno. Puedes asignar una nueva clave aquí para guardarla de forma segura en la base de datos y anular la del servidor:
            </p>

            <div className="relative">
              <input
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy... (deja vacío para mantener la actual)"
                className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* FREELLMAPI / PITAYACODE LLM CREDENTIALS */}
          <div className={`p-5 rounded-xl border transition-all ${provider === 'freellmapi' ? 'bg-white border-amber-300 ring-1 ring-amber-100' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Server size={16} className="text-amber-600" />
                <span className="text-sm font-bold text-slate-800">Credenciales de PitayaCode LLM (FreeLLMAPI)</span>
              </div>

              {configSummary?.freellmapi && (
                <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-slate-100 text-slate-600">
                  {configSummary.freellmapi.isConfigured ? (
                    <span className="text-emerald-700 font-bold">● Clave Activa: {configSummary.freellmapi.maskedKey}</span>
                  ) : (
                    <span className="text-amber-700 font-bold">● Sin clave asignada</span>
                  )}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  URL Base del Servicio
                </label>
                <input
                  type="text"
                  value={freellmUrl}
                  onChange={(e) => setFreellmUrl(e.target.value)}
                  placeholder="http://llm.pitayacode.io/v1"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-600">
                    Clave API Unificada (Unified API Key)
                  </label>
                  <a
                    href="http://llm.pitayacode.io/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1"
                  >
                    Abrir llm.pitayacode.io/keys <ExternalLink size={10} />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showFreellmKey ? 'text' : 'password'}
                    value={freellmApiKey}
                    onChange={(e) => setFreellmApiKey(e.target.value)}
                    placeholder="freellmapi-..."
                    className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFreellmKey(!showFreellmKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showFreellmKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TEST RESULT ALERT */}
        {testResult && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <p className="font-bold">
                {testResult.success ? 'Prueba de Conexión Exitosa' : 'Fallo en la Prueba de Conexión'}
              </p>
              <p className="mt-0.5">{testResult.message}</p>
            </div>
          </div>
        )}

        {/* SAVE SUCCESS BANNER */}
        {saveSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2 text-xs font-bold animate-fade-in">
            <CheckCircle2 size={16} className="text-emerald-600" />
            ¡Configuración guardada y recargada exitosamente en el servidor!
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isTesting ? (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-slate-700"></div>
            ) : (
              <Zap size={14} className="text-amber-500" />
            )}
            <span>Probar Conexión con Proveedor</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
            ) : (
              <Save size={14} />
            )}
            <span>Guardar Configuración</span>
          </button>
        </div>
      </div>
    </div>
  );
};
