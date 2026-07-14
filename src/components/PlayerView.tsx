import { useAudio } from '../context/AudioContext';
import { Volume2 } from 'lucide-react';

export default function PlayerView() {
  const { style, setStyle, playNote, stopNote, isPlaying, currentNote, allStyleNames, padVolume, setPadVolume } = useAudio();
  
  const handleNoteClick = (note: string) => {
    playNote(note);
  };

  const handleStop = () => {
    stopNote();
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-responsive p-4 max-w-lg mx-auto w-full">
      <div className="bg-black/20 border border-white/10 rounded-xl p-3 sm:p-4">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">ESTILOS DE PADS</label>
        <select 
          value={style} 
          onChange={(e) => setStyle(e.target.value)}
          className="bg-[#0F1115] text-indigo-400 p-3 rounded-lg border border-white/10 w-full focus:border-indigo-500/50 outline-none text-sm"
        >
          {allStyleNames.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>

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
            value={padVolume}
            onChange={(e) => setPadVolume(parseFloat(e.target.value))}
            className="flex-1 accent-indigo-500 h-6"
          />
          <button onClick={handleStop} className="shrink-0 px-4 py-2.5 sm:px-5 sm:py-3 bg-red-600 rounded-xl font-bold text-white hover:bg-red-700 transition-colors text-xs sm:text-sm">PARAR</button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(note => (
          <button 
            key={note}
            onClick={() => handleNoteClick(note)}
            className={`pad-btn p-3 sm:p-4 border rounded-xl sm:rounded-2xl text-base sm:text-lg font-bold transition-all ${
              currentNote === note 
                ? 'bg-indigo-600 text-white animate-[borderPulse_2s_ease-in-out_infinite]' 
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/[0.08] hover:border-indigo-500/50'
            }`}
          >
            {note}
          </button>
        ))}
      </div>

    </div>
  );
}
