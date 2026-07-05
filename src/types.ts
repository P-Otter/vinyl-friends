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
  // Vinyl!: echte Handkarten aus dem 32er-Deck. Wer zuerst leer ist, gewinnt
  // (umgekehrt zum Sammel-Prinzip der anderen Modi). Größe = hand.length.
  hand?: VinylCard[];
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
  | 'vinyl-uno'
  | 'plus-minus';

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
  // "Artist & Titel raten": Sieg braucht winCondition.n TOTAL platzierte Karten
  // UND mindestens requiredMastered davon validiert (2 unabhängige Zahlen, wie
  // in der iOS-App) — nicht nur eine Gesamtzahl validierter Karten.
  requiredMastered: number;
  // "Artist & Titel raten": wie viele von {Jahr, Titel, Artist} müssen stimmen,
  // damit eine Karte als validiert zählt (2 = leichter, 3 = alle nötig).
  masteryThreshold: number;
  // "Plus/Minus": Start-Handgröße (frei wählbar, kein Deck-Limit wie bei "Vinyl!").
  plusMinusStartCards: number;
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

// "Vinyl!": echtes 32-Karten-Deck statt Zufalls-Twist. Jede Handkarte wird vor
// dem Hören gewählt — bei korrekter Platzierung wird ihr Effekt gültig, sonst
// verfällt er (Karte trotzdem abgelegt + 1 Strafkarte gezogen).
export type VinylCardType =
  | 'normal'
  | 'reverse'
  | 'skip'
  | 'draw1'
  | 'draw2'
  | 'wish-decade'
  | 'swap-hand'
  | 'double';

export type VinylCard = { id: string; type: VinylCardType };

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
  // nur "vinyl-uno": welche Karte gespielt wurde und ob ihr Effekt griff
  vinylPlay?: {
    card: VinylCard;
    effectApplied: boolean; // true = richtig platziert, Effekt gültig
    targetId?: string; // betroffene Person bei skip/draw1/draw2/swap-hand
    wishDecade?: number; // gewähltes Jahrzehnt bei wish-decade
  };
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
  // nur "vinyl-uno":
  vinylDeck?: VinylCard[]; // Nachziehstapel
  vinylDiscard?: VinylCard[]; // Ablagestapel — wird neu gemischt, wenn vinylDeck leer ist
  vinylDirection?: 1 | -1; // Zugreihenfolge, von "reverse" umgedreht
  pendingVinylCard?: {
    card: VinylCard | null; // null zwischen Privacy-Gate und tatsächlicher Kartenwahl
    wishDecade?: number;
    screenTurned: boolean; // Privacy-Gate bestätigt -> Hand darf gezeigt werden
  };
  vinylBonusRoundActive?: boolean; // "2-für-1": naechste Runde braucht keine neue Kartenwahl
};

export type Theme = {
  id: string;
  name: string;
  playlistId: string;
  emoji: string;
};
