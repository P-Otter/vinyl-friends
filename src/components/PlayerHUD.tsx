import { memo } from 'react';
import type { Player } from '../types';
import { validatedCount } from '../lib/scoring';
import { useTheme } from '../hooks/useTheme';

type Props = {
  players: Player[];
  currentPlayerId: string;
  targetCards: number;
  isVinylUno?: boolean; // Hand-Countdown MIT Karten-Sondereffekten ("🎉 Vinyl!"-Ruf bei 1 Karte)
  isPlusMinus?: boolean; // Hand-Countdown OHNE Sondereffekte (nur -1/+1)
  isNameThatTune?: boolean; // zusätzlich validierte Kartenzahl anzeigen
  requiredMastered?: number; // nur "name-that-tune": Ziel für validierte Karten
};

function PlayerHUD({
  players,
  currentPlayerId,
  targetCards,
  isVinylUno,
  isPlusMinus,
  isNameThatTune,
  requiredMastered,
}: Props) {
  const t = useTheme();
  const isHandCountdown = isVinylUno || isPlusMinus;
  return (
    <div className="flex flex-wrap gap-3">
      {players.map((p) => {
        const active = p.id === currentPlayerId;
        const handCount = p.hand?.length ?? 0;
        const lastCardCall = isHandCountdown && handCount === 1;
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
            {lastCardCall && (
              <span style={{ color: t.highlight }}>🎉 {isVinylUno ? 'Vinyl!' : 'Letzte Karte!'}</span>
            )}
            <span style={{ color: t.textMuted }}>
              {isHandCountdown ? `${handCount} auf der Hand` : `${p.cards.length}/${targetCards}`}
            </span>
            {isNameThatTune && (
              <span style={{ color: t.highlight }}>
                · {validatedCount(p)}/{requiredMastered ?? targetCards} validiert
              </span>
            )}
            {isNameThatTune && bank > 0 && <span style={{ color: t.highlight }}>🎁{bank}</span>}
          </div>
        );
      })}
    </div>
  );
}

export default memo(PlayerHUD);
