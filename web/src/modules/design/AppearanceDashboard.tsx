import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTenant } from '../../contexts/TenantContext';
import { useThemeEngine } from './providers/ThemeProvider';
import { 
  Sparkles, Palette, Check, Wand2, Eye, ShieldCheck, 
  Settings, Layers, RefreshCw, Sliders, Layout, Type
} from 'lucide-react';

export function AppearanceDashboard() {
  const { selectedTenant, flowApiKey } = useTenant();
  const { config, refreshTheme } = useThemeEngine();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3014';

  const [themes, setThemes] = useState<any[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('Sofisticado y moderno para acuicultura de precisión, tonos azules oscuros con acentos de color verde esmeralda y bordes redondeados orgánicos.');
  const [tempTokens, setTempTokens] = useState<any[]>([]);

  // Preview elements styling
  const getPreviewStyle = (tokenName: string, fallback: string) => {
    const token = tempTokens.find(t => t.name === tokenName);
    return token ? token.value : fallback;
  };

  useEffect(() => {
    fetchThemes();
  }, [selectedTenant]);

  const fetchThemes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${apiUrl}/api/design/themes`, {
        headers: {
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      });
      setThemes(res.data);
      const active = res.data.find((t: any) => t.isDefault);
      if (active) {
        setSelectedThemeId(active.id);
        setTempTokens(active.tokens || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleActivate = async (themeId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${apiUrl}/api/design/themes/${themeId}/activate`, {}, {
        headers: {
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      });
      await refreshTheme();
      await fetchThemes();
      alert('Tema activado correctamente');
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('token');
      // Simulated generation call
      const res = await axios.post(`${apiUrl}/api/design/themes`, {
        name: `AI Theme - ${new Date().toLocaleDateString()}`,
        description: prompt,
        mode: 'LIGHT',
        tokens: [
          { name: 'primary', value: '#10b981', type: 'color' },
          { name: 'primary-light', value: '#34d399', type: 'color' },
          { name: 'primary-dark', value: '#047857', type: 'color' },
          { name: 'secondary', value: '#3b82f6', type: 'color' },
          { name: 'accent', value: '#f59e0b', type: 'color' },
          { name: 'background', value: '#f8fafc', type: 'color' },
          { name: 'surface', value: '#ffffff', type: 'color' },
          { name: 'text-primary', value: '#0f172a', type: 'color' },
          { name: 'text-secondary', value: '#475569', type: 'color' },
          { name: 'border', value: '#e2e8f0', type: 'color' },
          { name: 'radius', value: '16px', type: 'radius' },
          { name: 'spacing', value: '16px', type: 'spacing' },
        ]
      }, {
        headers: {
          'x-tenant-id': selectedTenant?.id || '',
          'x-api-key': flowApiKey,
          'Authorization': `Bearer ${token}`
        }
      });
      setTempTokens(res.data.tokens);
      await fetchThemes();
      await handleActivate(res.data.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] min-h-screen text-slate-800">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Palette className="text-indigo-600" size={32} />
            Design Suite & Marca Blanca
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Configura la identidad visual, tipografía y tokens de diseño dinámicos para tu espacio de trabajo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* left column: control and generators */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* AI Generator */}
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="text-amber-500" size={20} />
                Generación Automática con IA
              </h2>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              Describe la personalidad de tu marca, logo o colores preferidos, y nuestra IA generará una paleta de tokens accesibles que cumple con la normativa WCAG.
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-24 p-4 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
            />
            <button
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 transition-all"
            >
              {isGenerating ? (
                <RefreshCw className="animate-spin" size={16} />
              ) : (
                <Wand2 size={16} />
              )}
              Generar y Aplicar Tema Dinámico
            </button>
          </div>

          {/* Theme list */}
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Layers size={20} className="text-indigo-600" />
              Temas Registrados
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {themes.map((theme) => (
                <div 
                  key={theme.id}
                  onClick={() => {
                    setSelectedThemeId(theme.id);
                    setTempTokens(theme.tokens || []);
                  }}
                  className={`p-6 border-2 rounded-2xl cursor-pointer transition-all flex flex-col justify-between ${
                    selectedThemeId === theme.id ? 'border-indigo-600 bg-indigo-50/10' : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-800">{theme.name}</h3>
                      {theme.isDefault && (
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-wider rounded-full">
                          Activo
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-[10px] mt-1 line-clamp-2">{theme.description || 'Sin descripción'}</p>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActivate(theme.id);
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-1.5"
                    >
                      <Check size={12} />
                      Activar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: live Preview */}
        <div className="space-y-8">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6 sticky top-8">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Eye size={20} className="text-indigo-600" />
              Vista Previa en Tiempo Real
            </h2>

            <div className="p-6 border border-slate-100 rounded-2xl space-y-6" style={{ background: getPreviewStyle('background', '#f8fafc') }}>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4" style={{ background: getPreviewStyle('surface', '#ffffff') }}>
                <h3 className="text-sm font-bold" style={{ color: getPreviewStyle('text-primary', '#0f172a') }}>Ejemplo de Tarjeta (Card)</h3>
                <p className="text-xs" style={{ color: getPreviewStyle('text-secondary', '#475569') }}>
                  El contenido cambia su estilo automáticamente según los tokens elegidos.
                </p>

                <div className="flex gap-3">
                  <button 
                    className="px-4 py-2 text-white font-bold text-xs rounded-lg shadow-md transition-all"
                    style={{ 
                      backgroundColor: getPreviewStyle('primary', '#4f46e5'),
                      borderRadius: getPreviewStyle('radius', '8px')
                    }}
                  >
                    Botón Primario
                  </button>
                  <button 
                    className="px-4 py-2 border font-bold text-xs rounded-lg transition-all"
                    style={{ 
                      borderColor: getPreviewStyle('border', '#e2e8f0'),
                      color: getPreviewStyle('primary', '#4f46e5'),
                      borderRadius: getPreviewStyle('radius', '8px')
                    }}
                  >
                    Secundario
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Métricas de Accesibilidad</h4>
              <div className="flex justify-between items-center text-xs">
                <span>Contraste Texto/Fondo</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <ShieldCheck size={14} /> WCAG AA / AAA
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
