import React, { useState, useEffect, useRef } from 'react';
import { Save, Loader2, Check, Plus, Trash2, FileText, Calendar, Bold, Image as ImageIcon, Columns, Eye, Edit3, ChevronUp, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useWorkspaceNotes } from './hooks/useWorkspaceNotes';

interface Note {
  id: string;
  title: string;
  content: string;
  votes?: number;
  userVote?: number;
}

export function NotesView() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { notes, createNote, updateNote, deleteNote, voteNote } = useWorkspaceNotes();

  // Load the first note by default if no note is selected
  useEffect(() => {
    if (notes && notes.length > 0 && !currentNoteId && !isCreatingNew) {
      const latestNote = notes[0];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentNoteId(latestNote.id);
      setTitle(latestNote.title || '');
      setContent(latestNote.content || '');
    }
  }, [notes, currentNoteId, isCreatingNew]);

  const handleNewNote = () => {
    setCurrentNoteId(null);
    setTitle('');
    setContent('');
    setIsCreatingNew(true);
  };

  const handleSelectNote = (note: Note) => {
    setCurrentNoteId(note.id);
    setTitle(note.title || '');
    setContent(note.content || '');
    setIsCreatingNew(false);
    setMode('preview'); // Open in preview mode by default
  };

  const insertText = (before: string, after: string = '') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    setContent(newText);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const handleSave = async () => {
    const finalTitle = title.trim() || `Nota - ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
    
    try {
      if (currentNoteId) {
        await updateNote.mutateAsync({
          id: currentNoteId,
          title: finalTitle,
          content,
        });
      } else {
        const newNote = await createNote.mutateAsync({
          title: finalTitle,
          content,
        });
        setCurrentNoteId(newNote?.id);
        setTitle(newNote?.title || finalTitle);
        setIsCreatingNew(false);
      }
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selection
    if (confirm('¿Estás seguro de que deseas eliminar esta nota?')) {
      try {
        await deleteNote.mutateAsync(id);
        if (currentNoteId === id) {
          handleNewNote();
        }
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  };

  const isSaving = createNote.isPending || updateNote.isPending;
  const sortedNotesList = notes || [];

  return (
    <div className="bg-white rounded-3xl shadow-xl h-full flex overflow-hidden border border-slate-100 min-h-[500px]">
      {/* Sidebar - Notes List */}
      <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/50 shrink-0">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
            <FileText size={18} className="text-brand-blue" />
            Mis Notas
          </h3>
          <button
            onClick={handleNewNote}
            className="flex items-center gap-1 px-3 py-1.5 bg-brand-blue text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-sm"
          >
            <Plus size={14} />
            Nueva
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {sortedNotesList.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <FileText size={36} className="text-slate-200 mb-2" />
              <p className="text-xs font-semibold">No hay notas creadas aún.</p>
            </div>
          ) : (
            (sortedNotesList as Note[]).map((note) => {
              const isSelected = currentNoteId === note.id;
              return (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer relative group flex gap-3 ${
                    isSelected
                      ? 'bg-white border-brand-blue/30 shadow-md ring-1 ring-brand-blue/5'
                      : 'border-transparent hover:border-slate-200 hover:bg-slate-100/50 bg-white/60'
                  }`}
                >
                  {/* Reddit Vote Widget */}
                  <div className="flex flex-col items-center justify-start py-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => voteNote.mutate({ id: note.id, value: 1 })}
                      className={`p-1 rounded transition-colors ${
                        note.userVote === 1
                          ? 'text-orange-500 hover:bg-orange-50'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Votar a favor"
                    >
                      <ChevronUp size={18} className={note.userVote === 1 ? 'fill-orange-500/20' : ''} />
                    </button>
                    <span className={`text-xs font-black my-0.5 min-w-[20px] text-center ${
                      note.userVote === 1 ? 'text-orange-500' : note.userVote === -1 ? 'text-blue-500' : 'text-slate-600'
                    }`}>
                      {note.score ?? 0}
                    </span>
                    <button
                      onClick={() => voteNote.mutate({ id: note.id, value: -1 })}
                      className={`p-1 rounded transition-colors ${
                        note.userVote === -1
                          ? 'text-blue-500 hover:bg-blue-50'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Votar en contra"
                    >
                      <ChevronDown size={18} className={note.userVote === -1 ? 'fill-blue-500/20' : ''} />
                    </button>
                  </div>

                  {/* Note Details */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex justify-between items-start mb-1 pr-6">
                      <span className={`font-bold text-sm line-clamp-1 ${isSelected ? 'text-brand-blue' : 'text-slate-700'}`}>
                        {note.title || 'Nota sin título'}
                      </span>
                      <button
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1 rounded-lg hover:bg-red-50"
                        title="Eliminar nota"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed mb-2">
                      {note.content || 'Sin contenido...'}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                      <Calendar size={10} />
                      {new Date(note.updatedAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-10 shrink-0">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {currentNoteId ? 'Editando Nota' : 'Creando Nueva Nota'}
          </span>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-brand-blue text-white font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-70"
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : showSuccess ? (
              <Check size={16} />
            ) : (
              <Save size={16} />
            )}
            <span>{isSaving ? 'Guardando...' : showSuccess ? 'Guardado' : 'Guardar'}</span>
          </button>
        </div>

        <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">
          <input
            type="text"
            className="w-full text-2xl font-black text-slate-800 border-b border-transparent focus:border-slate-200 outline-none pb-2 transition-all"
            placeholder="Título de la nota..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Markdown Toolbar */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setMode('edit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${mode === 'edit' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <Edit3 size={14} /> Editar
              </button>
              <button 
                onClick={() => setMode('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${mode === 'preview' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <Eye size={14} /> Vista Previa
              </button>
            </div>
            
            {mode === 'edit' && (
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
                <button onClick={() => insertText('**', '**')} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded shadow-sm transition-all" title="Negrita">
                  <Bold size={16} />
                </button>
                <button onClick={() => insertText('![Descripción de la imagen](', ')')} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded shadow-sm transition-all" title="Insertar Imagen">
                  <ImageIcon size={16} />
                </button>
                <button onClick={() => insertText('\n| Columna 1 | Columna 2 |\n| --------- | --------- |\n| Texto     | Texto     |\n')} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded shadow-sm transition-all" title="Insertar Columnas (Tabla)">
                  <Columns size={16} />
                </button>
              </div>
            )}
          </div>

          {mode === 'edit' ? (
            <textarea
              ref={textareaRef}
              className="flex-1 w-full p-4 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue outline-none resize-none custom-scrollbar text-slate-700 leading-relaxed text-sm bg-slate-50/30 font-mono"
              placeholder="Escribe tus notas aquí usando Markdown...&#10;Ejemplo:&#10;**Texto en negrita**&#10;![Imagen](https://link.com/foto.jpg)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          ) : (
            <div className="flex-1 w-full p-6 border border-slate-100 rounded-2xl bg-white overflow-y-auto custom-scrollbar prose prose-slate max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  img: ({ node, ...props }) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const _unused = node;
                    return (
                      <img {...props} referrerPolicy="no-referrer" className="rounded-xl shadow-sm border border-slate-100 max-w-full h-auto" />
                    );
                  }
                }}
              >
                {content || '*No hay contenido todavía...*'}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
