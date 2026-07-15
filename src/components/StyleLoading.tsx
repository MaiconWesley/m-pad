import { Music } from 'lucide-react';

export default function StyleLoading({ styleName }: { styleName: string }) {
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
    </div>
  );
}
