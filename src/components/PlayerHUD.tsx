import { memo } from 'react';
import type { Player } from '../types';

type Props = {
  players: Player[];
  currentPlayerId: string;
  targetCards: number;
};

function PlayerHUD({ players, currentPlayerId, targetCards }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      {players.map((p) => {
        const active = p.id === currentPlayerId;
        return (
          <div
            key={p.id}
            className={
              'flex items-center gap-2 rounded-xl px-3 py-2 text-sm ' +
              (active ? 'bg-accent/15 ring-1 ring-accent' : 'bg-panel2')
            }
          >
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
            <span className={active ? 'font-semibold' : ''}>{p.name}</span>
            <span className="text-slate-400">
              {p.cards.length}/{targetCards}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default memo(PlayerHUD);
