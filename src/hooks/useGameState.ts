// Zentraler Game-State (Zustand) + LocalStorage-Persistenz für Session-Recovery.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  BonusGuessResult,
  GameSettings,
  GameState,
  Player,
  PlacementResult,
  Track,
  VinylEvent,
} from '../types';
import {
  insertCard,
  isPlacementCorrect,
  isYearGuessCorrect,
  resolveTuneRound,
  sortByYear,
  validatedCount,
} from '../lib/scoring';
import { fuzzyMatches, fuzzyMatchesArtist } from '../lib/fuzzy-match';

const PLAYER_COLORS = [
  '#ef4444', // rot
  '#3b82f6', // blau
  '#22c55e', // grün
  '#eab308', // gelb
  '#a855f7', // lila
  '#f97316', // orange
  '#ec4899', // pink
  '#14b8a6', // teal
];

export function defaultSettings(): GameSettings {
  return {
    mode: 'classic-relative',
    musicSource: 'spotify',
    yearTolerance: 2,
    ghostTracks: false,
    friendsPlaylistId: '',
    friendsPlaylistName: '',
    enabledThemes: [],
    friendsRatio: 0.7,
    spreadBoost: false,
    winCondition: { type: 'cards', n: 10 },
    minTrackLengthSec: 60,
    allowExplicit: true,
    snippetMode: { enabled: false, lengthSec: 30 },
    randomOffset: true,
    startingHandSize: 7,
  };
}

/** Dekaden-Start eines Jahres, für Plattenbörse (1987 → 1980). */
export function decadeOf(year: number): number {
  return Math.floor(year / 10) * 10;
}

let uid = 0;
function localId(prefix: string): string {
  // crypto.randomUUID ist im Browser verfügbar; Fallback für ältere Umgebungen.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  uid += 1;
  return `${prefix}-${uid}-${performance.now()}`;
}

export function makePlayer(name: string, index: number): Player {
  return {
    id: localId('player'),
    name,
    color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    cards: [],
    attempts: 0,
    hits: 0,
    bonusPoints: 0,
    decadeTokens: {},
    completedSets: 0,
    unvalidatedCardIds: [],
    bonusBank: 0,
  };
}

/** Alle Dekaden, die im aktuellen Pool tatsächlich vorkommen — Plattenbörse
 *  fordert nur Sätze aus Dekaden, die überhaupt spielbar sind. Sortiert, damit
 *  die Markt-Anzeige stabil bleibt. */
export function decadesInQueue(queue: Track[]): number[] {
  return [...new Set(queue.filter((t) => t.releaseYear > 0).map((t) => decadeOf(t.releaseYear)))].sort(
    (a, b) => a - b,
  );
}

/** Zufälliges "Vinyl!"-Ereignis auslösen (Vinyl!-Modus) und auf die Spieler
 *  anwenden. Gibt das Ereignis (fürs Reveal) + die aktualisierten Spieler zurück. */
function rollVinylEvent(
  players: Player[],
  activePlayerId: string,
): { event: VinylEvent | undefined; players: Player[] } {
  // 1-von-6-Chance, nur als Bonus-Twist nach einem Treffer — kein Doppel-Nachteil.
  if (Math.random() >= 1 / 6) return { event: undefined, players };
  const others = players.filter((p) => p.id !== activePlayerId);
  if (others.length === 0) return { event: undefined, players };

  const kinds: VinylEvent['kind'][] = ['curse', 'swap', 'purge'];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  const target = others[Math.floor(Math.random() * others.length)];

  if (kind === 'purge') {
    return {
      event: { kind },
      players: players.map((p) => ({ ...p, handSize: Math.max(0, (p.handSize ?? 0) - 1) })),
    };
  }
  if (kind === 'curse') {
    return {
      event: { kind, targetId: target.id },
      players: players.map((p) =>
        p.id === target.id ? { ...p, handSize: (p.handSize ?? 0) + 2 } : p,
      ),
    };
  }
  // swap: Handgröße von aktivem Spieler und Zufallsgegner tauschen.
  const active = players.find((p) => p.id === activePlayerId);
  if (!active) return { event: undefined, players };
  return {
    event: { kind, targetId: target.id },
    players: players.map((p) => {
      if (p.id === active.id) return { ...p, handSize: target.handSize ?? 0 };
      if (p.id === target.id) return { ...p, handSize: active.handSize ?? 0 };
      return p;
    }),
  };
}

