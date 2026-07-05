import type { GameMode, PlacementResult, Player, Track } from '../types';
import { themeById } from '../lib/queue-builder';
import { useTheme } from '../hooks/useTheme';
import Confetti from './theme/Confetti';
import FaveGuessRow from './FaveGuessRow';
import TuneRevealFlow from './TuneRevealFlow';
import VinylCardResult from './VinylCardResult';

type Props = {
  result: PlacementResult;
  onNext: () => void;
  mode: GameMode;
  players: Player[];
  masteryThreshold: number;
  onAwardFaveGuess: (playerId: string) => void;
  onSubmitTuneGuess: (yearGuess: number | null, titleGuess: string, artistGuess: string) => void;
  onSubmitTuneSteal: (
    byPlayerId: string,
    placementGuessIndex: number,
    yearGuess: number | null,
    titleGuess: string,
    artistGuess: string,
  ) => void;
  onFinishTuneRound: () => void;
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
  masteryThreshold,
  onAwardFaveGuess,
  onSubmitTuneGuess,
  onSubmitTuneSteal,
  onFinishTuneRound,
}: Props) {
  const { track, correct } = result;
  const t = useTheme();
  // "Artist & Titel raten": Platzierung UND Jahr/Titel/Artist bleiben komplett
  // verborgen, bis der ganze Rate-/Steal-Ablauf abgeschlossen ist — sonst steht
  // die Lösung (oder zumindest ob's richtig war) über dem Rateformular.
  const tunePending = mode === 'name-that-tune' && !result.tuneRoundFinished;
  const stampColor = tunePending ? t.highlight : correct ? t.good : t.bad;
  // In den Hand-Countdown-Modi (Sieg = leere Hand) ist die Timeline-Kartenzahl
  // NICHT die Sieg-Metrik — die generische "+1 Karte"-Zeile würde dort neben der
  // "−1 Karte auf der Hand"-Zeile stehen und widersprüchlich wirken. Deshalb dort
  // ohne die Karten-Zahl formulieren; die Hand-Änderung zeigt der modusspezifische Block.
  const isHandCountdown = mode === 'vinyl-uno' || mode === 'plus-minus';

  return (
    // overflow-y-auto + min-h-full: auf kleinen Viewports (iPhone quer) wird
    // das Overlay scrollbar, statt den Weiter-Button oben/unten abzuschneiden.
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60">
      {correct && !tunePending && <Confetti />}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="w-full max-w-sm rounded-3xl p-8 text-center"
          style={{ background: t.surface, border: `${t.strokeWidth}px solid ${t.surfaceStroke}`, boxShadow: 'var(--t-shadow)' }}
        >
          <div
            className="mx-auto mb-4 inline-block -rotate-6 rounded-lg px-4 py-1.5 text-xl font-black"
            style={{ border: `3px solid ${stampColor}`, color: stampColor }}
          >
            {tunePending ? 'WIRD GEPRÜFT…' : correct ? 'RICHTIG!' : 'DANEBEN!'}
          </div>

          <div className="mb-1 text-6xl font-black tracking-wide" style={{ fontFamily: 'var(--t-font)' }}>
            {tunePending ? '????' : track.releaseYear || '????'}
            {!tunePending &&
              track.source !== 'local' &&
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
          <div className="text-lg font-bold">{tunePending ? '🎵 ???' : track.name}</div>
          <div style={{ color: t.textMuted }}>
            {tunePending ? 'Erst raten, dann auflösen ↓' : track.artist}
          </div>

          {!tunePending && (
            <div
              className="mt-6 rounded-xl px-4 py-3 font-bold"
              style={{ background: `${stampColor}26`, color: stampColor }}
            >
              {isHandCountdown
                ? correct
                  ? '✓ Richtig platziert!'
                  : '✗ Daneben platziert'
                : correct
                  ? '✓ Richtig platziert! +1 Karte'
                  : '✗ Falsch — keine Karte'}
            </div>
          )}

          <div className="mt-3 text-xs" style={{ color: t.textMuted }}>
            {sourceLabel(track)}
            {track.addedById && track.source === 'friends' && (
              <> · hinzugefügt von {track.addedByName ?? track.addedById}</>
            )}
          </div>

          {mode === 'whose-fave' && track.source === 'friends' && track.addedById && (
            <FaveGuessRow players={players} onAward={onAwardFaveGuess} />
          )}

          {mode === 'name-that-tune' && (
            <div className="mt-4">
              <TuneRevealFlow
                result={result}
                players={players}
                masteryThreshold={masteryThreshold}
                onSubmitOwn={onSubmitTuneGuess}
                onSubmitSteal={onSubmitTuneSteal}
                onFinish={onFinishTuneRound}
              />
            </div>
          )}

          {mode === 'plattenboerse' && result.decade !== undefined && (
            <div className="mt-4 text-sm font-bold" style={{ color: t.highlight }}>
              🎫 +1 {String(result.decade).slice(2)}er-Marke fürs Depot
            </div>
          )}

          {mode === 'vinyl-uno' && result.vinylPlay && (
            <VinylCardResult vinylPlay={result.vinylPlay} players={players} />
          )}

          {mode === 'plus-minus' && (
            <div
              className="mt-4 rounded-xl px-4 py-3 text-sm font-bold"
              style={{ background: `${stampColor}26`, color: stampColor }}
            >
              {correct ? '−1 Karte auf der Hand' : '+1 Karte auf der Hand'}
            </div>
          )}

          {!tunePending && (
            <button className="btn-primary mt-6 w-full" onClick={onNext}>
              Weiter →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
