import type { GameMode, PlacementResult, Player, Track } from '../types';
import { themeById } from '../lib/queue-builder';
import { useTheme } from '../hooks/useTheme';
import Confetti from './theme/Confetti';
import FaveGuessRow from './FaveGuessRow';
import TuneGuessForm from './TuneGuessForm';
import VinylEventBanner from './VinylEventBanner';

type Props = {
  result: PlacementResult;
  onNext: () => void;
  mode: GameMode;
  players: Player[];
  wagerEnabled: boolean;
  onAwardFaveGuess: (playerId: string) => void;
  onSubmitTuneGuess: (titleGuess: string, artistGuess: string, wagered: boolean) => void;
};

function sourceLabel(track: Track): string {
  if (track.source === 'friends') return 'aus Friends-Pool';
  if (track.source === 'local') return 'aus deinem Pool';
  const id = track.source.slice('theme:'.length);
  const theme = themeById(id);
  return theme ? `aus Theme: ${theme.name}` : 'aus Theme-Pack';
}

export default function RevealOverlay({
  result,
  onNext,
  mode,
  players,
  wagerEnabled,
  onAwardFaveGuess,
  onSubmitTuneGuess,
}: Props) {
  const { track, correct } = result;
  const t = useTheme();
  const stampColor = correct ? t.good : t.bad;
  // "Artist & Titel raten": Titel/Artist erst zeigen, NACHDEM geraten wurde —
  // sonst steht die Lösung über dem eigenen Rateformular.
  const tuneGuessPending = mode === 'name-that-tune' && correct && !result.bonus;

  return (
    // overflow-y-auto + min-h-full: auf kleinen Viewports (iPhone quer) wird
    // das Overlay scrollbar, statt den Weiter-Button oben/unten abzuschneiden.
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60">
      {correct && <Confetti />}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="w-full max-w-sm rounded-3xl p-8 text-center"
          style={{ background: t.surface, border: `${t.strokeWidth}px solid ${t.surfaceStroke}`, boxShadow: 'var(--t-shadow)' }}
        >
          <div
            className="mx-auto mb-4 inline-block -rotate-6 rounded-lg px-4 py-1.5 text-xl font-black"
            style={{ border: `3px solid ${stampColor}`, color: stampColor }}
          >
            {correct ? 'RICHTIG!' : 'DANEBEN!'}
          </div>

          <div className="mb-1 text-6xl font-black tracking-wide" style={{ fontFamily: 'var(--t-font)' }}>
            {track.releaseYear || '????'}
            {track.source !== 'local' &&
              track.releaseDatePrecision !== 'day' &&
              track.releaseYear > 0 && (
                <span
                  className="align-super text-2xl"
                  style={{ color: t.highlight }}
                  title="lt. Spotify-Album, kann bei Compilations abweichen"
                >
                  *
                </span>
              )}
          </div>
          <div className="text-lg font-bold">{tuneGuessPending ? '🎵 ???' : track.name}</div>
          <div style={{ color: t.textMuted }}>
            {tuneGuessPending ? 'Erst raten, dann auflösen ↓' : track.artist}
          </div>

          <div
            className="mt-6 rounded-xl px-4 py-3 font-bold"
            style={{ background: `${stampColor}26`, color: stampColor }}
          >
            {mode === 'vinyl-uno'
              ? correct
                ? '✓ Richtig! Eine Karte weniger auf der Hand'
                : '✗ Falsch — eine Karte dazugezogen'
              : correct
                ? '✓ Richtig platziert! +1 Karte'
                : '✗ Falsch — keine Karte'}
          </div>

          <div className="mt-3 text-xs" style={{ color: t.textMuted }}>
            {sourceLabel(track)}
            {track.addedById && track.source === 'friends' && (
              <> · hinzugefügt von {track.addedByName ?? track.addedById}</>
            )}
          </div>

          {mode === 'whose-fave' && track.source === 'friends' && track.addedById && (
            <FaveGuessRow players={players} onAward={onAwardFaveGuess} />
          )}

          {mode === 'name-that-tune' && correct && (
            <TuneGuessForm bonus={result.bonus} wagerEnabled={wagerEnabled} onSubmit={onSubmitTuneGuess} />
          )}

          {mode === 'plattenboerse' && result.decade !== undefined && (
            <div className="mt-4 text-sm font-bold" style={{ color: t.highlight }}>
              🎫 +1 {String(result.decade).slice(2)}er-Marke fürs Depot
            </div>
          )}

          {mode === 'vinyl-uno' && result.vinylEvent && (
            <VinylEventBanner event={result.vinylEvent} players={players} />
          )}

          <button className="btn-primary mt-6 w-full" onClick={onNext}>
            Nächste*r Spieler*in →
          </button>
        </div>
      </div>
    </div>
  );
}
