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
  VinylCard,
} from '../types';
import {
  insertCard,
  isPlacementCorrect,
  resolveTuneRound,
  sortByYear,
  validatedCount,
} from '../lib/scoring';
import { fuzzyMatches, fuzzyMatchesArtist } from '../lib/fuzzy-match';
import { buildVinylDeck, drawVinylCard, vinylHandSize } from '../lib/vinylDeck';

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
    requiredMastered: 3,
    masteryThreshold: 2,
    plusMinusStartCards: 7,
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

/**
 * "Vinyl!": löst die gespielte Handkarte auf, nachdem die Platzierungs-
 * Korrektheit feststeht. Bei Treffer wird der Karteneffekt gültig (siehe
 * Kartentabelle in vinylDeck.ts), bei Fehlschlag verfällt er und die aktive
 * Person zieht 1 Strafkarte. Die gespielte Karte wandert so oder so in die
 * Ablage. Reine Funktion — arbeitet nur mit dem übergebenen State-Ausschnitt.
 */
function resolveVinylCardPlay(
  players: Player[],
  deck: VinylCard[],
  discard: VinylCard[],
  direction: 1 | -1,
  playerId: string,
  card: VinylCard,
  correct: boolean,
): {
  players: Player[];
  deck: VinylCard[];
  discard: VinylCard[];
  direction: 1 | -1;
  targetId?: string;
  bonusRound: boolean;
} {
  // Gespielte Karte verlässt so oder so die Hand — Effekt entscheidet nur, ob
  // sie ZUSÄTZLICH etwas bewirkt (siehe unten). Muss VOR allen draw()-Aufrufen
  // passieren, sonst würde ein Strafzug für dieselbe Person die eben entfernte
  // Karte aus einer veralteten Hand-Referenz wiederherstellen.
  let nextPlayers = players.map((p) =>
    p.id === playerId ? { ...p, hand: (p.hand ?? []).filter((c) => c.id !== card.id) } : p,
  );
  let nextDeck = deck;
  let nextDiscard = discard;
  let nextDirection = direction;
  let targetId: string | undefined;
  let bonusRound = false;

  const draw = (id: string, n: number) => {
    for (let i = 0; i < n; i++) {
      const res = drawVinylCard(nextDeck, nextDiscard);
      nextDeck = res.deck;
      nextDiscard = res.discard;
      if (!res.card) break; // alle 32 Karten sind gerade in Händen — Zug verpufft
      const drawn = res.card;
      nextPlayers = nextPlayers.map((p) => (p.id === id ? { ...p, hand: [...(p.hand ?? []), drawn] } : p));
    }
  };
  const activeIdx = players.findIndex((p) => p.id === playerId);
  const targetByOffset = (offset: number) => players[(activeIdx + offset * direction + players.length) % players.length];

  if (correct) {
    switch (card.type) {
      case 'reverse':
        nextDirection = direction === 1 ? -1 : 1;
        break;
      case 'skip':
        targetId = players.length > 1 ? targetByOffset(1).id : undefined;
        break;
      case 'draw1':
        targetId = players.length > 1 ? targetByOffset(1).id : undefined;
        if (targetId) draw(targetId, 1);
        break;
      case 'draw2':
        targetId = players.length > 1 ? targetByOffset(1).id : undefined;
        if (targetId) draw(targetId, 2);
        break;
      case 'swap-hand': {
        const others = players.filter((p) => p.id !== playerId);
        if (others.length > 0) {
          const target = others[Math.floor(Math.random() * others.length)];
          targetId = target.id;
          // "me" MUSS aus nextPlayers kommen (schon ohne die gespielte Karte),
          // sonst würde die eben abgelegte Karte mit hinübergetauscht.
          const me = nextPlayers.find((p) => p.id === playerId);
          nextPlayers = nextPlayers.map((p) => {
            if (p.id === playerId) return { ...p, hand: target.hand ?? [] };
            if (p.id === target.id) return { ...p, hand: me?.hand ?? [] };
            return p;
          });
        }
        break;
      }
      case 'double':
        bonusRound = true;
        break;
      case 'wish-decade':
      case 'normal':
        break;
    }
  } else {
    draw(playerId, 1);
  }

  nextDiscard = [...nextDiscard, card];
  return { players: nextPlayers, deck: nextDeck, discard: nextDiscard, direction: nextDirection, targetId, bonusRound };
}

/** "Artist & Titel raten": ein Jahr/Titel/Artist-Tipp gegen die echte Karte bewertet.
 *  Jahr muss EXAKT stimmen (keine Toleranz — das ist ein Wissens-Check, kein
 *  Platzierungs-Schätzwert), Titel/Artist bleiben tippfehlertolerant (Fuzzy-Match). */
