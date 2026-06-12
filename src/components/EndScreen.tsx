import type { Player } from '../types';
import { ranking } from '../lib/scoring';

type Props = {
  players: Player[];
  onNewRound: () => void;
  onBackToSetup: () => void;
};

const MEDALS = ['🥇', '🥈', '🥉'];

export default function EndScreen({ players, onNewRound, onBackToSetup }: Props) {
  const stats = ranking(players);
  const winner = stats[0];
  const byId = new Map(players.map((p) => [p.id, p]));

  return (
    <div className="space-y-6 text-center">
      <h1 className="text-4xl font-extrabold">
        🏆 {winner ? `${winner.name} gewinnt!` : 'Spielende'}
      </h1>

      <section className="panel mx-auto max-w-md space-y-2 text-left">
        <h2 className="field-label">Endstand</h2>
        {stats.map((s, i) => {
          const p = byId.get(s.playerId);
          return (
            <div key={s.playerId} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-6">{MEDALS[i] ?? `${i + 1}.`}</span>
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: p?.color }}
                />
                {s.name}
              </span>
              <span className="font-semibold">{s.cards} Karten</span>
            </div>
          );
        })}
      </section>

      <section className="panel mx-auto max-w-md space-y-1 text-left text-sm">
        <h2 className="field-label">Stats</h2>
        <div className="text-slate-300">
          Trefferquote:{' '}
          {stats
            .map((s) => `${s.name} ${Math.round(s.accuracy * 100)}%`)
            .join(' · ')}
        </div>
      </section>

      <div className="flex justify-center gap-3">
        <button className="btn-primary" onClick={onNewRound}>
          Neue Runde
        </button>
        <button className="btn-ghost" onClick={onBackToSetup}>
          Zurück zum Setup
        </button>
      </div>
    </div>
  );
}
