import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import type { CustomStyle, BackgroundTrack } from '../types';

interface AudioContextType {
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  style: string;
  setStyle: (style: string) => void;
  playNote: (note: string) => void;
  stopNote: () => void;
  currentNote: string | null;
  setCurrentNote: (note: string | null) => void;
  allStyleNames: string[];
  addCustomStyle: (style: CustomStyle) => void;
  removeCustomStyle: (id: string) => void;
  updateCustomStyle: (id: string, style: CustomStyle) => void;
  customStyles: CustomStyle[];
  backgroundTracks: BackgroundTrack[];
  addBackgroundTrack: (track: BackgroundTrack) => void;
  removeBackgroundTrack: (id: string) => void;
  updateBackgroundTrack: (id: string, track: BackgroundTrack) => void;
  playBackgroundTrack: (id: string) => void;
  stopBackgroundTrack: () => void;
  isBgPlaying: boolean;
  currentBgTrackId: string | null;
  padVolume: number;
  setPadVolume: (volume: number) => void;
  bgVolume: number;
  setBgVolume: (volume: number) => void;
  fadeDuration: number;
  setFadeDuration: (duration: number) => void;
  loadingStyleName: string | null;
  loadingProgress: number;
  enabledStyles: string[];
  toggleBuiltInStyle: (name: string) => void;
  downloadStyle: (name: string) => Promise<void>;
}

const AudioContext = createContext<AudioContextType | null>(null);

const M_PAD_STYLE: CustomStyle = {
  id: 'm-pad-builtin',
  name: 'M-PAD',
  notes: {
    'C': '/estilos/M-PAD/C.mp3',
    'C#': '/estilos/M-PAD/Csus.mp3',
    'D': '/estilos/M-PAD/D.mp3',
    'D#': '/estilos/M-PAD/Dsus.mp3',
    'E': '/estilos/M-PAD/E.mp3',
    'F': '/estilos/M-PAD/F.mp3',
    'F#': '/estilos/M-PAD/Fsus.mp3',
    'G': '/estilos/M-PAD/G.mp3',
    'G#': '/estilos/M-PAD/Gsus.mp3',
    'A': '/estilos/M-PAD/A.mp3',
    'A#': '/estilos/M-PAD/Asus.mp3',
    'B': '/estilos/M-PAD/B.mp3',
  }
};

const REVERSE_STYLE: CustomStyle = {
  id: 'reverse-builtin',
  name: 'REVERSE',
  notes: {
    'C': '/estilos/REVERSE/C.opus',
    'C#': '/estilos/REVERSE/CSUS.opus',
    'D': '/estilos/REVERSE/D.opus',
    'D#': '/estilos/REVERSE/DSUS.opus',
    'E': '/estilos/REVERSE/E.opus',
    'F': '/estilos/REVERSE/F.opus',
    'F#': '/estilos/REVERSE/FSUS.opus',
    'G': '/estilos/REVERSE/G.opus',
    'G#': '/estilos/REVERSE/GSUS.opus',
    'A': '/estilos/REVERSE/A.opus',
    'A#': '/estilos/REVERSE/ASUS.opus',
    'B': '/estilos/REVERSE/B.opus',
  }
};

const BUILT_IN_STYLES: CustomStyle[] = [M_PAD_STYLE, REVERSE_STYLE];