function gradeTuneGuess(
  result: PlacementResult,
  yearGuess: number | null,
  titleGuess: string,
  artistGuess: string,
): BonusGuessResult {
  const yearCorrect = yearGuess !== null && yearGuess === result.track.releaseYear;
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

  // "Vinyl!": Privacy-Gate bestätigen, dann eine Handkarte für diese Runde wählen
  // (bei "wish-decade" zusätzlich ein Jahrzehnt — zieht den passenden Song vor).
  confirmScreenTurned: () => void;
  selectVinylCard: (playerId: string, cardId: string, wishDecade?: number) => void;
  // "Vinyl!": Bonusrunde durch "2-für-1" fortsetzen — kein neuer Kartenwahl-Schritt.
  continueVinylBonusRound: () => void;

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
        const { mode } = get().settings;
        const players = get().players;
        // "Vinyl!": frisches 32-Karten-Deck bauen + austeilen (Handgröße richtet
        // sich nach der Spielerzahl, damit das Deck fürs Austeilen immer reicht).
        let vinylDeck: VinylCard[] | undefined;
        const handByPlayer = new Map<string, VinylCard[]>();
        if (mode === 'vinyl-uno') {
          let deck = buildVinylDeck();
          const size = vinylHandSize(players.length);
          for (const p of players) {
            const hand: VinylCard[] = [];
            for (let i = 0; i < size; i++) {
              const drawn = deck[0];
              if (!drawn) break;
              hand.push(drawn);
              deck = deck.slice(1);
            }
            handByPlayer.set(p.id, hand);
          }
          vinylDeck = deck;
        } else if (mode === 'plus-minus') {
          // "Plus/Minus": kein Deck, nur eine reine Zähl-"Hand" ohne Kartentypen —
          // richtig platziert = -1, falsch = +1 (siehe placeCard).
          const size = get().settings.plusMinusStartCards;
          for (const p of players) {
            handByPlayer.set(p.id, Array.from({ length: size }, (_, i) => ({ id: `${p.id}-pm${i}`, type: 'normal' as const })));
          }
        }

        set({
          phase: 'playing',
          queue,
          currentTrackIndex: 0,
          currentPlayerIdx: 0,
          round: 1,
          lastResult: undefined,
          startedAt: Date.now(),
          vinylDeck,
          vinylDiscard: mode === 'vinyl-uno' ? [] : undefined,
          vinylDirection: mode === 'vinyl-uno' ? 1 : undefined,
          pendingVinylCard: undefined,
          vinylBonusRoundActive: false,
          players: players.map((p) => ({
            ...p,
            cards: [],
            attempts: 0,
            hits: 0,
            bonusPoints: 0,
            decadeTokens: {},
            completedSets: 0,
            unvalidatedCardIds: [],
            bonusBank: 0,
            hand: handByPlayer.get(p.id),
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
        const isBonusRound = mode === 'vinyl-uno' && state.vinylBonusRoundActive;

        let players = state.players.map((p) => {
          if (p.id !== playerId) return p;
          return {
            ...p,
            attempts: p.attempts + 1,
            hits: p.hits + (correct ? 1 : 0),
            cards: correct ? insertCard(sorted, track) : p.cards,
            decadeTokens:
              decade !== undefined
                ? { ...p.decadeTokens, [decade]: (p.decadeTokens?.[decade] ?? 0) + 1 }
                : p.decadeTokens,
            // "Plus/Minus": kein Kartendeck, nur -1 bei Treffer / +1 bei Fehlschlag.
            hand:
              mode === 'plus-minus'
                ? correct
                  ? (p.hand ?? []).slice(1)
                  : [...(p.hand ?? []), { id: localId('pm'), type: 'normal' as const }]
                : p.hand,
          };
        });

        // "Vinyl!": die gespielte Handkarte auflösen — außer wir sind gerade in
        // der kartenlosen Bonusrunde eines erfolgreichen "2-für-1".
        let vinylPlay: PlacementResult['vinylPlay'];
        let vinylDeck = state.vinylDeck;
        let vinylDiscard = state.vinylDiscard;
        let vinylDirection = state.vinylDirection ?? 1;
        if (mode === 'vinyl-uno' && !isBonusRound && state.pendingVinylCard?.card) {
          const card = state.pendingVinylCard.card;
          const resolved = resolveVinylCardPlay(
            players,
            vinylDeck ?? [],
            vinylDiscard ?? [],
            vinylDirection,
            playerId,
            card,
            correct,
          );
          players = resolved.players;
          vinylDeck = resolved.deck;
          vinylDiscard = resolved.discard;
          vinylDirection = resolved.direction;
          vinylPlay = {
            card,
            effectApplied: correct,
            targetId: resolved.targetId,
            wishDecade: state.pendingVinylCard.wishDecade,
          };
        }

        const result: PlacementResult = { track, playerId, insertIndex, correct, decade, vinylPlay };
        set({
          phase: 'reveal',
          lastResult: result,
          players,
          vinylDeck,
          vinylDiscard,
          vinylDirection,
          pendingVinylCard: undefined,
          vinylBonusRoundActive: vinylPlay?.card.type === 'double' && correct,
        });
      },

      selectVinylCard: (playerId, cardId, wishDecade) => {
        const state = get();
        if (!state.pendingVinylCard?.screenTurned) return; // erst Privacy-Gate bestätigen
        const player = state.players.find((p) => p.id === playerId);
        const card = player?.hand?.find((c) => c.id === cardId);
        if (!card) return;

        let queue = state.queue;
        if (card.type === 'wish-decade' && wishDecade !== undefined) {
          const rest = queue.slice(state.currentTrackIndex);
          const matchOffset = rest.findIndex((t) => decadeOf(t.releaseYear) === wishDecade);
          if (matchOffset > 0) {
            const actualIdx = state.currentTrackIndex + matchOffset;
            queue = [...queue];
            const [wished] = queue.splice(actualIdx, 1);
            queue.splice(state.currentTrackIndex, 0, wished);
          }
        }

        set({ queue, pendingVinylCard: { card, wishDecade, screenTurned: true } });
      },

      confirmScreenTurned: () => set({ pendingVinylCard: { card: null, screenTurned: true } }),

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
        set({ lastResult: { ...result, bonus: gradeTuneGuess(result, yearGuess, titleGuess, artistGuess) } });
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
          guess: gradeTuneGuess(result, yearGuess, titleGuess, artistGuess),
        };
        set({ lastResult: { ...result, steals: [...(result.steals ?? []), attempt] } });
      },

      finishTuneRound: () => {
        const state = get();
        const result = state.lastResult;
        if (!result || result.tuneRoundFinished || !result.bonus) return;
        const { ownerId, bonusWinnerId } = resolveTuneRound(result, state.settings.masteryThreshold);
        const validated = bonusWinnerId === ownerId;

        set({
          lastResult: { ...result, tuneRoundFinished: true, finalOwnerId: ownerId },
          players: applyTuneResolution(state.players, result, ownerId, validated, bonusWinnerId),
        });
      },

      continueVinylBonusRound: () => {
        const state = get();
        const nextIndex = advanceTrack(state);
        if (nextIndex >= state.queue.length) {
          set({ phase: 'finished', lastResult: undefined });
          return;
        }
        set({ phase: 'playing', currentTrackIndex: nextIndex, lastResult: undefined });
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
        // "name-that-tune" = braucht win.n TOTAL Karten UND mindestens requiredMastered
        // davon validiert (zwei unabhängige Zahlen, wie in der iOS-App).
        const win = state.settings.winCondition;
        const isHandCountdown = mode === 'vinyl-uno' || mode === 'plus-minus';
        const reachedCards =
          !isHandCountdown &&
          win.type === 'cards' &&
          state.players.some((p) =>
            mode === 'name-that-tune'
              ? p.cards.length >= win.n && validatedCount(p) >= state.settings.requiredMastered
              : p.cards.length >= win.n,
          );
        const handEmpty = isHandCountdown && state.players.some((p) => (p.hand?.length ?? 0) <= 0);
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

        // "Vinyl!": Zugrichtung + ein anstehendes Skip (durch "skip" oder "draw2")
        // berücksichtigen — sonst normaler Schritt von 1. Bei GENAU 2 Spielern
        // zählt auch "reverse" als Skip (Standard-UNO-Regel: die Zugrichtung
        // umzudrehen ergibt bei nur 2 Personen keinen Unterschied, deshalb bekommt
        // die aktive Person stattdessen direkt noch eine Runde).
        const skippedEffect = state.lastResult?.vinylPlay;
        const playerCount = state.players.length;
        const advanceBy =
          skippedEffect?.effectApplied &&
          (skippedEffect.card.type === 'skip' ||
            skippedEffect.card.type === 'draw2' ||
            (skippedEffect.card.type === 'reverse' && playerCount === 2))
            ? 2
            : 1;
        const direction = state.vinylDirection ?? 1;
        const nextPlayerIdx =
          mode === 'vinyl-uno'
            ? (state.currentPlayerIdx + advanceBy * direction + playerCount * 2) % playerCount
            : (state.currentPlayerIdx + 1) % playerCount;
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
          vinylDeck: undefined,
          vinylDiscard: undefined,
          vinylDirection: undefined,
          pendingVinylCard: undefined,
          vinylBonusRoundActive: false,
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
            hand: undefined,
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
        vinylDeck: s.vinylDeck,
        vinylDiscard: s.vinylDiscard,
        vinylDirection: s.vinylDirection,
        pendingVinylCard: s.pendingVinylCard,
        vinylBonusRoundActive: s.vinylBonusRoundActive,
      }),
    },
  ),
);
