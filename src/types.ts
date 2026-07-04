// Datenmodell — siehe docs/tech-stack.md. Client-only, kein Backend.

export type TrackSource = 'friends' | 'local' | `theme:${string}`;

export type Track = {
  id: string; // Spotify track ID bzw. "itunes-…"/"pack-…" im Ohne-Spotify-Modus
  uri: string; // spotify:track:... — '' im Ohne-Spotify-Modus
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
  previewUrl?: string; // 30s-Hörprobe (iTunes) — nur im Ohne-Spotify-Modus gesetzt
};

export type Player = {
  id: string; // local uuid
  name: string;
  color: string; // Hex für UI
  cards: Track[]; // korrekt platzierte Karten (=Score), chronologisch sortiert
  // Stats fürs Endscreen
  attempts: number;
  hits: number;
  bonusPoints: number; // "Wessen Liebling?"-Treffer + Plattenbörse-Sätze
  // Plattenbörse (Catan-inspiriert): Dekaden-Marken aus korrekten Platzierungen,
  // key = Dekaden-Start (z.B. 1980), tauschbar zwischen Spielern.
  decadeTokens?: Record<number, number>;
  completedSets?: number; // eingelöste volle Dekaden-Sätze
  // Vinyl! (UNO-inspiriert): Hand schrumpft bei Treffern, wächst bei Fehlern —
  // wer zuerst auf 0 ist, gewinnt (umgekehrt zum Sammel-Prinzip der anderen Modi).
  handSize?: number;
  // "Artist & Titel raten": platzierte, aber noch nicht validierte Karten (< 2/3
  // Jahr/Titel/Artist richtig) — zählen NICHT zum Sieg, bis validiert (selbst
  // oder durch eine gebankte fremde Bonus-Validierung, siehe bonusBank).
  unvalidatedCardIds?: string[];
  // "Artist & Titel raten": gewonnene Bonus-Validierungen fremder Karten, die
  // noch keine eigene offene Karte zum Anwenden gefunden haben (FIFO-Guthaben).
  bonusBank?: number;
};

export type GameMode =
  | 'classic-relative'
  | 'classic-year'
  | 'whose-fave'
  | 'name-that-tune'
  | 'plattenboerse'
  | 'vinyl-uno';

export type WinCondition =
  | { type: 'cards'; n: number }
  | { type: 'time'; minutes: number };

// Woher die Musik kommt: Spotify (Web Playback SDK, Premium nötig) oder
// 30s-iTunes-Hörproben (Ohne-Spotify-Modus — läuft ohne jedes Konto).
export type MusicSource = 'spotify' | 'preview';

export type GameSettings = {
  mode: GameMode;
  musicSource: MusicSource;
  yearTolerance: number; // classic-year (Platzierung) + name-that-tune (Jahres-Tipp), default 2 (±)
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
  startingHandSize: number; // nur "vinyl-uno": Kartenzahl zu Spielbeginn
};

export type GamePhase = 'setup' | 'playing' | 'reveal' | 'finished';

// "Artist & Titel raten": Ergebnis eines Jahr/Titel/Artist-Ratens, fürs Reveal-Overlay.
// Genutzt sowohl für den eigenen Tipp der aktiven Person als auch (via StealAttempt)
// für die Tipps anderer Spieler auf dieselbe Karte.
export type BonusGuessResult = {
  yearGuess: number | null;
  titleGuess: string;
  artistGuess: string;
  yearCorrect: boolean;
  titleCorrect: boolean;
  artistCorrect: boolean;
  correctCount: number; // 0..3 — ab 2 gilt die Karte als validiert
};

// "Artist & Titel raten": Steal-Versuch einer anderen (nicht aktiven) Person auf
// dieselbe Karte — sowohl ein alternativer Platzierungs-Tipp (in der EIGENEN
// Timeline der stehlenden Person) als auch ein eigener Jahr/Titel/Artist-Tipp.
export type StealAttempt = {
  byPlayerId: string;
  placementGuessIndex: number; // gewählte Lücke in der EIGENEN Timeline von byPlayerId
  placementCorrect: boolean;
  guess: BonusGuessResult;
};

// "Vinyl!": zufälliges Ereignis nach einer Platzierung, fürs Reveal-Overlay.
export type VinylEvent =
  | { kind: 'curse'; targetId: string } // Nachbar zieht 2
  | { kind: 'swap'; targetId: string } // Handgröße mit Zufallsgegner tauschen
  | { kind: 'purge' }; // alle -1 (min. 0)

// Ergebnis einer Platzierung, fürs Reveal-Overlay festgehalten.
export type PlacementResult = {
  track: Track;
  playerId: string;
  insertIndex: number; // gewählte Position in der Timeline (0..len)
  correct: boolean;
  bonus?: BonusGuessResult; // nur im Modus "name-that-tune": eigener Jahr/Titel/Artist-Tipp
  steals?: StealAttempt[]; // nur "name-that-tune": Steal-Versuche anderer Spieler
  tuneRoundFinished?: boolean; // nur "name-that-tune": Host hat "fertig, auflösen" gewählt
  finalOwnerId?: string; // nur "name-that-tune": wer die Karte nach Steal-Auflösung bekommt
  decade?: number; // nur "plattenboerse": Dekade der gerade verdienten Marke
  vinylEvent?: VinylEvent; // nur "vinyl-uno": ausgelöstes Zufallsereignis
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
