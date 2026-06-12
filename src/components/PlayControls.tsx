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
  const pct = durationMs > 0 ? Math.min(100, (positionMs / durationMs) * 100) : 0;

  if (!started) {
    return (
      <button className="btn-primary w-full py-6 text-xl" onClick={onStart} disabled={disabled}>
        ▶ Song starten
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <button className="btn-ghost w-full py-4 text-lg" onClick={onTogglePlay} disabled={disabled}>
        {isPlaying ? '⏸ Pause' : '▶ Weiter'}
      </button>
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span>{fmt(positionMs)}</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel2">
          <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span>{fmt(durationMs)}</span>
      </div>
    </div>
  );
}
