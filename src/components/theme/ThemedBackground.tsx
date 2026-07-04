// App-Hintergrund mit Theme-Dekoration — Port von ThemedBackground (iOS Theme.swift).
import { useTheme } from '../../hooks/useTheme';

export default function ThemedBackground() {
  const t = useTheme();
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden"
      style={{ background: t.background }}
      aria-hidden
    >
      {t.decoration === 'ripples' && <Ripples color={t.decorationColor} />}
      {t.decoration === 'splatter' && <Splatter color={t.decorationColor} />}
      {t.decoration === 'comicNotes' && <CommicNotes color={t.decorationColor} />}
    </div>
  );
}

function Ripples({ color }: { color: string }) {
  const cluster = (cx: number, cy: number, base: number) => (
    <g key={`${cx}-${cy}`}>
      {[0, 1, 2, 3].map((i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={base + i * 40}
          fill="none"
          stroke={color}
          strokeOpacity={0.07}
          strokeWidth={2}
        />
      ))}
    </g>
  );
  return (
    <svg className="h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 800">
      {cluster(40, 60, 110)}
      {cluster(380, 700, 140)}
    </svg>
  );
}

function Splatter({ color }: { color: string }) {
  return (
    <svg className="h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 800">
      <g transform="translate(345,70) rotate(10)" opacity={0.9}>
        <ellipse cx="0" cy="0" rx="48" ry="31" fill={color} />
        <ellipse cx="42" cy="26" rx="26" ry="37" fill={color} transform="rotate(-14 42 26)" />
        <ellipse cx="-48" cy="32" rx="19" ry="15" fill={color} />
        <circle cx="-62" cy="-18" r="7" fill={color} />
        <circle cx="64" cy="-32" r="4" fill={color} />
      </g>
      <g transform="translate(45,720) rotate(150) scale(0.7)" opacity={0.9}>
        <ellipse cx="0" cy="0" rx="48" ry="31" fill={color} />
        <ellipse cx="42" cy="26" rx="26" ry="37" fill={color} transform="rotate(-14 42 26)" />
        <circle cx="-62" cy="-18" r="7" fill={color} />
      </g>
      {[
        [30, 220], [55, 340], [15, 460], [370, 180], [350, 260], [378, 400], [320, 520], [90, 40],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3 + (i % 3)} fill={color} opacity={0.6} />
      ))}
    </svg>
  );
}

function CommicNotes({ color }: { color: string }) {
  const notes = [
    [40, 90], [340, 60], [370, 640], [30, 700], [200, 40],
  ];
  return (
    <svg className="h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 800">
      {notes.map(([x, y], i) => (
        <text key={i} x={x} y={y} fontSize={i % 2 ? 22 : 16} fill={color} opacity={0.15}>
          ♪
        </text>
      ))}
    </svg>
  );
}
