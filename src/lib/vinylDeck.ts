// "Vinyl!": echtes 32-Karten-Deck (fester Satz, keine Zufalls-Nachschub-Menge).
// Reine Funktionen — analog zu scoring.ts, leicht einzeln testbar.
import type { VinylCard, VinylCardType } from '../types';

// Jeder Typ ≤6, die Extremen (2-für-1) klar seltener, Zieh-2 seltener als Zieh-1.
const COMPOSITION: Record<VinylCardType, number> = {
  normal: 6,
  reverse: 4,
  skip: 6,
  draw1: 6,
  draw2: 3,
  'wish-decade': 3,
  'swap-hand': 2,
  double: 2,
};

export const VINYL_DECK_SIZE = Object.values(COMPOSITION).reduce((a, b) => a + b, 0); // 32

export const VINYL_CARD_INFO: Record<VinylCardType, { emoji: string; label: string; hint: string }> = {
  normal: { emoji: '🎵', label: 'Normal', hint: 'Kein Zusatzeffekt.' },
  reverse: { emoji: '🔁', label: 'Reverse', hint: 'Zugrichtung dreht sich um.' },
  skip: { emoji: '⏭️', label: 'Skip', hint: 'Nächste Person setzt aus.' },
  draw1: { emoji: '➕', label: 'Zieh-1', hint: 'Nächste Person zieht 1 Karte.' },
  draw2: { emoji: '➕➕', label: 'Zieh-2', hint: 'Nächste Person zieht 2 Karten & setzt aus.' },
  'wish-decade': { emoji: '🔮', label: 'Wunschkarte', hint: 'Jahrzehnt wählen — nächster Song garantiert daraus.' },
  'swap-hand': { emoji: '🔀', label: 'Tausch', hint: 'Ganze Hand mit einer Zielperson tauschen.' },
  double: { emoji: '✌️', label: '2-für-1', hint: 'Bei Treffer direkt noch ein Song — ohne neue Kartenwahl.' },
};

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

let uid = 0;
function cardId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  uid += 1;
  return `vc-${uid}-${performance.now()}`;
}

/** Baut ein frisches, gemischtes 32-Karten-Deck nach der festen Verteilung. */
export function buildVinylDeck(): VinylCard[] {
  const cards: VinylCard[] = [];
  for (const type of Object.keys(COMPOSITION) as VinylCardType[]) {
    for (let i = 0; i < COMPOSITION[type]; i++) cards.push({ id: cardId(), type });
  }
  return shuffle(cards);
}

/** Starthand-Größe je nach Spielerzahl — bleibt immer aus dem echten 32er-Deck
 *  austeilbar (Puffer von mind. 4 Karten für den Nachziehstapel danach). */
export function vinylHandSize(playerCount: number): number {
  return Math.max(3, Math.min(7, Math.floor((VINYL_DECK_SIZE - 4) / Math.max(1, playerCount))));
}

/**
 * Zieht eine Karte vom Nachziehstapel — mischt die Ablage neu ein, falls der
 * Stapel leer ist. `card` ist nur `null`, wenn wirklich ALLE 32 Karten gerade
 * in Händen sind (Deck UND Ablage leer) — dann verpufft der Zieheffekt statt
 * abzustürzen.
 */
export function drawVinylCard(
  deck: VinylCard[],
  discard: VinylCard[],
): { card: VinylCard | null; deck: VinylCard[]; discard: VinylCard[] } {
  let drawDeck = deck;
  let drawDiscard = discard;
  if (drawDeck.length === 0 && drawDiscard.length > 0) {
    drawDeck = shuffle(drawDiscard);
    drawDiscard = [];
  }
  if (drawDeck.length === 0) return { card: null, deck: drawDeck, discard: drawDiscard };
  const [card, ...rest] = drawDeck;
  return { card, deck: rest, discard: drawDiscard };
}
