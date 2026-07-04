// "Artist & Titel raten"-Bonus — Port des iOS-Bonus-Systems (BonusGuessView):
// nach korrekter Platzierung Titel/Künstler raten, optional mit Confidence-Wager.
import { useState } from 'react';
import type { BonusGuessResult } from '../types';
import { useTheme } from '../hooks/useTheme';

type Props = {
  bonus?: BonusGuessResult; // gesetzt sobald abgeschickt — dann nur noch Ergebnis anzeigen
  wagerEnabled: boolean;
  onSubmit: (titleGuess: string, artistGuess: string, wagered: boolean) => void;
};

export default function TuneGuessForm({ bonus, wagerEnabled, onSubmit }: Props) {
  const t = useTheme();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [wagered, setWagered] = useState(false);

  if (bonus) {
    return (
      <div className="mt-4 space-y-1.5 text-left">
        <BonusRow label="Titel" guess={bonus.titleGuess} ok={bonus.titleCorrect} t={t} />
        <BonusRow label="Artist" guess={bonus.artistGuess} ok={bonus.artistCorrect} t={t} />
        <div
          className="pt-1 text-center text-sm font-black"
          style={{ color: bonus.mastered ? t.good : t.textMuted }}
        >
          {bonus.mastered
            ? `GEMEISTERT ★${bonus.wagered ? ' (verdoppelt)' : ''}`
            : bonus.wagered
              ? 'Falsch gewettet — Karte verloren'
              : 'Nicht gemeistert'}
        </div>
      </div>
    );
  }
  const hasAnyGuess = title.trim().length > 0 || artist.trim().length > 0;
  const fieldStyle = {
    background: t.background,
    border: `1px solid ${t.surfaceStroke}66`,
    color: t.text,
  };

  return (
    <div className="mt-4 space-y-2 text-left">
      <p className="text-xs font-black uppercase tracking-widest" style={{ color: t.textMuted }}>
        Bonus: Titel &amp; Artist erraten
      </p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titel"
        className="w-full rounded-lg px-3 py-2 text-sm outline-none"
        style={fieldStyle}
      />
      <input
        value={artist}
        onChange={(e) => setArtist(e.target.value)}
        placeholder="Artist"
        className="w-full rounded-lg px-3 py-2 text-sm outline-none"
        style={fieldStyle}
      />
      {wagerEnabled && (
        <label className="flex items-center gap-2 text-xs" style={{ color: t.textMuted }}>
          <input type="checkbox" checked={wagered} onChange={(e) => setWagered(e.target.checked)} />
          Ich wette drauf! (beide richtig = doppelter Bonus, falsch = Karte weg)
        </label>
      )}
      <div className="flex gap-2">
        <button
          className="btn-ghost flex-1 py-2 text-sm"
          onClick={() => onSubmit('', '', false)}
        >
          Weiß nicht
        </button>
        <button
          className="btn-primary flex-1 py-2 text-sm disabled:opacity-40"
          disabled={!hasAnyGuess}
          onClick={() => onSubmit(title, artist, wagered)}
        >
          Auflösen
        </button>
      </div>
      {!hasAnyGuess && (
        <p className="text-[11px]" style={{ color: t.textMuted }}>
          Mindestens ein Feld ausfüllen — sonst „Weiß nicht" tippen.
        </p>
      )}
    </div>
  );
}

function BonusRow({
  label,
  guess,
  ok,
  t,
}: {
  label: string;
  guess: string;
  ok: boolean;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span style={{ color: ok ? t.good : t.bad }}>{ok ? '✓' : '✗'}</span>
      <span className="w-14 font-bold" style={{ color: t.textMuted }}>
        {label}
      </span>
      <span className="truncate">{guess || '—'}</span>
    </div>
  );
}
