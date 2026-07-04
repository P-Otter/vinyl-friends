// Play/Pause mit umlaufendem Fortschritts-Ring — Port von playButton (iOS GameView).
import { useTheme } from '../../hooks/useTheme';

type Props = {
  isPlaying: boolean;
  progress: number; // 0..1
  onClick: () => void;
  disabled?: boolean;
  size?: number;
};

export default function RingPlayButton({ isPlaying, progress, onClick, disabled, size = 72 }: Props) {
  const t = useTheme();
  const r = 32;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, progress)));

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative flex items-center justify-center rounded-full disabled:opacity-40"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox="0 0 72 72" className="absolute inset-0 -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke={t.text} strokeOpacity={0.15} strokeWidth={4} />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={t.highlight}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s linear' }}
        />
      </svg>
      <span
        className="flex items-center justify-center rounded-full"
        style={{ width: size - 14, height: size - 14, background: t.accent, boxShadow: 'var(--t-shadow)' }}
      >
        <span style={{ color: t.onAccent, fontSize: size * 0.28, lineHeight: 1 }}>
          {isPlaying ? '⏸' : '▶'}
        </span>
      </span>
    </button>
  );
}
