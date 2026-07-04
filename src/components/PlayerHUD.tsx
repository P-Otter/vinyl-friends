import { memo } from 'react';
import type { Player } from '../types';
import { useTheme } from '../hooks/useTheme';

type Props = {
  players: Player[];
  currentPlayerId: string;
  targetCards: number;
};

function PlayerHUD({ players, currentPlayerId, targetCards }: Props) {
  const t = useTheme();
  return (
    <div className="flex flex-wrap gap-3">
      {players.map((p) => {
        const active = p.id === currentPlayerId;
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
            <span style={{ color: t.textMuted }}>
              {p.cards.length}/{targetCards}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default memo(PlayerHUD);
