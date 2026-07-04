import type { GameMode, Player } from '../types';
import { ranking } from '../lib/scoring';
import { useTheme } from '../hooks/useTheme';
import ThemedTitle from './theme/ThemedTitle';
import Confetti from './theme/Confetti';

type Props = {
  players: Player[];
  mode: GameMode;
  onNewRound: () => void;
  onBackToSetup: () => void;
};

const MEDALS = ['🥇', '🥈', '🥉'];

export default function EndScreen({ players, mode, onNewRound, onBackToSetup }: Props) {
  const t = useTheme();
  const isVinylUno = mode === 'vinyl-uno';
  const isNameThatTune = mode === 'name-that-tune';
  const stats = ranking(players, mode);
  const winner = stats[0];
  const byId = new Map(players.map((p) => [p.id, p]));
  // Bonus-Spalte nur zeigen, wenn im Modus "Wessen Liebling?"/Plattenbörse
  // tatsächlich Bonuspunkte gesammelt wurden.
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
            {isVinylUno
              ? winner.handSize === 0
                ? 'gewinnt — Hand leer! 🎉'
                : `gewinnt mit noch ${winner.handSize} Karte${winner.handSize === 1 ? '' : 'n'} in der Hand`
              : isNameThatTune
                ? `gewinnt mit ${winner.validated ?? 0} validierten Karten`
                : `gewinnt mit ${winner.cards} Karten`}
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
                {isNameThatTune && (p?.bonusBank ?? 0) > 0 && (
                  <span className="text-xs" style={{ color: t.highlight }}>
                    🎁 {p?.bonusBank}
                  </span>
                )}
                {isVinylUno
                  ? `${s.handSize ?? 0} in der Hand`
                  : isNameThatTune
                    ? `${s.validated ?? 0}/${s.cards} validiert`
                    : `${s.cards} Karten`}
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