/** "Artist & Titel raten": ein Jahr/Titel/Artist-Tipp gegen die echte Karte bewertet. */
function gradeTuneGuess(
  result: PlacementResult,
  yearTolerance: number,
  yearGuess: number | null,
  titleGuess: string,
  artistGuess: string,
): BonusGuessResult {
  const yearCorrect = yearGuess !== null && isYearGuessCorrect(result.track, yearGuess, yearTolerance);
  const titleCorrect = fuzzyMatches(titleGuess, result.track.name);
  const artistCorrect = fuzzyMatchesArtist(artistGuess, result.track.artist);
  const correctCount = [yearCorrect, titleCorrect, artistCorrect].filter(Boolean).length;
  return { yearGuess, titleGuess, artistGuess, yearCorrect, titleCorrect, artistCorrect, correctCount };
}

/**
 * "Artist & Titel raten": wendet das Ergebnis von resolveTuneRound tatsächlich an.
 * Owner bekommt die Karte (ggf. neu einsortiert, falls gestohlen) + wird sofort
 * validiert ODER landet in unvalidatedCardIds (außer eigenes Bank-Guthaben deckt
 * es sofort). Gewinnt jemand ANDERES den Bonus, wird bei der Person zuerst die
 * älteste eigene offene Karte validiert, sonst wandert ein Token in die Bank.
 */
function applyTuneResolution(
  players: Player[],
  result: PlacementResult,
  ownerId: string,
  validated: boolean,
  bonusWinnerId: string | null,
): Player[] {
  const stolen = ownerId !== result.playerId;
  const bankEarnerId = bonusWinnerId && bonusWinnerId !== ownerId ? bonusWinnerId : null;

  return players.map((p) => {
    if (p.id === ownerId) {
      const cards = stolen ? insertCard(sortByYear(p.cards), result.track) : p.cards;
      if (validated) return { ...p, cards };
      const bank = p.bonusBank ?? 0;
      if (bank > 0) return { ...p, cards, bonusBank: bank - 1 };
      return { ...p, cards, unvalidatedCardIds: [...(p.unvalidatedCardIds ?? []), result.track.id] };
    }
    if (p.id === bankEarnerId) {
      const pending = p.unvalidatedCardIds ?? [];
      if (pending.length > 0) return { ...p, unvalidatedCardIds: pending.slice(1) };
      return { ...p, bonusBank: (p.bonusBank ?? 0) + 1 };
    }
    return p;
  });
}

type GameStore = GameState & {
  // Setup
  setSettings: (patch: Partial<GameSettings>) => void;
  setPlayers: (players: Player[]) => void;
  startGame: (queue: Track[]) => void;

  // Spielablauf (Klassik)
  placeCard: (playerId: string, insertIndex: number) => void;
  nextPlayer: () => void;
  skipTrack: () => void;
  resetGame: () => void;

  // "Wessen Liebling?"
  awardFaveGuess: (playerId: string) => void;

  // "Artist & Titel raten": eigener blinder Jahr/Titel/Artist-Tipp der aktiven Person
  submitTuneGuess: (yearGuess: number | null, titleGuess: string, artistGuess: string) => void;
  // "Artist & Titel raten": Steal-Versuch einer anderen Person (Platzierung in
  // deren EIGENER Timeline + eigener Jahr/Titel/Artist-Tipp)
  submitTuneSteal: (
    byPlayerId: string,
    placementGuessIndex: number,
    yearGuess: number | null,
    titleGuess: string,
    artistGuess: string,
  ) => void;
  // "Artist & Titel raten": Host beendet die Steal-Runde — löst Owner + Bonus-Validierung auf
  finishTuneRound: () => void;

  // Plattenbörse: 1-für-1-Tausch zweier Dekaden-Marken zwischen zwei Spielern
  tradeTokens: (fromId: string, fromDecade: number, toId: string, toDecade: number) => void;
  // Plattenbörse: kompletten Dekaden-Satz gegen Bonuspunkte einlösen (falls vorhanden)
  redeemSet: (playerId: string) => void;

  // abgeleitet
  currentTrack: () => Track | undefined;
  currentPlayer: () => Player | undefined;
};

function advanceTrack(state: GameState): number {
  return Math.min(state.currentTrackIndex + 1, state.queue.length);
}

