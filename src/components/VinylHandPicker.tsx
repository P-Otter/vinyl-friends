// "Vinyl!": vor jedem Song erst eine Handkarte wählen. Privacy-Gate davor
// (Bildschirm zur aktiven Person drehen), damit die Hand nur ihr sichtbar ist.
import { useState } from 'react';
import type { Player } from '../types';
import { VINYL_CARD_INFO } from '../lib/vinylDeck';
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

  return (
    <section className="panel space-y-3">
      <p className="field-label mb-0" style={{ color: activePlayer.color }}>
        {activePlayer.name}s Hand — eine Karte für diese Runde wählen
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {hand.map((card) => {
          const info = VINYL_CARD_INFO[card.type];
          return (
            <button
              key={card.id}
              className="flex flex-col items-center gap-1 rounded-xl p-3 text-center"
              style={{ background: t.background, border: `1px solid ${t.surfaceStroke}66` }}
              onClick={() => (card.type === 'wish-decade' ? setWishCardId(card.id) : onSelectCard(card.id))}
            >
              <span className="text-2xl">{info.emoji}</span>
              <span className="text-xs font-bold">{info.label}</span>
              <span className="text-[10px]" style={{ color: t.textMuted }}>
                {info.hint}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
