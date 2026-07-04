// "Wessen Liebling?"-Bonus: die Gruppe ruft laut, wer den Song gepusht hat —
// der Host tippt danach den Namen an. Keine digitale Verifikation nötig (der
// aufgelöste echte Name steht ja direkt drüber), das hier ist nur die Punktevergabe.
import { useState } from 'react';
import type { Player } from '../types';
import { useTheme } from '../hooks/useTheme';

type Props = {
  players: Player[];
  onAward: (playerId: string) => void;
};

export default function FaveGuessRow({ players, onAward }: Props) {
  const t = useTheme();
  const [awardedTo, setAwardedTo] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(false);

  const pick = (id: string) => {
    setAwardedTo(id);
    onAward(id);
  };

  if (awardedTo) {
    const winner = players.find((p) => p.id === awardedTo);
    return (
      <div className="mt-4 rounded-xl px-4 py-3 text-sm font-bold" style={{ background: `${t.good}26`, color: t.good }}>
        ✓ Bonuspunkt für {winner?.name ?? '—'}
      </div>
    );
  }
  if (skipped) {
    return (
      <p className="mt-4 text-xs" style={{ color: t.textMuted }}>
        Niemand hat's erraten — kein Bonus diese Runde.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-2 text-left">
      <p className="text-xs font-black uppercase tracking-widest" style={{ color: t.textMuted }}>
        Wer hat's zuerst richtig erraten? (Bonus)
      </p>
      <div className="flex flex-wrap gap-2">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => pick(p.id)}
            className="rounded-full px-3 py-1.5 text-sm font-bold"
            style={{ background: `${p.color}26`, border: `1.5px solid ${p.color}`, color: t.text }}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={() => setSkipped(true)}
          className="rounded-full px-3 py-1.5 text-sm"
          style={{ color: t.textMuted, border: `1.5px solid ${t.surfaceStroke}66` }}
        >
          Niemand
        </button>
      </div>
    </div>
  );
}
