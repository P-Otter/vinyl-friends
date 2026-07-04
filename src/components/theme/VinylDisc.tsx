// Schallplatte im Theme-Stil — Port von ios/Sources/Util/Theme.swift (VinylView).
// SVG statt SwiftUI-Shapes, gleiche Geometrie/Verhältnisse.
import { memo } from 'react';
import { useTheme } from '../../hooks/useTheme';

type Props = {
  spinning?: boolean;
  size?: number;
};

// memo: PlayControls (der Parent) rendert bei jedem Audio-Positions-Tick neu
// (mehrmals/Sekunde) — die Scheibe hängt nur an `spinning`/`size`, nicht an der
// Position, und soll die SVG-Baumarbeit nicht bei jedem Tick wiederholen.
function VinylDisc({ spinning = false, size = 140 }: Props) {
  const t = useTheme();
  const isLabelStyle = t.vinylStyle !== 'classic';

  return (
    <div
      style={{ width: size, height: size }}
      className={spinning ? 'animate-[spin_2.4s_linear_infinite]' : ''}
    >
      <svg width={size} height={size} viewBox="0 0 200 200">
        {isLabelStyle ? <LabelDisc t={t} /> : <ClassicDisc t={t} />}
      </svg>
    </div>
  );
}

function ClassicDisc({ t }: { t: ReturnType<typeof useTheme> }) {
  // Kein Theme kombiniert aktuell vinylStyle:'classic' mit colorScheme:'dark' —
  // Fallback bleibt trotzdem theme-abgeleitet statt eines hartcodierten Hex-Werts.
  const discFill = t.colorScheme === 'light' ? t.text : t.surface;
  return (
    <>
      <circle cx="100" cy="100" r="100" fill={discFill} />
      {[1, 2, 3].map((ring) => (
        <circle
          key={ring}
          cx="100"
          cy="100"
          r={100 - ring * 18}
          fill="none"
          stroke={t.background}
          strokeOpacity={0.22}
          strokeWidth={2}
        />
      ))}
      <circle cx="100" cy="100" r="34" fill={t.accent} />
      {t.strokeWidth > 0 && (
        <circle cx="100" cy="100" r="34" fill="none" stroke={t.surfaceStroke} strokeWidth={2} />
      )}
      <text
        x="100"
        y="107"
        textAnchor="middle"
        fontSize="20"
        fontWeight={900}
        fill={t.onAccent}
      >
        ♪
      </text>
    </>
  );
}

/** Vereint whiteLabelDisc + nightLabelDisc (iOS) — Ring-Label-Platte mit
 *  "VINYL"/"FRIENDS"-Schriftzug, für vinyl1979/vinylNight/comic-Themes. */
function LabelDisc({ t }: { t: ReturnType<typeof useTheme> }) {
  const disc = t.colorScheme === 'light' ? t.background : t.text;
  const line = t.colorScheme === 'light' ? t.text : t.background;
  return (
    <>
      <circle cx="100" cy="100" r="98" fill={disc} stroke={line} strokeWidth={2.5} />
      {[0, 1, 2, 3, 4, 5].map((ring) => (
        <circle
          key={ring}
          cx="100"
          cy="100"
          r={88 - ring * 6}
          fill="none"
          stroke={line}
          strokeOpacity={0.45}
          strokeWidth={0.8}
        />
      ))}
      <circle cx="100" cy="100" r="46" fill={disc} stroke={line} strokeWidth={1.3} />
      <text x="100" y="88" textAnchor="middle" fontSize="11" fontWeight={600} letterSpacing="1" fill={line}>
        VINYL
      </text>
      <text x="100" y="118" textAnchor="middle" fontSize="11" fontWeight={600} letterSpacing="1" fill={line}>
        FRIENDS
      </text>
      <circle cx="100" cy="100" r="4.5" fill={line} />
    </>
  );
}

export default memo(VinylDisc);
