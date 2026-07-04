import { memo } from 'react';
import type { Player } from '../types';
import { validatedCount } from '../lib/scoring';
import { useTheme } from '../hooks/useTheme';

type Props = {
  players: Player[];
  currentPlayerId: string;
  targetCards: number;
  isVinylUno?: boolean; // Hand-Countdown statt Karten-Ziel anzeigen
  isNameThatTune?: boolean; // validierte statt platzierte Kartenzahl anzeigen
};

function PlayerHUD({ players, currentPlayerId, targetCards, isVinylUno, isNameThatTune }: Props) {
  const t = useTheme();
  return (
    <div className="flex flex-wrap gap-3">
      {players.map((p) => {
        const active = p.id === currentPlayerId;
        const vinylCall = isVinylUno && p.handSize === 1;
        const bank = p.bonusBank ?? 0;
        return (
          <div
            key={p.id}
            className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold"
            style={{
              background: active ? `${p.color}26` : t.surface,
              border: `${active ? 2 : 1}px solid ${active ? p.color : t.surfaceStroke}66`,
              color: t.text,
            }}
          >
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
            <span>{p.name}</span>
            {vinylCall && <span style={{ color: t.highlight }}>🎉 Vinyl!</span>}
            <span style={{ color: t.textMuted }}>
              {isVinylUno
                ? `${p.handSize ?? 0} auf der Hand`
                : isNameThatTune
                  ? `${validatedCount(p)}/${targetCards} validiert`
                  : `${p.cards.length}/${targetCards}`}
            </span>
            {isNameThatTune && bank > 0 && <span style={{ color: t.highlight }}>🎁{bank}</span>}
          </div>
        );
      })}
    </div>
  );
}

export default memo(PlayerHUD);
