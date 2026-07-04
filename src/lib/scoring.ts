// Scoring für den Klassik-Modus (relative Ordnung).
// Siehe docs/game-design.md → Grundregeln + Edge-Case „Zwei Karten aus dem gleichen Jahr".
import type { GameMode, Player, PlacementResult, Track } from '../types';

/** Karten chronologisch nach Jahr sortieren (stabil). */
export function sortByYear(cards: Track[]): Track[] {
  return [...cards].sort((a, b) => a.releaseYear - b.releaseYear);
}

/**
 * Ist die Platzierung in der (bereits sortierten) Timeline korrekt?
 * insertIndex ist die Lücke: 0 = ganz links, cards.length = ganz rechts.
 * Gleiche Jahre an den Rändern gelten als korrekt (>=/<=), Ties sind also erlaubt.
 */
export function isPlacementCorrect(
  sortedCards: Track[],
  track: Track,
  insertIndex: number,
): boolean {
  const left = insertIndex > 0 ? sortedCards[insertIndex - 1] : null;
  const right = insertIndex < sortedCards.length ? sortedCards[insertIndex] : null;
  const okLeft = left === null || track.releaseYear >= left.releaseYear;
  const okRight = right === null || track.releaseYear <= right.releaseYear;
  return okLeft && okRight;
}

/** Korrekt platzierte Karte einsortiert zurückgeben (bleibt chronologisch). */
export function insertCard(sortedCards: Track[], track: Track): Track[] {
  return sortByYear([...sortedCards, track]);
}

/** Jahres-Schätzung innerhalb ±tolerance Jahre — genutzt vom "classic-year"-
 *  Platzierungsmodus UND vom Jahres-Feld in "Artist & Titel raten". */
export function isYearGuessCorrect(
  track: Track,
  guessedYear: number,
  tolerance: number,
): boolean {
  return Math.abs(track.releaseYear - guessedYear) <= tolerance;
}

/** "Artist & Titel raten": platzierte, aber noch nicht validierte Karten (< 2/3
 *  Jahr/Titel/Artist richtig) zählen nicht zum Sieg. */
export function validatedCount(player: Player): number {
  return player.cards.length - (player.unvalidatedCardIds?.length ?? 0);
}

/**
 * "Artist & Titel raten": löst einen abgeschlossenen Steal-Ablauf auf (reine
 * Funktion, keine Mutation). Owner bleibt die aktive Person, außer ein Steal
 * hat die Platzierung korrekt nachgeholt, während die aktive Person daneben
 * lag (erster Treffer gewinnt). Bonus-Gewinner ist, wer die meisten der 3
 * Felder richtig hat (aktiver Tipp zählt mit) — ein bestehender Halter wird
 * nur durch ECHT mehr richtige Felder verdrängt, ab `masteryThreshold` gilt
 * als validiert (konfigurierbar: 2 von 3 oder alle 3 nötig).
 */
export function resolveTuneRound(
  result: PlacementResult,
  masteryThreshold: number,
): {
  ownerId: string;
  bonusWinnerId: string | null;
} {
  let ownerId = result.playerId;
  if (!result.correct) {
    const placementSteal = (result.steals ?? []).find((s) => s.placementCorrect);
    if (placementSteal) ownerId = placementSteal.byPlayerId;
  }

  let bonusWinnerId: string | null = null;
  let bestCount = masteryThreshold - 1; // darunter validiert nie, also die "nichts gewonnen"-Schwelle
  const candidates = [
    { id: result.playerId, count: result.bonus?.correctCount ?? 0 },
    ...(result.steals ?? []).map((s) => ({ id: s.byPlayerId, count: s.guess.correctCount })),
  ];
  for (const c of candidates) {
    if (c.count >= masteryThreshold && c.count > bestCount) {
      bestCount = c.count;
      bonusWinnerId = c.id;
    }
  }
  return { ownerId, bonusWinnerId };
}

export type PlayerStats = {
  playerId: string;
  name: string;
  cards: number;
  validated?: number; // nur "name-that-tune"
  accuracy: number; // 0..1
  bonusPoints: number; // "Wessen Liebling?" / Plattenbörse-Sätze
  handSize?: number; // nur "vinyl-uno"
};

/** Rangliste — nach Modus wird unterschiedlich gewertet:
 *  Standardmodi: meiste Karten gewinnt. "vinyl-uno" ist umgekehrt (Rennen auf
 *  leere Hand) — kleinste Hand zuerst, Kartenzahl dort nur Tiebreaker-Info.
 *  "name-that-tune": validierte Karten (nicht nur platzierte) zählen. */
export function ranking(players: Player[], mode?: GameMode): PlayerStats[] {
  const stats = players.map((p) => ({
    playerId: p.id,
    name: p.name,
    cards: p.cards.length,
    validated: mode === 'name-that-tune' ? validatedCount(p) : undefined,
    accuracy: p.attempts > 0 ? p.hits / p.attempts : 0,
    bonusPoints: p.bonusPoints ?? 0,
    handSize: p.handSize,
  }));

  if (mode === 'vinyl-uno') {
    return stats.sort((a, b) => (a.handSize ?? Infinity) - (b.handSize ?? Infinity) || b.cards - a.cards);
  }
  if (mode === 'name-that-tune') {
    return stats.sort((a, b) => (b.validated ?? 0) - (a.validated ?? 0) || b.cards - a.cards);
  }
  // Kartenzahl bleibt die Sieg-Metrik; Bonuspunkte zählen nur als Tiebreaker.
  return stats.sort((a, b) => b.cards - a.cards || b.accuracy - a.accuracy || b.bonusPoints - a.bonusPoints);
}
