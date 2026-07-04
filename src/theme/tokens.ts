// Design-Tokens der 6 Themes — 1:1 Port aus der iOS-App
// (ios/Sources/Util/AppTheme.swift), damit Web und App gleich aussehen.
export type FontDesign = 'rounded' | 'default';
export type ShadowStyle = 'hard' | 'glow' | 'none';
export type Decoration = 'ripples' | 'splatter' | 'comicNotes';
export type VinylStyle = 'classic' | 'whiteLabel' | 'comic';

export type AppTheme = {
  id: string;
  name: string;
  colorScheme: 'light' | 'dark';
  background: string;
  decoration: Decoration;
  decorationColor: string;
  surface: string;
  surfaceStroke: string;
  strokeWidth: number;
  text: string;
  textMuted: string;
  accent: string;
  onAccent: string;
  highlight: string;
  good: string;
  bad: string;
  shadow: ShadowStyle;
  fontDesign: FontDesign;
  titleWeight: number; // CSS font-weight
  uppercaseTitles: boolean;
  vinylStyle: VinylStyle;
  playerColors: string[];
};

export const THEMES: AppTheme[] = [
  {
    id: 'ink',
    name: 'Tinte & Papier',
    colorScheme: 'light',
    background: '#F3ECDC',
    decoration: 'ripples',
    decorationColor: '#1A1820',
    surface: '#F3ECDC',
    surfaceStroke: '#1A1820',
    strokeWidth: 2.5,
    text: '#1A1820',
    textMuted: '#1A182080',
    accent: '#1A1820',
    onAccent: '#F3ECDC',
    highlight: '#C9912C',
    good: '#4C7A4C',
    bad: '#B23A33',
    shadow: 'hard',
    fontDesign: 'rounded',
    titleWeight: 900,
    uppercaseTitles: false,
    vinylStyle: 'classic',
    playerColors: ['#B23A33', '#2F5D8A', '#4C7A4C', '#C9912C', '#7A4C7A', '#C26B3F', '#A8455E', '#3E7C7B'],
  },
  {
    id: 'retro',
    name: 'Retro Funk',
    colorScheme: 'light',
    background: '#F4E3C1',
    decoration: 'ripples',
    decorationColor: '#4A2C1A',
    surface: '#FBF2DE',
    surfaceStroke: '#4A2C1A',
    strokeWidth: 2,
    text: '#4A2C1A',
    textMuted: '#4A2C1A8C',
    accent: '#D96E30',
    onAccent: '#FBF2DE',
    highlight: '#C9912C',
    good: '#6B7F3A',
    bad: '#B23A33',
    shadow: 'hard',
    fontDesign: 'rounded',
    titleWeight: 900,
    uppercaseTitles: false,
    vinylStyle: 'classic',
    playerColors: ['#D96E30', '#6B7F3A', '#B23A33', '#C9912C', '#5E4B8B', '#3E7C7B', '#A8455E', '#8A6642'],
  },
  {
    id: 'vinyl1979',
    name: 'Vinyl 1979',
    colorScheme: 'light',
    background: '#EDE6D6',
    decoration: 'splatter',
    decorationColor: '#0D0C0A',
    surface: '#EDE6D6',
    surfaceStroke: '#0D0C0A',
    strokeWidth: 1.5,
    text: '#0D0C0A',
    textMuted: '#0D0C0A8C',
    accent: '#0D0C0A',
    onAccent: '#EDE6D6',
    highlight: '#8B2F25',
    good: '#5B6B4A',
    bad: '#8B2F25',
    shadow: 'hard',
    fontDesign: 'default',
    titleWeight: 900,
    uppercaseTitles: true,
    vinylStyle: 'whiteLabel',
    playerColors: ['#8B2F25', '#2E4057', '#5B6B4A', '#8A6D3B', '#55485E', '#73524C', '#3E5C5A', '#6E6A45'],
  },
  {
    id: 'vinylNight',
    name: 'Vinyl Nacht',
    colorScheme: 'dark',
    background: '#0D0C0A',
    decoration: 'splatter',
    decorationColor: '#EDE6D6',
    surface: '#14120F',
    surfaceStroke: '#EDE6D6',
    strokeWidth: 1.5,
    text: '#EDE6D6',
    textMuted: '#EDE6D699',
    accent: '#EDE6D6',
    onAccent: '#0D0C0A',
    highlight: '#C2604F',
    good: '#9FB57A',
    bad: '#C2604F',
    shadow: 'hard',
    fontDesign: 'default',
    titleWeight: 900,
    uppercaseTitles: true,
    vinylStyle: 'whiteLabel',
    playerColors: ['#C2604F', '#7FA0BF', '#9FB57A', '#C9A86A', '#A491C9', '#C98FA6', '#7FBFB4', '#B5B083'],
  },
  {
    id: 'comic',
    name: 'Comic',
    colorScheme: 'light',
    background: '#FFFFFF',
    decoration: 'comicNotes',
    decorationColor: '#0A0A0A',
    surface: '#FFFFFF',
    surfaceStroke: '#0A0A0A',
    strokeWidth: 2.2,
    text: '#0A0A0A',
    textMuted: '#0A0A0A8C',
    accent: '#0A0A0A',
    onAccent: '#FFFFFF',
    highlight: '#5A5A5A',
    good: '#0A0A0A',
    bad: '#5A5A5A',
    shadow: 'none',
    fontDesign: 'default',
    titleWeight: 800,
    uppercaseTitles: true,
    vinylStyle: 'comic',
    playerColors: ['#111111', '#4D4D4D', '#33424E', '#4E3333', '#33473A', '#46402E', '#3D3349', '#6B6B6B'],
  },
  {
    id: 'comicNight',
    name: 'Comic Nacht',
    colorScheme: 'dark',
    background: '#0A0A0A',
    decoration: 'comicNotes',
    decorationColor: '#FFFFFF',
    surface: '#0A0A0A',
    surfaceStroke: '#FFFFFF',
    strokeWidth: 2.2,
    text: '#FFFFFF',
    textMuted: '#FFFFFF99',
    accent: '#FFFFFF',
    onAccent: '#0A0A0A',
    highlight: '#9A9A9A',
    good: '#FFFFFF',
    bad: '#9A9A9A',
    shadow: 'none',
    fontDesign: 'default',
    titleWeight: 800,
    uppercaseTitles: true,
    vinylStyle: 'comic',
    playerColors: ['#F2F2F2', '#ABABAB', '#9FB6C4', '#C49F9F', '#A3C4AC', '#C4BD9E', '#B3A6C9', '#7F7F7F'],
  },
];

export function themeById(id: string): AppTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
