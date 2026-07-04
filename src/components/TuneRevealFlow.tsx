// "Artist & Titel raten": kompletter blinder Rate-Ablauf nach dem Platzieren —
// eigener Jahr/Titel/Artist-Tipp → optionale Steal-Versuche anderer Spieler
// (eigene Platzierung + eigener Tipp) → finale Auflösung. Bleibt bis zum Schluss
// blind (RevealOverlay maskiert Stamp/Jahr/Titel/Artist parallel dazu).
import { useState } from 'react';
import type { BonusGuessResult, PlacementResult, Player } from '../types';
import { resolveTuneRound, sortByYear } from '../lib/scoring';
import { useTheme } from '../hooks/useTheme';
import Timeline from './Timeline';

type Props = {
  result: PlacementResult;
  players: Player[];
  yearTolerance: number;
  onSubmitOwn: (yearGuess: number | null, titleGuess: string, artistGuess: string) => void;
  onSubmitSteal: (
    byPlayerId: string,
    placementGuessIndex: number,
    yearGuess: number | null,
    titleGuess: string,
    artistGuess: string,
  ) => void;
  onFinish: () => void;
};

export default function TuneRevealFlow({
  result,
  players,
  yearTolerance,
  onSubmitOwn,
  onSubmitSteal,
  onFinish,
}: Props) {
  if (!result.bonus) {
    return <TuneFields yearTolerance={yearTolerance} onSubmit={onSubmitOwn} />;
  }
  if (!result.tuneRoundFinished) {
    return (
      <StealPhase
        result={result}
        players={players}
        yearTolerance={yearTolerance}
        onSubmitSteal={onSubmitSteal}
        onFinish={onFinish}
      />
    );
  }
  return <TuneBreakdown result={result} players={players} />;
}

