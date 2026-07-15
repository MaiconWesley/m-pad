import { Play, Music, Settings } from 'lucide-react';

interface NavbarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export default function Navbar({ activeView, onViewChange }: NavbarProps) {
  const navItems = [
    { id: 'player', icon: Play, label: 'PADS' },
    { id: 'fundos', icon: Music, label: 'FUNDOS' },
    { id: 'settings', icon: Settings, label: 'AJUSTES' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-[#0F1115]/95 border-t border-white/10 p-4 flex justify-center gap-16 sm:gap-24 items-center text-slate-400 backdrop-blur-sm z-20">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          className={`flex flex-col items-center gap-1 transition-colors ${activeView === item.id ? 'text-indigo-400' : 'hover:text-slate-200'}`}
        >
          <item.icon size={20} />
          <span className="text-[10px] uppercase tracking-widest">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
