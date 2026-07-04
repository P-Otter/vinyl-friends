// Scoring für den Klassik-Modus (relative Ordnung).
// Siehe docs/game-design.md → Grundregeln + Edge-Case „Zwei Karten aus dem gleichen Jahr".
import type { GameMode, Player, Track } from '../types';

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

/** Optionaler Jahres-Modus: Schätzung innerhalb ±tolerance Jahre. */
export function isYearGuessCorrect(
  track: Track,
  guessedYear: number,
  tolerance: number,
): boolean {
  return Math.abs(track.releaseYear - guessedYear) <= tolerance;
}

export type PlayerStats = {
  playerId: string;
  name: string;
  cards: number;
  accuracy: number; // 0..1
  bonusPoints: number; // "Wessen Liebling?" / "Artist & Titel raten" / Plattenbörse-Sätze
  handSize?: number; // nur "vinyl-uno"
};

/** Rangliste — nach Modus wird unterschiedlich gewertet:
 *  Standardmodi: meiste Karten gewinnt. "vinyl-uno" ist umgekehrt (Rennen auf
 *  leere Hand) — kleinste Hand zuerst, Kartenzahl dort nur Tiebreaker-Info. */
export function ranking(players: Player[], mode?: GameMode): PlayerStats[] {
  const stats = players.map((p) => ({
    playerId: p.id,
    name: p.name,
    cards: p.cards.length,
    accuracy: p.attempts > 0 ? p.hits / p.attempts : 0,
    bonusPoints: p.bonusPoints ?? 0,
    handSize: p.handSize,
  }));

  if (mode === 'vinyl-uno') {
    return stats.sort((a, b) => (a.handSize ?? Infinity) - (b.handSize ?? Infinity) || b.cards - a.cards);
  }
  // Kartenzahl bleibt die Sieg-Metrik; Bonuspunkte zählen nur als Tiebreaker.
  return stats.sort((a, b) => b.cards - a.cards || b.accuracy - a.accuracy || b.bonusPoints - a.bonusPoints);
}
