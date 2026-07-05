// "Vinyl!": vor jedem Song erst eine Handkarte wählen. Privacy-Gate davor
// (Bildschirm zur aktiven Person drehen), damit die Hand nur ihr sichtbar ist.
import { useState, type CSSProperties } from 'react';
import type { Player } from '../types';
import { VINYL_CARD_INFO, VINYL_CARD_TYPE_ORDER } from '../lib/vinylDeck';
import { useTheme } from '../hooks/useTheme';

type Props = {
  activePlayer: Player;
  screenTurned: boolean;
  decadeOptions: number[]; // Jahrzehnte, die im Rest der Queue noch vorkommen
  onConfirmScreenTurned: () => void;
  onSelectCard: (cardId: string, wishDecade?: number) => void;
};

export default function VinylHandPicker({
  activePlayer,
  screenTurned,
  decadeOptions,
  onConfirmScreenTurned,
  onSelectCard,
}: Props) {
  const t = useTheme();
  const [wishCardId, setWishCardId] = useState<string | null>(null);

  if (!screenTurned) {
    return (
      <section className="panel space-y-4 text-center">
        <p className="text-lg font-black" style={{ color: activePlayer.color }}>
          📱 Bildschirm zu {activePlayer.name} drehen!
        </p>
        <p className="text-sm" style={{ color: t.textMuted }}>
          Alle anderen dürfen die Handkarten gleich nicht sehen.
        </p>
        <button className="btn-primary w-full" onClick={onConfirmScreenTurned}>
          👀 Bereit — Karten zeigen
        </button>
      </section>
    );
  }

  if (wishCardId) {
    return (
      <section className="panel space-y-3">
        <p className="field-label mb-0">🔮 Welches Jahrzehnt wünschst du dir?</p>
        <p className="text-xs" style={{ color: t.textMuted }}>
          Der nächste Song kommt garantiert aus diesem Jahrzehnt.
        </p>
        <div className="flex flex-wrap gap-2">
          {decadeOptions.map((d) => (
            <button
              key={d}
              className="rounded-full px-4 py-2 text-sm font-bold"
              style={{ background: `${t.highlight}26`, border: `1.5px solid ${t.highlight}`, color: t.text }}
              onClick={() => onSelectCard(wishCardId, d)}
            >
              {d}er
            </button>
          ))}
        </div>
        {decadeOptions.length === 0 && (
          <p className="text-xs" style={{ color: t.textMuted }}>
            Keine Jahrzehnte mehr übrig — wähl stattdessen eine andere Karte.
          </p>
        )}
        <button className="btn-ghost w-full" onClick={() => setWishCardId(null)}>
          ← zurück zur Hand
        </button>
      </section>
    );
  }

  const hand = activePlayer.hand ?? [];
  // Wie eine echte Fächerhand: mittlere Karte gerade, Rand-Karten kippen nach
  // außen (Rotationswinkel gedeckelt, sonst würden große Hände nach Straf-
  // karten albern aussehen).
  const mid = (hand.length - 1) / 2;

  return (
    <section className="panel space-y-3">
      <p className="field-label mb-0" style={{ color: activePlayer.color }}>
        {activePlayer.name}s Hand — eine Karte für diese Runde wählen
      </p>
      <div className="overflow-x-auto overflow-y-visible px-6 pb-3 pt-8">
        <div className="flex w-max justify-center">
          {hand.map((card, i) => {
            const info = VINYL_CARD_INFO[card.type];
            const typeColor = t.playerColors[VINYL_CARD_TYPE_ORDER.indexOf(card.type) % t.playerColors.length];
            const rotation = Math.max(-16, Math.min(16, (i - mid) * 7));
            return (
              <button
                key={card.id}
                className="vinyl-card flex w-[92px] shrink-0 flex-col items-center gap-1 rounded-2xl p-2.5 text-center"
                style={{
                  '--card-rot': `${rotation}deg`,
                  zIndex: i,
                  background: `linear-gradient(to bottom, ${t.surface}, ${typeColor}26)`,
                  border: `${t.strokeWidth}px solid ${typeColor}b3`,
                  borderTop: `5px solid ${typeColor}`,
                  boxShadow: 'var(--t-shadow)',
                } as CSSProperties}
                onClick={() => (card.type === 'wish-decade' ? setWishCardId(card.id) : onSelectCard(card.id))}
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-full text-2xl"
                  style={{ background: `${typeColor}40` }}
                >
                  {info.emoji}
                </span>
                <span className="text-[11px] font-black leading-tight" style={{ color: t.text }}>
                  {info.label}
                </span>
                <span className="text-[9px] leading-tight" style={{ color: t.textMuted }}>
                  {info.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
