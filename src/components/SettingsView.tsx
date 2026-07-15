import { useAudio } from '../context/AudioContext';
import { Clock } from 'lucide-react';

export default function SettingsView() {
  const { fadeDuration, setFadeDuration } = useAudio();

  return (
    <div className="flex flex-col gap-6 p-responsive p-4 max-w-lg mx-auto w-full">
      <div className="bg-black/20 border border-white/10 rounded-xl p-3 sm:p-4">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
          <Clock size={14} /> TEMPO DE FINALIZAÇÃO (FADE)
        </label>
        <p className="text-[10px] text-slate-600 mb-3">
          Duração do fade ao parar um áudio nos pads e fundos
        </p>
        <input
          type="range"
          min="0"
          max="5"
          step="0.5"
          value={fadeDuration}
          onChange={(e) => setFadeDuration(parseFloat(e.target.value))}
          className="w-full accent-indigo-500"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>0s</span>
          <span className="text-indigo-400 font-bold">{fadeDuration.toFixed(1)}s</span>
          <span>5s</span>
        </div>
      </div>
    </div>
  );
}
