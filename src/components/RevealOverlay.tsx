import type { PlacementResult, Track } from '../types';
import { themeById } from '../lib/queue-builder';

type Props = {
  result: PlacementResult;
  onNext: () => void;
};

function sourceLabel(track: Track): string {
  if (track.source === 'friends') return 'aus Friends-Pool';
  const id = track.source.slice('theme:'.length);
  const theme = themeById(id);
  return theme ? `aus Theme: ${theme.name}` : 'aus Theme-Pack';
}

export default function RevealOverlay({ result, onNext }: Props) {
  const { track, correct } = result;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-panel p-8 text-center shadow-2xl">
        {track.albumArt ? (
          <img
            src={track.albumArt}
            alt=""
            className="mx-auto mb-4 h-48 w-48 rounded-2xl object-cover shadow-lg"
          />
        ) : (
          <div className="mx-auto mb-4 flex h-48 w-48 items-center justify-center rounded-2xl bg-panel2 text-6xl">
            🎵
          </div>
        )}
        <div className="mb-2 text-5xl font-extrabold tracking-widest">
          {track.releaseYear || '????'}
          {track.releaseDatePrecision !== 'day' && track.releaseYear > 0 && (
            <span
              className="align-super text-2xl text-accent"
              title="lt. Spotify-Album, kann bei Compilations abweichen"
            >
              *
            </span>
          )}
        </div>
        <div className="text-lg font-semibold">{track.name}</div>
        <div className="text-slate-400">{track.artist}</div>

        <div
          className={
            'mt-6 rounded-xl px-4 py-3 font-bold ' +
            (correct ? 'bg-accent/20 text-accent' : 'bg-red-500/15 text-red-300')
          }
        >
          {correct ? '✓ Richtig platziert! +1 Karte' : '✗ Falsch — keine Karte'}
        </div>

        <div className="mt-3 text-xs text-slate-500">
          {sourceLabel(track)}
          {track.addedById && track.source === 'friends' && (
            <> · hinzugefügt von {track.addedByName ?? track.addedById}</>
          )}
        </div>

        <button className="btn-primary mt-6 w-full" onClick={onNext}>
          Nächste*r Spieler*in →
        </button>
      </div>
    </div>
  );
}
