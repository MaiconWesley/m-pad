import { useState, useEffect, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Download } from 'lucide-react';
import Navbar from './components/Navbar';
import PlayerView from './components/PlayerView';
import StyleConfigView from './components/StyleConfigView';
import BackgroundMusicView from './components/BackgroundMusicView';
import SettingsView from './components/SettingsView';
import StyleLoading from './components/StyleLoading';
import { AudioProvider, useAudio } from './context/AudioContext';

function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1115]">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <img src="/logo.png" alt="M-PAD" className="w-32 h-32 object-contain" />
      </motion.div>
    </div>
  );
}

function AppContent() {
  const { loadingStyleName } = useAudio();
  return loadingStyleName ? <StyleLoading styleName={loadingStyleName} /> : null;
}

export default function App() {
  const [activeView, setActiveView] = useState('player');
  const [fundosMode, setFundosMode] = useState<'list' | 'create'>('list');
  const [ready, setReady] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [appInstalled, setAppInstalled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setAppInstalled(true);
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const handler = () => setAppInstalled(true);
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  const handleInstall = useCallback(() => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      setDeferredPrompt(null);
    });
  }, [deferredPrompt]);

  const views: Record<string, ReactNode> = {
    player: <PlayerView />,
    config: <StyleConfigView />,
    fundos: <BackgroundMusicView mode={fundosMode} onModeChange={setFundosMode} />,
    settings: <SettingsView />,
  };

  return (
    <AudioProvider>
      {!ready && <SplashScreen />}

      <AppContent />
      <div className="min-h-screen bg-[#0F1115] text-slate-100 font-sans relative">
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center opacity-[0.04]">
          <img src="/logo.png" alt="" className="w-96 h-96 object-contain" />
        </div>

        <header className="fixed top-0 left-0 w-full bg-[#0F1115]/95 border-b border-white/10 p-4 flex items-center justify-between z-30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="M-PAD" className="h-8 w-8 object-contain" />
            {activeView === 'fundos' && (
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Fundos Musicais</span>
            )}
            {activeView === 'settings' && (
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Configurações</span>
            )}
          </div>
          {activeView === 'player' && (
            <button
              onClick={() => setActiveView('config')}
              className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus size={22} />
            </button>
          )}
          {activeView === 'fundos' && fundosMode === 'list' && (
            <button
              onClick={() => setFundosMode('create')}
              className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus size={22} />
            </button>
          )}
          {activeView === 'settings' && (
            <button
              onClick={() => setActiveView('player')}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Voltar
            </button>
          )}
          {deferredPrompt && !appInstalled && activeView !== 'settings' && (
            <button
              onClick={handleInstall}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 rounded-lg text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
            >
              <Download size={14} />
              INSTALAR
            </button>
          )}
        </header>

        <main className="pt-20 pb-24 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {views[activeView]}
            </motion.div>
          </AnimatePresence>
        </main>
        <Navbar activeView={activeView} onViewChange={setActiveView} />
      </div>
    </AudioProvider>
  );
}
