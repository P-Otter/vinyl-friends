// Zentraler Game-State (Zustand) + LocalStorage-Persistenz für Session-Recovery.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  GameSettings,
  GameState,
  Player,
  PlacementResult,
  Track,
} from '../types';
import { insertCard, isPlacementCorrect, sortByYear } from '../lib/scoring';

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
    wager: false,
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
  };
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
  };
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

  // abgeleitet
  currentTrack: () => Track | undefined;
  currentPlayer: () => Player | undefined;
  winner: () => Player | undefined;
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

      startGame: (queue) =>
        set({
          phase: 'playing',
          queue,
          currentTrackIndex: 0,
          currentPlayerIdx: 0,
          round: 1,
          lastResult: undefined,
          startedAt: Date.now(),
          players: get().players.map((p) => ({ ...p, cards: [], attempts: 0, hits: 0 })),
        }),

      placeCard: (playerId, insertIndex) => {
        const state = get();
        const track = state.queue[state.currentTrackIndex];
        if (!track) return;
        const player = state.players.find((p) => p.id === playerId);
        if (!player) return;

        const sorted = sortByYear(player.cards);
        const correct = isPlacementCorrect(sorted, track, insertIndex);
        const result: PlacementResult = { track, playerId, insertIndex, correct };

        set({
          phase: 'reveal',
          lastResult: result,
          players: state.players.map((p) => {
            if (p.id !== playerId) return p;
            return {
              ...p,
              attempts: p.attempts + 1,
              hits: p.hits + (correct ? 1 : 0),
              cards: correct ? insertCard(sorted, track) : p.cards,
            };
          }),
        });
      },

      nextPlayer: () => {
        const state = get();
        // Gewinn-Check (Karten-Race)
        const win = state.settings.winCondition;
        const reachedCards =
          win.type === 'cards' &&
          state.players.some((p) => p.cards.length >= win.n);
        const timeUp =
          win.type === 'time' &&
          state.startedAt !== undefined &&
          Date.now() - state.startedAt >= win.minutes * 60_000;
        const nextIndex = advanceTrack(state);
        const outOfTracks = nextIndex >= state.queue.length;

        if (reachedCards || timeUp || outOfTracks) {
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
          players: get().players.map((p) => ({ ...p, cards: [], attempts: 0, hits: 0 })),
        }),

      currentTrack: () => get().queue[get().currentTrackIndex],
      currentPlayer: () => get().players[get().currentPlayerIdx],
      winner: () => {
        const win = get().settings.winCondition;
        const players = [...get().players].sort(
          (a, b) => b.cards.length - a.cards.length,
        );
        const top = players[0];
        if (!top) return undefined;
        if (win.type === 'cards' && top.cards.length < win.n && get().phase !== 'finished') {
          return undefined;
        }
        return top;
      },
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
