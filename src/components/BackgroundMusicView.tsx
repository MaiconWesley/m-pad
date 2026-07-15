import { useState, useRef, type ChangeEvent } from 'react';
import { useAudio } from '../context/AudioContext';
import { ArrowLeft, Volume2 } from 'lucide-react';

interface BackgroundMusicViewProps {
  mode: 'list' | 'create';
  onModeChange: (mode: 'list' | 'create') => void;
}

export default function BackgroundMusicView({ mode, onModeChange }: BackgroundMusicViewProps) {
  const {
    backgroundTracks, addBackgroundTrack, updateBackgroundTrack, removeBackgroundTrack,
    playBackgroundTrack, stopBackgroundTrack, isBgPlaying, currentBgTrackId,
    bgVolume, setBgVolume,
  } = useAudio();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [menuTrackId, setMenuTrackId] = useState<string | null>(null);
  const [editTrackId, setEditTrackId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTargetRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePlayPause = (id: string) => {
    if (isBgPlaying && currentBgTrackId === id) {
      stopBackgroundTrack();
    } else {
      playBackgroundTrack(id);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAudioFile(file);
  };

  const handleSave = async () => {
    if (!name.trim() || !audioFile) return;
    setSaving(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('audio', audioFile);

      const res = await fetch('/api/upload-background', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Erro ao enviar áudio');
      const json = await res.json();

      if (editTrackId) {
        updateBackgroundTrack(editTrackId, {
          id: editTrackId,
          name: json.name || name.trim(),
          description: json.description || description.trim(),
          audioPath: json.path,
        });
      } else {
        addBackgroundTrack({
          id: `bg-${Date.now()}`,
          name: json.name || name.trim(),
          description: json.description || description.trim(),
          audioPath: json.path,
        });
      }

      setName('');
      setDescription('');
      setAudioFile(null);
      setEditTrackId(null);
      onModeChange('list');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleCardPointerDown = (_id: string) => {
    holdTargetRef.current = _id;
    holdTimerRef.current = setTimeout(() => {
      setMenuTrackId(_id);
      holdTargetRef.current = null;
    }, 500);
  };

  const handleCardPointerUp = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdTargetRef.current) {
      handlePlayPause(holdTargetRef.current);
      holdTargetRef.current = null;
    }
  };

  const handleCardPointerLeave = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdTargetRef.current = null;
  };

  const openEdit = () => {
    if (!menuTrackId) return;
    const track = backgroundTracks.find(t => t.id === menuTrackId);
    if (!track) return;
    setEditTrackId(track.id);
    setName(track.name);
    setDescription(track.description);
    setAudioFile(null);
    setMenuTrackId(null);
    onModeChange('create');
  };

  const handleDelete = (id: string) => {
    removeBackgroundTrack(id);
    setConfirmDeleteId(null);
  };

  if (mode === 'create') {
    return (
      <div className="p-responsive p-6 space-y-5 sm:space-y-6 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setEditTrackId(null); setName(''); setDescription(''); setAudioFile(null); onModeChange('list'); }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={14} />
            Voltar
          </button>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            {editTrackId ? 'Editar Fundo Musical' : 'Novo Fundo Musical'}
          </h3>
          <div className="w-14" />
        </div>

        <div className="bg-black/20 border border-white/10 rounded-xl p-3 sm:p-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Piano Suave"
            className="bg-[#0F1115] text-indigo-400 p-3 rounded-lg border border-white/10 w-full focus:border-indigo-500/50 outline-none placeholder:text-slate-600 text-sm"
          />
        </div>

        <div className="bg-black/20 border border-white/10 rounded-xl p-3 sm:p-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Descrição</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Breve descrição do fundo musical"
            className="bg-[#0F1115] text-indigo-400 p-3 rounded-lg border border-white/10 w-full focus:border-indigo-500/50 outline-none placeholder:text-slate-600 text-sm"
          />
        </div>

        <div className="bg-black/20 border border-white/10 rounded-xl p-3 sm:p-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Áudio</label>
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`w-full p-3 rounded-lg border text-sm transition-all ${
              audioFile
                ? 'bg-green-600/20 border-green-500/50 text-green-400'
                : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/[0.08] hover:border-indigo-500/50'
            }`}
          >
            {audioFile ? audioFile.name : 'Selecionar arquivo de áudio'}
          </button>
          <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileSelect} />
        </div>

        {error && (
          <div className="p-3 bg-red-600/20 border border-red-500/50 rounded-xl text-xs text-red-400">{error}</div>
        )}

        <button
          onClick={handleSave}
          disabled={!name.trim() || !audioFile || saving}
          className="w-full p-4 bg-indigo-600 rounded-2xl font-bold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {saving ? 'Salvando...' : editTrackId ? 'Atualizar Fundo Musical' : 'Salvar Fundo Musical'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-responsive p-6 space-y-5 sm:space-y-6 max-w-lg mx-auto w-full">
      {backgroundTracks.length === 0 ? (
        <div className="text-center py-12 text-slate-600 text-sm">Nenhum fundo musical cadastrado.</div>
      ) : (
        <div className="space-y-2">
          {backgroundTracks.map(track => (
            <div
              key={track.id}
              onPointerDown={() => handleCardPointerDown(track.id)}
              onPointerUp={handleCardPointerUp}
              onPointerLeave={handleCardPointerLeave}
              className={`p-3 rounded-xl border transition-colors cursor-pointer select-none ${
                isBgPlaying && currentBgTrackId === track.id
                  ? 'bg-indigo-600/20 animate-[borderPulse_2s_ease-in-out_infinite]'
                  : 'border-white/10 bg-white/5 hover:bg-white/[0.08]'
              }`}
            >
              <p className="text-sm font-medium text-slate-200 truncate">{track.name}</p>
              {track.description && (
                <p className="text-[10px] text-slate-500 truncate">{track.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {isBgPlaying && (
        <div className="bg-black/20 border border-white/10 rounded-xl px-3 py-3 sm:px-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Volume2 size={14} /> VOLUME
          </label>
          <div className="flex items-center gap-2 sm:gap-3">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={bgVolume}
              onChange={(e) => setBgVolume(parseFloat(e.target.value))}
              className="flex-1 accent-indigo-500 h-6"
            />
            <button onClick={() => stopBackgroundTrack(true)} className="shrink-0 px-4 py-2.5 sm:px-5 sm:py-3 bg-red-600 rounded-xl font-bold text-white hover:bg-red-700 transition-colors text-xs sm:text-sm">PARAR</button>
          </div>
        </div>
      )}

      {menuTrackId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setMenuTrackId(null)}
        >
          <div
            className="bg-[#1A1D24] border border-white/10 rounded-2xl p-6 w-64 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-slate-200 text-center mb-4">
              {backgroundTracks.find(t => t.id === menuTrackId)?.name}
            </p>
            <div className="space-y-3">
              <button onClick={openEdit} className="w-full p-3 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-700 transition-colors">
                EDITAR
              </button>
              <button onClick={() => { setConfirmDeleteId(menuTrackId); setMenuTrackId(null); }} className="w-full p-3 bg-red-600 rounded-xl font-bold text-white hover:bg-red-700 transition-colors">
                APAGAR
              </button>
              <button onClick={() => setMenuTrackId(null)} className="w-full p-2 text-xs text-slate-500 hover:text-slate-300 transition-colors">
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
            <p className="text-sm font-medium text-slate-200 mb-2">Excluir fundo musical?</p>
            <p className="text-xs text-slate-500 mb-5">
              "{backgroundTracks.find(t => t.id === confirmDeleteId)?.name}" será excluído permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 p-3 border border-white/10 rounded-xl text-sm text-slate-300 hover:bg-white/[0.08] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
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
