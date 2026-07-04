import { useTheme } from '../hooks/useTheme';
import VinylDisc from './theme/VinylDisc';
import WaveformView from './theme/WaveformView';
import RingPlayButton from './theme/RingPlayButton';

type Props = {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  started: boolean;
  onStart: () => void;
  onTogglePlay: () => void;
  disabled?: boolean;
};

function fmt(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlayControls({
  isPlaying,
  positionMs,
  durationMs,
  started,
  onStart,
  onTogglePlay,
  disabled,
}: Props) {
  const t = useTheme();
  const pct = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <VinylDisc spinning={isPlaying} size={104} />
      <WaveformView playing={isPlaying} />

      {!started ? (
        <button
          className="btn-primary flex w-full items-center justify-center gap-2 py-4 text-lg"
          onClick={onStart}
          disabled={disabled}
        >
          ▶ Song starten
        </button>
      ) : (
        <>
          <RingPlayButton isPlaying={isPlaying} progress={pct} onClick={onTogglePlay} disabled={disabled} />
          <div className="flex w-full items-center gap-3 text-xs" style={{ color: t.textMuted }}>
            <span>{fmt(positionMs)}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: `${t.text}1a` }}>
              <div
                className="h-full transition-all"
                style={{ width: `${pct * 100}%`, background: t.accent }}
              />
            </div>
            <span>{fmt(durationMs)}</span>
          </div>
        </>
      )}
    </div>
  );
}
