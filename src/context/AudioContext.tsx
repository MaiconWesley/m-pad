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

const BUILT_IN_STYLES: CustomStyle[] = [M_PAD_STYLE];

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
  const [style, setStyle] = useState('M-PAD');
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
    const cs = getStyleByName(style) || customStyles.find((s: CustomStyle) => s.name === style);
    if (!cs) return;

    const ctx = getAudioContext();
    const paths: string[] = [];
    const values: string[] = Object.values(cs.notes);
    for (const p of values) {
      if (p && !paths.includes(p)) paths.push(p);
    }

    for (const path of paths) {
      if (bufferCacheRef.current.has(path)) continue;
      fetch(path)
        .then(r => r.arrayBuffer())
        .then(buf => ctx.decodeAudioData(buf))
        .then(audioBuf => bufferCacheRef.current.set(path, audioBuf))
        .catch(() => {});
    }
  }, [style, customStyles]);

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

  const allStyleNames = ['M-PAD', ...customStyles.map(s => s.name).filter(n => n !== 'M-PAD')];

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

  const stopBackgroundTrack = () => {
    if (bgSourceRef.current) {
      try { bgSourceRef.current.stop(); } catch {}
      bgSourceRef.current = null;
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

  const stopNote = () => {
    const src = sourceRef.current;
    sourceRef.current = null;
    if (src) {
      try { src.stop(); } catch {}
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
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => useContext(AudioContext)!;