/** Gemeinsames Jahr/Titel/Artist-Formular — für den eigenen Tipp UND jeden Steal-Versuch. */
function TuneFields({
  yearTolerance,
  onSubmit,
}: {
  yearTolerance: number;
  onSubmit: (yearGuess: number | null, titleGuess: string, artistGuess: string) => void;
}) {
  const t = useTheme();
  const [year, setYear] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const hasAnyGuess = year.trim().length > 0 || title.trim().length > 0 || artist.trim().length > 0;
  const fieldStyle = { background: t.background, border: `1px solid ${t.surfaceStroke}66`, color: t.text };
  const submit = () => onSubmit(year.trim() ? Number(year) : null, title, artist);

  return (
    <div className="space-y-2 text-left">
      <p className="text-xs font-black uppercase tracking-widest" style={{ color: t.textMuted }}>
        Jahr, Titel &amp; Artist erraten
      </p>
      <input
        value={year}
        onChange={(e) => setYear(e.target.value)}
        placeholder={`Jahr (±${yearTolerance})`}
        inputMode="numeric"
        className="w-full rounded-lg px-3 py-2 text-sm outline-none"
        style={fieldStyle}
      />
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
      <div className="flex gap-2">
        <button className="btn-ghost flex-1 py-2 text-sm" onClick={() => onSubmit(null, '', '')}>
          Weiß nicht
        </button>
        <button
          className="btn-primary flex-1 py-2 text-sm disabled:opacity-40"
          disabled={!hasAnyGuess}
          onClick={submit}
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

function StealPhase({
  result,
  players,
  yearTolerance,
  onSubmitSteal,
  onFinish,
}: {
  result: PlacementResult;
  players: Player[];
  yearTolerance: number;
  onSubmitSteal: Props['onSubmitSteal'];
  onFinish: () => void;
}) {
  const t = useTheme();
  const [stealerId, setStealerId] = useState<string | null>(null);
  const attempted = new Set((result.steals ?? []).map((s) => s.byPlayerId));
  const eligible = players.filter((p) => p.id !== result.playerId && !attempted.has(p.id));

  if (stealerId) {
    const stealer = players.find((p) => p.id === stealerId);
    if (!stealer) return null;
    return (
      <StealAttemptForm
        stealer={stealer}
        yearTolerance={yearTolerance}
        onCancel={() => setStealerId(null)}
        onSubmit={(gap, year, title, artist) => {
          onSubmitSteal(stealerId, gap, year, title, artist);
          setStealerId(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-3 text-left">
      <p className="text-xs font-black uppercase tracking-widest" style={{ color: t.textMuted }}>
        Eigener Tipp abgegeben ✓
      </p>
      {(result.steals ?? []).length > 0 && (
        <div className="space-y-1">
          {(result.steals ?? []).map((s) => {
            const name = players.find((p) => p.id === s.byPlayerId)?.name ?? '—';
            return (
              <div key={s.byPlayerId} className="flex items-center justify-between text-xs" style={{ color: t.textMuted }}>
                <span>{name}</span>
                <span>
                  {s.placementCorrect ? '📍✓' : '📍✗'} · {s.guess.correctCount}/3 Felder
                </span>
              </div>
            );
          })}
        </div>
      )}
      {eligible.length > 0 && (
        <>
          <p className="text-xs font-bold" style={{ color: t.text }}>
            Will noch jemand raten (klauen)?
          </p>
          <div className="flex flex-wrap gap-2">
            {eligible.map((p) => (
              <button
                key={p.id}
                onClick={() => setStealerId(p.id)}
                className="rounded-full px-3 py-1.5 text-sm font-bold"
                style={{ background: `${p.color}26`, border: `1.5px solid ${p.color}`, color: t.text }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </>
      )}
      <button className="btn-primary w-full" onClick={onFinish}>
        Fertig, auflösen →
      </button>
    </div>
  );
}

function StealAttemptForm({
  stealer,
  yearTolerance,
  onCancel,
  onSubmit,
}: {
  stealer: Player;
  yearTolerance: number;
  onCancel: () => void;
  onSubmit: (gap: number, year: number | null, title: string, artist: string) => void;
}) {
  const t = useTheme();
  const sorted = sortByYear(stealer.cards);
  const [gap, setGap] = useState<number | null>(null);

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-widest" style={{ color: t.textMuted }}>
          Steal-Versuch: {stealer.name}
        </p>
        <button className="text-xs underline" style={{ color: t.textMuted }} onClick={onCancel}>
          zurück
        </button>
      </div>
      <p className="text-xs" style={{ color: t.textMuted }}>
        Wohin gehört der Song in {stealer.name}s eigene Timeline?
      </p>
      <Timeline cards={sorted} selectedGap={gap} onSelectGap={setGap} />
      {gap === null ? (
        <p className="text-[11px]" style={{ color: t.textMuted }}>
          Erst eine Position in der Timeline wählen.
        </p>
      ) : (
        <TuneFields
          yearTolerance={yearTolerance}
          onSubmit={(year, title, artist) => onSubmit(gap, year, title, artist)}
        />
      )}
    </div>
  );
}

function FieldRow({ label, guess, ok, t }: { label: string; guess: string; ok: boolean; t: ReturnType<typeof useTheme> }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span style={{ color: ok ? t.good : t.bad }}>{ok ? '✓' : '✗'}</span>
      <span className="w-12 font-bold" style={{ color: t.textMuted }}>
        {label}
      </span>
      <span className="truncate">{guess || '—'}</span>
    </div>
  );
}

function AttemptCard({ name, guess, t }: { name: string; guess: BonusGuessResult; t: ReturnType<typeof useTheme> }) {
  return (
    <div className="space-y-1 rounded-xl p-3" style={{ background: t.background }}>
      <p className="text-xs font-black" style={{ color: t.text }}>
        {name} — {guess.correctCount}/3
      </p>
      <FieldRow label="Jahr" guess={guess.yearGuess === null ? '' : String(guess.yearGuess)} ok={guess.yearCorrect} t={t} />
      <FieldRow label="Titel" guess={guess.titleGuess} ok={guess.titleCorrect} t={t} />
      <FieldRow label="Artist" guess={guess.artistGuess} ok={guess.artistCorrect} t={t} />
    </div>
  );
}

function TuneBreakdown({ result, players }: { result: PlacementResult; players: Player[] }) {
  const t = useTheme();
  const { bonusWinnerId } = resolveTuneRound(result);
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? '—';
  const stolen = result.finalOwnerId && result.finalOwnerId !== result.playerId;

  return (
    <div className="mt-2 space-y-3 text-left">
      {!result.correct && (
        <div className="rounded-xl px-3 py-2 text-sm font-bold" style={{ background: `${t.bad}1a`, color: t.bad }}>
          {stolen
            ? `📍 Falsch platziert — ${nameOf(result.finalOwnerId!)} hat die Karte richtig einsortiert und übernimmt sie!`
            : '📍 Falsch platziert — niemand hat die richtige Position gefunden, Karte bleibt liegen.'}
        </div>
      )}
      {result.bonus && <AttemptCard name={nameOf(result.playerId)} guess={result.bonus} t={t} />}
      {(result.steals ?? []).map((s) => (
        <AttemptCard key={s.byPlayerId} name={nameOf(s.byPlayerId)} guess={s.guess} t={t} />
      ))}
      <div
        className="rounded-xl px-3 py-2 text-center text-sm font-black"
        style={{ background: bonusWinnerId ? `${t.good}26` : `${t.textMuted}1a`, color: bonusWinnerId ? t.good : t.textMuted }}
      >
        {bonusWinnerId ? `🎁 Validierung geht an ${nameOf(bonusWinnerId)}` : 'Noch nicht validiert — bleibt offen'}
      </div>
    </div>
  );
}
