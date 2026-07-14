export interface Pad {
  id: string;
  name: string;
}

export interface Set {
  id: string;
  name: string;
  pads: Pad[];
}

export interface CustomStyle {
  id: string;
  name: string;
  notes: Record<string, string>;
}

export interface BackgroundTrack {
  id: string;
  name: string;
  description: string;
  audioPath: string;
}