export const useGameState = create<GameStore>()(
  persist(
    (set, get) => ({
      phase: 'setup',
      settings: defaultSettings(),
      queue: [],
      currentTrackIndex: 0,
      players: [],
      currentPlayerIdx: 0,
      round: 0,
      lastResult: undefined,
      startedAt: undefined,

      setSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      setPlayers: (players) => set({ players }),

      startGame: (queue) => {
        const { mode, startingHandSize } = get().settings;
        set({
          phase: 'playing',
          queue,
          currentTrackIndex: 0,
          currentPlayerIdx: 0,
          round: 1,
          lastResult: undefined,
          startedAt: Date.now(),
          players: get().players.map((p) => ({
            ...p,
            cards: [],
            attempts: 0,
            hits: 0,
            bonusPoints: 0,
            decadeTokens: {},
            completedSets: 0,
            unvalidatedCardIds: [],
            bonusBank: 0,
            handSize: mode === 'vinyl-uno' ? startingHandSize : undefined,
          })),
        });
      },

      placeCard: (playerId, insertIndex) => {
        const state = get();
        const track = state.queue[state.currentTrackIndex];
        if (!track) return;
        const player = state.players.find((p) => p.id === playerId);
        if (!player) return;
        const { mode } = state.settings;

        const sorted = sortByYear(player.cards);
        const correct = isPlacementCorrect(sorted, track, insertIndex);
        const decade = mode === 'plattenboerse' && correct ? decadeOf(track.releaseYear) : undefined;

        let players = state.players.map((p) => {
          if (p.id !== playerId) return p;
          const handDelta = mode === 'vinyl-uno' ? (correct ? -1 : 1) : 0;
          return {
            ...p,
            attempts: p.attempts + 1,
            hits: p.hits + (correct ? 1 : 0),
            cards: correct ? insertCard(sorted, track) : p.cards,
            decadeTokens:
              decade !== undefined
                ? { ...p.decadeTokens, [decade]: (p.decadeTokens?.[decade] ?? 0) + 1 }
                : p.decadeTokens,
            handSize: p.handSize !== undefined ? Math.max(0, p.handSize + handDelta) : p.handSize,
          };
        });

        // "Vinyl!": nur nach einem Treffer ein Zufalls-Ereignis auslösen (Bonus-Twist,
        // kein Doppel-Nachteil bei ohnehin schon verpasster Platzierung).
        let vinylEvent: VinylEvent | undefined;
        if (mode === 'vinyl-uno' && correct) {
          const rolled = rollVinylEvent(players, playerId);
          vinylEvent = rolled.event;
          players = rolled.players;
        }

        const result: PlacementResult = { track, playerId, insertIndex, correct, decade, vinylEvent };
        set({ phase: 'reveal', lastResult: result, players });
      },

      awardFaveGuess: (playerId) => {
        set((s) => ({
          players: s.players.map((p) =>
            p.id === playerId ? { ...p, bonusPoints: (p.bonusPoints ?? 0) + 1 } : p,
          ),
        }));
      },

      submitTuneGuess: (yearGuess, titleGuess, artistGuess) => {
        const state = get();
        const result = state.lastResult;
        if (!result || result.bonus) return; // schon abgegeben
        set({ lastResult: { ...result, bonus: gradeTuneGuess(result, state.settings.yearTolerance, yearGuess, titleGuess, artistGuess) } });
      },

      submitTuneSteal: (byPlayerId, placementGuessIndex, yearGuess, titleGuess, artistGuess) => {
        const state = get();
        const result = state.lastResult;
        if (!result || result.tuneRoundFinished) return;
        const stealer = state.players.find((p) => p.id === byPlayerId);
        if (!stealer) return;
        const placementCorrect = isPlacementCorrect(sortByYear(stealer.cards), result.track, placementGuessIndex);
        const attempt = {
          byPlayerId,
          placementGuessIndex,
          placementCorrect,
          guess: gradeTuneGuess(result, state.settings.yearTolerance, yearGuess, titleGuess, artistGuess),
        };
        set({ lastResult: { ...result, steals: [...(result.steals ?? []), attempt] } });
      },

      finishTuneRound: () => {
        const state = get();
        const result = state.lastResult;
        if (!result || result.tuneRoundFinished || !result.bonus) return;
        const { ownerId, bonusWinnerId } = resolveTuneRound(result);
        const validated = bonusWinnerId === ownerId;

        set({
          lastResult: { ...result, tuneRoundFinished: true, finalOwnerId: ownerId },
          players: applyTuneResolution(state.players, result, ownerId, validated, bonusWinnerId),
        });
      },

      tradeTokens: (fromId, fromDecade, toId, toDecade) => {
        const state = get();
        const from = state.players.find((p) => p.id === fromId);
        const to = state.players.find((p) => p.id === toId);
        if (!from || !to || fromId === toId) return;
        if ((from.decadeTokens?.[fromDecade] ?? 0) < 1) return;
        if ((to.decadeTokens?.[toDecade] ?? 0) < 1) return;

        set({
          players: state.players.map((p) => {
            if (p.id === fromId) {
              return {
                ...p,
                decadeTokens: {
                  ...p.decadeTokens,
                  [fromDecade]: (p.decadeTokens?.[fromDecade] ?? 0) - 1,
                  [toDecade]: (p.decadeTokens?.[toDecade] ?? 0) + 1,
                },
              };
            }
            if (p.id === toId) {
              return {
                ...p,
                decadeTokens: {
                  ...p.decadeTokens,
                  [toDecade]: (p.decadeTokens?.[toDecade] ?? 0) - 1,
                  [fromDecade]: (p.decadeTokens?.[fromDecade] ?? 0) + 1,
                },
              };
            }
            return p;
          }),
        });
      },

      redeemSet: (playerId) => {
        const state = get();
        const player = state.players.find((p) => p.id === playerId);
        if (!player) return;
        const needed = decadesInQueue(state.queue);
        if (needed.length === 0) return;
        const hasFullSet = needed.every((d) => (player.decadeTokens?.[d] ?? 0) >= 1);
        if (!hasFullSet) return;

        set({
          players: state.players.map((p) => {
            if (p.id !== playerId) return p;
            const remaining = { ...p.decadeTokens };
            for (const d of needed) remaining[d] = (remaining[d] ?? 0) - 1;
            return {
              ...p,
              decadeTokens: remaining,
              completedSets: (p.completedSets ?? 0) + 1,
              bonusPoints: (p.bonusPoints ?? 0) + 3,
            };
          }),
        });
      },

      nextPlayer: () => {
        const state = get();
        const { mode } = state.settings;
        // Gewinn-Check: Standardmodi = Karten-Race, "vinyl-uno" = Rennen auf leere Hand,
        // "name-that-tune" = validierte (nicht nur platzierte) Karten zählen.
        const win = state.settings.winCondition;
        const reachedCards =
          mode !== 'vinyl-uno' &&
          win.type === 'cards' &&
          state.players.some((p) =>
            mode === 'name-that-tune' ? validatedCount(p) >= win.n : p.cards.length >= win.n,
          );
        const handEmpty = mode === 'vinyl-uno' && state.players.some((p) => (p.handSize ?? 0) <= 0);
        const timeUp =
          win.type === 'time' &&
          state.startedAt !== undefined &&
          Date.now() - state.startedAt >= win.minutes * 60_000;
        const nextIndex = advanceTrack(state);
        const outOfTracks = nextIndex >= state.queue.length;

        if (reachedCards || handEmpty || timeUp || outOfTracks) {
          set({ phase: 'finished', lastResult: undefined });
          return;
        }

        const nextPlayerIdx = (state.currentPlayerIdx + 1) % state.players.length;
        set({
          phase: 'playing',
          currentTrackIndex: nextIndex,
          currentPlayerIdx: nextPlayerIdx,
          round: state.round + 1,
          lastResult: undefined,
        });
      },

      skipTrack: () => {
        const state = get();
        const nextIndex = advanceTrack(state);
        if (nextIndex >= state.queue.length) {
          set({ phase: 'finished', lastResult: undefined });
          return;
        }
        set({ currentTrackIndex: nextIndex, lastResult: undefined });
      },

      resetGame: () =>
        set({
          phase: 'setup',
          queue: [],
          currentTrackIndex: 0,
          currentPlayerIdx: 0,
          round: 0,
          lastResult: undefined,
          startedAt: undefined,
          players: get().players.map((p) => ({
            ...p,
            cards: [],
            attempts: 0,
            hits: 0,
            bonusPoints: 0,
            decadeTokens: {},
            completedSets: 0,
            unvalidatedCardIds: [],
            bonusBank: 0,
            handSize: undefined,
          })),
        }),

      currentTrack: () => get().queue[get().currentTrackIndex],
      currentPlayer: () => get().players[get().currentPlayerIdx],
    }),
    {
      name: 'hf_game_state',
      // Alte Spielstände können neue Settings-Felder (z. B. musicSource) noch
      // nicht haben — beim Laden mit den Defaults verschmelzen statt undefined.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<GameState>;
        return {
          ...current,
          ...p,
          settings: { ...current.settings, ...(p.settings ?? {}) },
        };
      },
      // Nur das persistieren was Session-Recovery braucht — keine Funktionen.
      partialize: (s) => ({
        phase: s.phase,
        settings: s.settings,
        queue: s.queue,
        currentTrackIndex: s.currentTrackIndex,
        players: s.players,
        currentPlayerIdx: s.currentPlayerIdx,
        round: s.round,
        startedAt: s.startedAt,
      }),
    },
  ),
);
