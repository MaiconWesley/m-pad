import { Music } from 'lucide-react';

export default function StyleLoading({ styleName, progress }: { styleName: string; progress: number }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#0F1115]/90">
      <div className="flex gap-3 mb-6">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center animate-bounce"
            style={{ animationDelay: `${i * 0.2}s`, animationDuration: '1s' }}
          >
            <Music size={22} className="text-indigo-400" />
          </div>
        ))}
      </div>
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
        BAIXANDO PACK
      </p>
      <p className="text-lg font-bold text-indigo-400 mt-1">
        {styleName}
      </p>
      <div className="w-48 sm:w-64 mt-5 bg-white/10 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-2">{progress}%</p>
    </div>
  );
}
