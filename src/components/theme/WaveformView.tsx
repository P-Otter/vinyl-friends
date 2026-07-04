// Tanzende Equalizer-Balken — Port von WaveformView (iOS Theme.swift).
import { memo } from 'react';
import { useTheme } from '../../hooks/useTheme';

const HEIGHTS = [16, 30, 22, 40, 26, 36, 14];

// memo: hängt nur an `playing`, nicht an der Audio-Position — soll nicht bei
// jedem Positions-Tick des Parents (PlayControls) neu aufgebaut werden.
function WaveformView({ playing }: { playing: boolean }) {
  const t = useTheme();
  return (
    <div className="flex h-11 items-center justify-center gap-[5px]">
      {HEIGHTS.map((h, i) => (
        <span
          key={i}
          className="w-[5px] rounded-full transition-all"
          style={{
            height: playing ? h : 8,
            background: t.accent,
            transitionDuration: '450ms',
            transitionDelay: playing ? `${i * 70}ms` : '0ms',
            animation: playing ? `vf-bounce 0.9s ease-in-out ${i * 0.07}s infinite alternate` : 'none',
          }}
        />
      ))}
    </div>
  );
}

export default memo(WaveformView);
