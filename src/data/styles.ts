export interface Style {
  name: string;
  notes: Record<string, string>; // Note -> path to audio file
}

export const styles: Style[] = [
  {
    name: 'Atmosphere',
    notes: {
      'C': '/estilos/atmosphere/C.mp3',
      'D': '/estilos/atmosphere/D.mp3',
      // ...
    }
  },
  // ...
];
