import { useState, useRef, type ChangeEvent } from 'react';
import { useAudio } from '../context/AudioContext';
import { Plus, ArrowLeft } from 'lucide-react';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function StyleConfigView() {
  const { customStyles, addCustomStyle, removeCustomStyle, updateCustomStyle } = useAudio();
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [styleName, setStyleName] = useState('');
  const [noteFiles, setNoteFiles] = useState<Record<string, File>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [menuStyleId, setMenuStyleId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTargetRef = useRef<string | null>(null);

  const editingStyle = editingId ? customStyles.find(s => s.id === editingId) ?? null : null;

  const goToCreate = () => {
    setStyleName('');
    setNoteFiles({});
    setEditingId(null);
    setError('');
    setMode('create');
  };

  const goToEdit = (style: { id: string; name: string; notes: Record<string, string> }) => {
    setStyleName(style.name);
    setNoteFiles({});
    setEditingId(style.id);
    setError('');
    setMode('edit');
  };

  const goToList = () => {
    setMode('list');
    setError('');
  };

  const handleNoteClick = (note: string) => {
    setSelectedNote(note);
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedNote) {
      setNoteFiles(prev => ({ ...prev, [selectedNote]: file }));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const noteHasAudio = (note: string) => {
    if (noteFiles[note]) return true;
    if (editingStyle?.notes[note]) return true;
    return false;
  };

  const handleDelete = async (style: { id: string; name: string }) => {
    try {
      await fetch('/api/delete-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styleName: style.name }),
      });
    } catch {}
    removeCustomStyle(style.id);
    setConfirmDeleteId(null);
  };

  const handleSave = async () => {
    if (!styleName.trim()) return;
    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const notes: Record<string, string> = {};

      for (const note of NOTES) {
        const file = noteFiles[note];
        if (file) {
          const base64 = await readFileAsBase64(file);
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              styleName: styleName.trim(),
              note,
              fileName: file.name,
              data: base64,
            }),
          });
          if (!res.ok) throw new Error(`Erro ao enviar áudio da nota ${note}`);
          const json = await res.json();
          notes[note] = json.path;
        } else if (editingStyle?.notes[note]) {
          notes[note] = editingStyle.notes[note];
        }
      }

      if (editingId && editingStyle) {
        updateCustomStyle(editingId, { ...editingStyle, notes });
      } else {
        addCustomStyle({ id: `custom-${Date.now()}`, name: styleName.trim(), notes });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      goToList();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar estilo');
    } finally {
      setSaving(false);
    }
  };

  if (mode === 'list') {
    return (
      <div className="p-responsive p-6 space-y-5 sm:space-y-6 max-w-lg mx-auto w-full">
        {saved && (
          <div className="p-3 bg-green-600/20 border border-green-500/50 rounded-xl text-xs text-green-400 text-center">
            Estilo salvo com sucesso!
          </div>
        )}

        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Meus Estilos
          </h3>
          <button
            onClick={goToCreate}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <Plus size={14} />
            Criar Novo
          </button>
        </div>

        {customStyles.length === 0 ? (
          <div className="text-center py-12 text-slate-600 text-sm">
            Nenhum estilo criado ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {customStyles.map(style => {
              const assignedCount = Object.keys(style.notes).length;
              return (
                <div
                  key={style.id}
                  onPointerDown={() => {
                    holdTargetRef.current = style.id;
                    holdTimerRef.current = setTimeout(() => {
                      setMenuStyleId(style.id);
                      holdTargetRef.current = null;
                    }, 500);
                  }}
                  onPointerUp={() => {
                    if (holdTimerRef.current) {
                      clearTimeout(holdTimerRef.current);
                      holdTimerRef.current = null;
                    }
                    if (holdTargetRef.current) goToEdit(style);
                    holdTargetRef.current = null;
                  }}
                  onPointerLeave={() => {
                    if (holdTimerRef.current) {
                      clearTimeout(holdTimerRef.current);
                      holdTimerRef.current = null;
                    }
                    holdTargetRef.current = null;
                  }}
                  className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.08] transition-colors cursor-pointer select-none"
                >
                  <p className="text-sm font-medium text-slate-200">{style.name}</p>
                  <p className="text-[10px] text-slate-500">{assignedCount} de 12 notas</p>
                </div>
              );
            })}
          </div>
        )}

        {menuStyleId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setMenuStyleId(null)}
          >
            <div
              className="bg-[#1A1D24] border border-white/10 rounded-2xl p-6 w-64 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-medium text-slate-200 text-center mb-4">
                {customStyles.find(s => s.id === menuStyleId)?.name}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    const s = customStyles.find(s => s.id === menuStyleId);
                    if (s) { setMenuStyleId(null); goToEdit(s); }
                  }}
                  className="w-full p-3 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-700 transition-colors"
                >
                  EDITAR
                </button>
                <button
                  onClick={() => { setConfirmDeleteId(menuStyleId); setMenuStyleId(null); }}
                  className="w-full p-3 bg-red-600 rounded-xl font-bold text-white hover:bg-red-700 transition-colors"
                >
                  APAGAR
                </button>
                <button onClick={() => setMenuStyleId(null)} className="w-full p-2 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmDeleteId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setConfirmDeleteId(null)}
          >
            <div
              className="bg-[#1A1D24] border border-white/10 rounded-2xl p-6 w-72 shadow-2xl text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-medium text-slate-200 mb-2">Excluir estilo?</p>
              <p className="text-xs text-slate-500 mb-5">
                "{customStyles.find(s => s.id === confirmDeleteId)?.name}" será excluído permanentemente.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 p-3 border border-white/10 rounded-xl text-sm text-slate-300 hover:bg-white/[0.08] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const s = customStyles.find(s => s.id === confirmDeleteId);
                    if (s) handleDelete(s);
                  }}
                  className="flex-1 p-3 bg-red-600 rounded-xl text-sm font-bold text-white hover:bg-red-700 transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-responsive p-6 space-y-5 sm:space-y-6 max-w-lg mx-auto w-full">
      <div className="flex items-center justify-between">
        <button onClick={goToList} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft size={14} />
          Voltar
        </button>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          {mode === 'edit' ? 'Editar Estilo' : 'Novo Estilo'}
        </h3>
        <div className="w-14" />
      </div>

      <div className="bg-black/20 border border-white/10 rounded-xl p-3 sm:p-4">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
          Nome do Estilo
        </label>
        <input
          type="text"
          value={styleName}
          onChange={(e) => setStyleName(e.target.value)}
          placeholder="Ex: Meu Piano Suave"
          className="bg-[#0F1115] text-indigo-400 p-3 rounded-lg border border-white/10 w-full focus:border-indigo-500/50 outline-none placeholder:text-slate-600 text-sm"
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
          Atribuir Áudios às Notas
        </label>
        <p className="text-[10px] text-slate-600 mb-3">
          Clique em cada nota para selecionar o arquivo de áudio
        </p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {NOTES.map(note => {
            const hasAudio = noteHasAudio(note);
            const fileName = noteFiles[note]?.name
              ? (noteFiles[note].name.length > 12 ? noteFiles[note].name.slice(0, 10) + '…' : noteFiles[note].name)
              : (editingStyle?.notes[note] ? '✓ audio' : '');
            return (
              <button
                key={note}
                onClick={() => handleNoteClick(note)}
                className={`pad-btn p-3 sm:p-4 border rounded-xl sm:rounded-2xl text-base sm:text-lg font-bold transition-all ${
                  hasAudio
                    ? 'bg-green-600/20 border-green-500/50 text-green-400'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/[0.08] hover:border-indigo-500/50'
                }`}
              >
                {note}
                {hasAudio && (
                  <span className="block text-[8px] mt-1 font-normal opacity-70 leading-tight">
                    {fileName}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-600/20 border border-red-500/50 rounded-xl text-xs text-red-400">
          {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!styleName.trim() || saving}
        className="w-full p-4 bg-indigo-600 rounded-2xl font-bold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {saving ? 'Salvando...' : mode === 'edit' ? 'Atualizar Estilo' : 'Criar Estilo'}
      </button>
    </div>
  );
}
