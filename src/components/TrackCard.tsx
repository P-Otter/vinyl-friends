import { memo } from 'react';
import type { Track } from '../types';

type Props = {
  track: Track;
  // showYear: im Klassik-Modus zeigt die Timeline das Jahr der bereits gelegten Karten.
  showYear?: boolean;
};

function TrackCard({ track, showYear = true }: Props) {
  return (
    <div className="flex w-24 shrink-0 flex-col items-center rounded-xl bg-panel2 p-2 text-center shadow">
      {track.albumArt ? (
        <img
          src={track.albumArt}
          alt=""
          className="mb-1 h-16 w-16 rounded-lg object-cover"
        />
      ) : (
        <div className="mb-1 flex h-16 w-16 items-center justify-center rounded-lg bg-panel text-2xl">
          🎵
        </div>
      )}
      {showYear && (
        <div className="text-lg font-bold leading-none">
          {track.releaseYear || '–'}
          {track.releaseDatePrecision !== 'day' && track.releaseYear > 0 && (
            <span
              className="text-accent"
              title="lt. Spotify-Album, kann bei Compilations abweichen"
            >
              *
            </span>
          )}
        </div>
      )}
      <div className="mt-1 line-clamp-2 text-[10px] leading-tight text-slate-300">
        {track.name}
      </div>
      <div className="line-clamp-1 text-[10px] text-slate-500">{track.artist}</div>
    </div>
  );
}

// memo: verhindert Neu-Rendern (inkl. Cover-Bild) bei jedem Fortschritts-Tick.
export default memo(TrackCard);
