// Datenmodell — siehe docs/tech-stack.md. Client-only, kein Backend.

export type TrackSource = 'friends' | `theme:${string}`;

export type Track = {
  id: string; // Spotify track ID
  uri: string; // spotify:track:...
  name: string;
  artist: string;
  albumName: string;
  albumArt: string; // URL (kann '' sein)
  releaseYear: number; // aus album.release_date — nur fürs Reveal, NICHT für die Default-Mechanik
  releaseDateRaw: string;
  releaseDatePrecision: 'year' | 'month' | 'day';
  source: TrackSource;
  addedById?: string; // Spotify user-id aus playlist.items[].added_by — für „Wessen Liebling?"
  addedByName?: string; // aufgelöster Anzeigename
  durationMs: number;
  explicit: boolean;
};

export type Player = {
  id: string; // local uuid
  name: string;
  color: string; // Hex für UI
  cards: Track[]; // korrekt platzierte Karten (=Score), chronologisch sortiert
  // Stats fürs Endscreen
  attempts: number;
  hits: number;
};

export type GameMode =
  | 'classic-relative'
  | 'classic-year'
  | 'whose-fave'
  | 'name-that-tune';

export type WinCondition =
  | { type: 'cards'; n: number }
  | { type: 'time'; minutes: number };

export type GameSettings = {
  mode: GameMode;
  yearTolerance: number; // nur bei classic-year, default 2 (±)
  wager: boolean; // Confidence-Wager bei name-that-tune
  ghostTracks: boolean; // anonyme Tracks bei whose-fave
  friendsPlaylistId: string;
  friendsPlaylistName: string;
  enabledThemes: string[]; // theme ids
  friendsRatio: number; // 0..1
  spreadBoost: boolean; // Theme-Mindestanteil im Klassik-Modus erzwingen (opt-in)
  winCondition: WinCondition;
  minTrackLengthSec: number;
  allowExplicit: boolean;
  snippetMode: { enabled: boolean; lengthSec: number };
  randomOffset: boolean;
};

export type GamePhase = 'setup' | 'playing' | 'reveal' | 'finished';

// Ergebnis einer Platzierung, fürs Reveal-Overlay festgehalten.
export type PlacementResult = {
  track: Track;
  playerId: string;
  insertIndex: number; // gewählte Position in der Timeline (0..len)
  correct: boolean;
};

export type GameState = {
  phase: GamePhase;
  settings: GameSettings;
  queue: Track[]; // shuffled, deduped Track-Pool
  currentTrackIndex: number;
  players: Player[];
  currentPlayerIdx: number;
  round: number;
  lastResult?: PlacementResult;
  startedAt?: number; // epoch ms, für Zeit-Win-Condition
};

export type Theme = {
  id: string;
  name: string;
  playlistId: string;
  emoji: string;
};
