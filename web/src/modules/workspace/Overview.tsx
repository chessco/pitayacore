import React from 'react';
import { FileText, Files, Lightbulb, Plus, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { useWorkspaceNotes } from './hooks/useWorkspaceNotes';
import { useWorkspaceDocuments } from './hooks/useWorkspaceDocuments';
import { useWorkspaceIdeas } from './hooks/useWorkspaceIdeas';

interface OverviewProps {
  setActiveSubTab: (tab: string) => void;
}

export function Overview({ setActiveSubTab }: OverviewProps) {
  const { notes, isLoading: loadingNotes } = useWorkspaceNotes();
  const { documents, isLoading: loadingDocs } = useWorkspaceDocuments();
  const { ideas, isLoading: loadingIdeas } = useWorkspaceIdeas();

  // Get top 3 items sorted by updatedAt
  const recentNotes = notes
    ? [...notes]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 3)
    : [];

  const recentDocs = documents
    ? [...documents]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 3)
    : [];

  const recentIdeas = ideas
    ? [...ideas]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 3)
    : [];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'IN_REVIEW':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'IMPLEMENTED':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'ARCHIVED':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-purple-50 text-purple-700 border-purple-100'; // DRAFT or other
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-brand-blue to-blue-700 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <h1 className="text-3xl font-black mb-2 tracking-tight">Bienvenido a tu Workspace</h1>
          <p className="opacity-90 leading-relaxed text-sm md:text-base">
            Tu centro de conocimiento inteligente. Todo lo que registres, cargues y estructures en tu espacio de trabajo es procesado por la IA de PitayaCore para brindarte análisis profundos y respuestas contextualizadas.
          </p>
        </div>
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <svg width="300" height="300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
        </div>
      </div>

      {/* Main Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Notes */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-100 flex flex-col h-[420px] transition-all hover:shadow-lg">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                <FileText size={20} />
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg">Notas Recientes</h3>
            </div>
            <button
              onClick={() => setActiveSubTab('notes')}
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-500 text-slate-500 flex items-center justify-center transition-colors shadow-sm"
              title="Añadir Nota"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar space-y-3">
            {loadingNotes ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="animate-spin text-blue-500" size={24} />
                <span className="text-xs font-semibold">Cargando notas...</span>
              </div>
            ) : recentNotes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <FileText size={40} className="text-slate-200 mb-2" />
                <p className="text-slate-400 text-sm font-semibold mb-3">No tienes notas creadas</p>
                <button
                  onClick={() => setActiveSubTab('notes')}
                  className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-bold flex items-center gap-1.5"
                >
                  Crear primera nota <ArrowRight size={12} />
                </button>
              </div>
            ) : (
              recentNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setActiveSubTab('notes')}
                  className="p-4 rounded-2xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/20 transition-all cursor-pointer group flex flex-col"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors text-sm line-clamp-1">
                      {note.title || 'Nota sin título'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 shrink-0 ml-2">
                      <Calendar size={10} />
                      {formatDate(note.updatedAt)}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                    {note.content || 'Sin contenido adicional...'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Documents */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-100 flex flex-col h-[420px] transition-all hover:shadow-lg">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <Files size={20} />
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg">Últimos Documentos</h3>
            </div>
            <button
              onClick={() => setActiveSubTab('documents')}
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-500 text-slate-500 flex items-center justify-center transition-colors shadow-sm"
              title="Cargar Documento"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar space-y-3">
            {loadingDocs ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="animate-spin text-emerald-500" size={24} />
                <span className="text-xs font-semibold">Cargando documentos...</span>
              </div>
            ) : recentDocs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <Files size={40} className="text-slate-200 mb-2" />
                <p className="text-slate-400 text-sm font-semibold mb-3">No hay documentos guardados</p>
                <button
                  onClick={() => setActiveSubTab('documents')}
                  className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors font-bold flex items-center gap-1.5"
                >
                  Subir documento <ArrowRight size={12} />
                </button>
              </div>
            ) : (
              recentDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setActiveSubTab('documents')}
                  className="p-4 rounded-2xl border border-slate-100 hover:border-emerald-100 hover:bg-emerald-50/20 transition-all cursor-pointer group flex flex-col"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-700 group-hover:text-emerald-600 transition-colors text-sm line-clamp-1">
                      {doc.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 shrink-0 ml-2">
                      <Calendar size={10} />
                      {formatDate(doc.updatedAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold uppercase">
                      {doc.fileType.split('/')[1] || doc.fileType}
                    </span>
                    <span className="text-slate-500 text-xs line-clamp-1">
                      {doc.description || 'Sin descripción...'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Ideas */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-100 flex flex-col h-[420px] transition-all hover:shadow-lg">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
                <Lightbulb size={20} />
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg">Ideas Activas</h3>
            </div>
            <button
              onClick={() => setActiveSubTab('ideas')}
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 hover:text-amber-500 text-slate-500 flex items-center justify-center transition-colors shadow-sm"
              title="Nueva Idea"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar space-y-3">
            {loadingIdeas ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="animate-spin text-amber-500" size={24} />
                <span className="text-xs font-semibold">Cargando ideas...</span>
              </div>
            ) : recentIdeas.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <Lightbulb size={40} className="text-slate-200 mb-2" />
                <p className="text-slate-400 text-sm font-semibold mb-3">No tienes ideas creadas</p>
                <button
                  onClick={() => setActiveSubTab('ideas')}
                  className="text-xs px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors font-bold flex items-center gap-1.5"
                >
                  Registrar una idea <ArrowRight size={12} />
                </button>
              </div>
            ) : (
              recentIdeas.map((idea) => (
                <div
                  key={idea.id}
                  onClick={() => setActiveSubTab('ideas')}
                  className="p-4 rounded-2xl border border-slate-100 hover:border-amber-100 hover:bg-amber-50/20 transition-all cursor-pointer group flex flex-col"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-700 group-hover:text-amber-600 transition-colors text-sm line-clamp-1">
                      {idea.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 shrink-0 ml-2">
                      <Calendar size={10} />
                      {formatDate(idea.updatedAt)}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed mb-2">
                    {idea.description || 'Sin descripción...'}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-2 py-0.5 border rounded-full font-bold uppercase tracking-wider ${getStatusColor(idea.status)}`}>
                      {idea.status}
                    </span>
                    {idea.category && (
                      <span className="text-[9px] text-slate-400 font-semibold bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                        {idea.category}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
