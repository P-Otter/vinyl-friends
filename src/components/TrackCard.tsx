import { memo } from 'react';
import type { Track } from '../types';
import { useTheme } from '../hooks/useTheme';

type Props = {
  track: Track;
  accent?: string;
  masked?: boolean; // "Artist & Titel raten": Jahr+Songname verstecken, solange der Rate-Ablauf noch läuft
};

// Textbasierte Karte (Jahr + Farbbalken + Songname) statt Cover-Thumbnail —
// Port von CardFace/"classic" (iOS TimelineCards.swift). Bewusst OHNE Cover:
// das Spielprinzip ist "hören, nicht sehen" (Cover könnte die Ära verraten).
function TrackCard({ track, accent, masked }: Props) {
  const t = useTheme();
  const barColor = accent ?? t.highlight;
  return (
    <div
      className="flex w-24 shrink-0 flex-col items-center gap-1.5 rounded-2xl px-2 py-2.5 text-center"
      style={{ background: t.surface, border: `${t.strokeWidth}px solid ${t.surfaceStroke}`, boxShadow: 'var(--t-shadow)' }}
    >
      <div className="text-xl font-black leading-none" style={{ fontFamily: 'var(--t-font)' }}>
        {masked ? '????' : track.releaseYear || '–'}
        {!masked && track.releaseDatePrecision !== 'day' && track.releaseYear > 0 && (
          <span style={{ color: t.highlight }} title="lt. Album, kann bei Compilations abweichen">
            *
          </span>
        )}
      </div>
      <div className="h-[3px] w-8 rounded-full" style={{ background: barColor }} />
      <div className="line-clamp-2 text-[10px] font-bold leading-tight" style={{ color: t.textMuted }}>
        {masked ? '🎵 ???' : track.name}
      </div>
    </div>
  );
}

// memo: verhindert Neu-Rendern bei jedem Fortschritts-Tick.
export default memo(TrackCard);
