import type { Player } from '../types';
import { ranking } from '../lib/scoring';
import { useTheme } from '../hooks/useTheme';
import ThemedTitle from './theme/ThemedTitle';
import Confetti from './theme/Confetti';

type Props = {
  players: Player[];
  onNewRound: () => void;
  onBackToSetup: () => void;
};

const MEDALS = ['🥇', '🥈', '🥉'];

export default function EndScreen({ players, onNewRound, onBackToSetup }: Props) {
  const t = useTheme();
  const stats = ranking(players);
  const winner = stats[0];
  const byId = new Map(players.map((p) => [p.id, p]));
  // Bonus-Spalte nur zeigen, wenn im Modus "Wessen Liebling?"/"Artist & Titel
  // raten" tatsächlich Bonuspunkte gesammelt wurden — sonst unnötiges "0" überall.
  const hasBonus = stats.some((s) => s.bonusPoints > 0);

  return (
    <div className="space-y-6 text-center">
      {winner && <Confetti />}
      <ThemedTitle size={34} className="mx-auto">
        {t.uppercaseTitles ? 'SPIEL VORBEI!' : 'Spiel vorbei!'}
      </ThemedTitle>

      {winner && (
        <div className="mx-auto max-w-md space-y-1">
          <span className="text-3xl" style={{ color: t.highlight }}>
            ♛
          </span>
          <div className="text-2xl font-black" style={{ color: byId.get(winner.playerId)?.color ?? t.text }}>
            {winner.name}
          </div>
          <div className="text-sm font-semibold" style={{ color: t.textMuted }}>
            gewinnt mit {winner.cards} Karten
          </div>
        </div>
      )}

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
              <span className="flex items-center gap-2 font-semibold">
                {hasBonus && s.bonusPoints > 0 && (
                  <span className="text-xs" style={{ color: t.highlight }}>
                    🎯 {s.bonusPoints}
                  </span>
                )}
                {s.cards} Karten
              </span>
            </div>
          );
        })}
      </section>

      <section className="panel mx-auto max-w-md space-y-1 text-left text-sm">
        <h2 className="field-label">Stats</h2>
        <div style={{ color: t.textMuted }}>
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