function getStyleByName(name: string): CustomStyle | undefined {
  return BUILT_IN_STYLES.find(s => s.name === name);
}

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNote, setCurrentNote] = useState<string | null>(null);
  const [customStyles, setCustomStyles] = useState<CustomStyle[]>(() => {
    try {
      const stored = localStorage.getItem('custom-styles');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [enabledStyles, setEnabledStyles] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('enabled-styles');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return ['M-PAD'];
  });

  const [style, setStyle] = useState(() => {
    try {
      const stored = localStorage.getItem('enabled-styles');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      }
    } catch {}
    return 'M-PAD';
  });
  const [backgroundTracks, setBackgroundTracks] = useState<BackgroundTrack[]>(() => {
    try {
      const stored = localStorage.getItem('background-tracks');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [isBgPlaying, setIsBgPlaying] = useState(false);
  const [currentBgTrackId, setCurrentBgTrackId] = useState<string | null>(null);
  const [padVolume, setPadVolume] = useState(0.2);
  const [bgVolume, setBgVolume] = useState(0.15);
  const [fadeDuration, setFadeDuration] = useState(2);
  const [loadingStyleName, setLoadingStyleName] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const bufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const playVersionRef = useRef(0);
  const bgSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bgGainNodeRef = useRef<GainNode | null>(null);

  const getAudioContext = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  useEffect(() => {
    const cs = customStyles.find((s: CustomStyle) => s.name === style);
    if (!cs) return;

    const ctx = getAudioContext();
    const paths = [...new Set(Object.values(cs.notes).filter(Boolean) as string[])];
    const toLoad = paths.filter(p => !bufferCacheRef.current.has(p));
    if (toLoad.length === 0) return;

    (async () => {
      let allCached = false;
      try {
        if ('caches' in window) {
          const cache = await caches.open('m-pad-v3');
          const results = await Promise.all(toLoad.map((p: string) => cache.match(p)));
          allCached = results.every(r => r !== undefined);
        }
      } catch {}

      if (allCached) {
        await Promise.allSettled(
          toLoad.map(async (path: string) => {
            const resp = await fetch(path);
            const buf = await resp.arrayBuffer();
            const audioBuf = await ctx.decodeAudioData(buf);
            bufferCacheRef.current.set(path, audioBuf);
          })
        );
      } else {
        setLoadingStyleName(style);
        setLoadingProgress(0);
        let loaded = 0;
        const total = toLoad.length;

        await Promise.allSettled(
          toLoad.map(async (path: string) => {
            const resp = await fetch(path);
            const buf = await resp.arrayBuffer();
            const audioBuf = await ctx.decodeAudioData(buf);
            bufferCacheRef.current.set(path, audioBuf);
            loaded++;
            setLoadingProgress(Math.round((loaded / total) * 100));
          })
        );

        setLoadingStyleName(null);
        setLoadingProgress(100);
      }
    })();
  }, [style, customStyles]);

  const toggleBuiltInStyle = (name: string) => {
    setEnabledStyles(prev => {
      const updated = prev.includes(name)
        ? prev.filter(s => s !== name)
        : [...prev, name];
      localStorage.setItem('enabled-styles', JSON.stringify(updated));
      if (!updated.includes(style) && updated.length > 0) {
        setStyle(updated[0]);
      }
      return updated;
    });
  };

  const downloadStyle = async (name: string) => {
    const cs = getStyleByName(name) || customStyles.find(s => s.name === name);
    if (!cs) return;

    const ctx = getAudioContext();
    const paths = [...new Set(Object.values(cs.notes).filter(Boolean) as string[])];
    const toLoad = paths.filter(p => !bufferCacheRef.current.has(p));
    if (toLoad.length === 0) return;

    setLoadingStyleName(name);
    setLoadingProgress(0);
    let loaded = 0;
    const total = toLoad.length;

    await Promise.allSettled(
      toLoad.map(async (path: string) => {
        try {
          const resp = await fetch(path);
          if (!resp.ok) return;
          const buf = await resp.arrayBuffer();
          const audioBuf = await ctx.decodeAudioData(buf);
          bufferCacheRef.current.set(path, audioBuf);
        } catch {}
        loaded++;
        setLoadingProgress(Math.round((loaded / total) * 100));
      })
    );

    setLoadingStyleName(null);
    setLoadingProgress(100);
  };

  useEffect(() => {
    if (gainNodeRef.current) {
      const ctx = audioCtxRef.current;
      if (ctx) {
        gainNodeRef.current.gain.linearRampToValueAtTime(padVolume, ctx.currentTime + 0.1);
      }
    }
  }, [padVolume]);

  useEffect(() => {
    if (bgGainNodeRef.current) {
      const ctx = audioCtxRef.current;
      if (ctx) {
        bgGainNodeRef.current.gain.linearRampToValueAtTime(bgVolume, ctx.currentTime + 0.1);
      }
    }
  }, [bgVolume]);

  const allStyleNames = [
    ...enabledStyles,
    ...customStyles.map(s => s.name).filter(n => n !== 'M-PAD' && n !== 'REVERSE')
  ];

  const addCustomStyle = (newStyle: CustomStyle) => {
    const updated = [...customStyles, newStyle];
    setCustomStyles(updated);
    localStorage.setItem('custom-styles', JSON.stringify(updated));
    if (customStyles.length === 0) setStyle(newStyle.name);
  };

  const removeCustomStyle = (id: string) => {
    const updated = customStyles.filter(s => s.id !== id);
    setCustomStyles(updated);
    localStorage.setItem('custom-styles', JSON.stringify(updated));
    bufferCacheRef.current.clear();
  };

  const updateCustomStyle = (id: string, updatedStyle: CustomStyle) => {
    const updated = customStyles.map(s => s.id === id ? updatedStyle : s);
    setCustomStyles(updated);
    localStorage.setItem('custom-styles', JSON.stringify(updated));
    bufferCacheRef.current.clear();
    if (style === updatedStyle.name) {
      setStyle(updatedStyle.name);
    }
  };

  const stopBackgroundTrack = (fade = false) => {
    const src = bgSourceRef.current;
    bgSourceRef.current = null;

    if (src) {
      if (fade && bgGainNodeRef.current && audioCtxRef.current) {
        const ctx = audioCtxRef.current;
        const stopTime = ctx.currentTime + fadeDuration;
        bgGainNodeRef.current.gain.cancelScheduledValues(ctx.currentTime);
        bgGainNodeRef.current.gain.setValueAtTime(bgGainNodeRef.current.gain.value, ctx.currentTime);
        bgGainNodeRef.current.gain.linearRampToValueAtTime(0, stopTime);
        src.stop(stopTime);
      } else {
        try { src.stop(); } catch {}
      }
    }

    bgGainNodeRef.current = null;
    setIsBgPlaying(false);
    setCurrentBgTrackId(null);
  };

  const playBackgroundTrack = async (id: string) => {
    stopNote();
    stopBackgroundTrack();

    const track = backgroundTracks.find(t => t.id === id);
    if (!track) return;

    const ctx = getAudioContext();
    let audioBuffer = bufferCacheRef.current.get(track.audioPath);

    if (!audioBuffer) {
      const resp = await fetch(track.audioPath);
      if (!resp.ok) return;
      const arrayBuffer = await resp.arrayBuffer();
      audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      bufferCacheRef.current.set(track.audioPath, audioBuffer);
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;
    bgSourceRef.current = source;

    const gainNode = ctx.createGain();
    bgGainNodeRef.current = gainNode;
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(bgVolume, ctx.currentTime + 2);

    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start();

    source.onended = () => {
      if (bgSourceRef.current !== source) return;
      setIsBgPlaying(false);
      setCurrentBgTrackId(null);
      bgSourceRef.current = null;
    };

    setCurrentBgTrackId(id);
    setIsBgPlaying(true);
  };

  const addBackgroundTrack = (track: BackgroundTrack) => {
    const updated = [...backgroundTracks, track];
    setBackgroundTracks(updated);
    localStorage.setItem('background-tracks', JSON.stringify(updated));
  };

  const removeBackgroundTrack = (id: string) => {
    if (currentBgTrackId === id) stopBackgroundTrack();
    const updated = backgroundTracks.filter(t => t.id !== id);
    setBackgroundTracks(updated);
    localStorage.setItem('background-tracks', JSON.stringify(updated));
  };

  const updateBackgroundTrack = (id: string, track: BackgroundTrack) => {
    const updated = backgroundTracks.map(t => t.id === id ? track : t);
    setBackgroundTracks(updated);
    localStorage.setItem('background-tracks', JSON.stringify(updated));
  };

  const playNote = async (note: string) => {
    stopNote();
    stopBackgroundTrack();

    const currentStyle = getStyleByName(style) || customStyles.find(s => s.name === style);
    if (!currentStyle) return;

    const audioPath = currentStyle.notes[note];
    if (!audioPath) return;

    const currentVersion = ++playVersionRef.current;

    const ctx = getAudioContext();
    let audioBuffer = bufferCacheRef.current.get(audioPath);

    if (!audioBuffer) {
      const resp = await fetch(audioPath);
      if (!resp.ok) return;
      const arrayBuffer = await resp.arrayBuffer();
      audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      bufferCacheRef.current.set(audioPath, audioBuffer);
    }

    if (playVersionRef.current !== currentVersion) return;

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;
    sourceRef.current = source;

    const gainNode = ctx.createGain();
    gainNodeRef.current = gainNode;

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(padVolume, ctx.currentTime + 2);

    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start();

    source.onended = () => {
      if (sourceRef.current !== source) return;
      setIsPlaying(false);
      setCurrentNote(null);
      sourceRef.current = null;
    };

    setCurrentNote(note);
    setIsPlaying(true);
  };

  const stopNote = (fade = false) => {
    const src = sourceRef.current;
    sourceRef.current = null;

    if (src) {
      if (fade && gainNodeRef.current && audioCtxRef.current) {
        const ctx = audioCtxRef.current;
        const stopTime = ctx.currentTime + fadeDuration;
        gainNodeRef.current.gain.cancelScheduledValues(ctx.currentTime);
        gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, ctx.currentTime);
        gainNodeRef.current.gain.linearRampToValueAtTime(0, stopTime);
        src.stop(stopTime);
      } else {
        try { src.stop(); } catch {}
      }
    }

    setIsPlaying(false);
    setCurrentNote(null);
  };

  return (
    <AudioContext.Provider value={{
      isPlaying, setIsPlaying, style, setStyle,
      playNote, stopNote, currentNote, setCurrentNote,
      allStyleNames, addCustomStyle, removeCustomStyle, updateCustomStyle, customStyles,
      backgroundTracks, addBackgroundTrack, removeBackgroundTrack, updateBackgroundTrack,
      playBackgroundTrack, stopBackgroundTrack, isBgPlaying, currentBgTrackId,
      padVolume, setPadVolume, bgVolume, setBgVolume,
      fadeDuration, setFadeDuration, loadingStyleName, loadingProgress,
      enabledStyles, toggleBuiltInStyle, downloadStyle,
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => useContext(AudioContext)!;
