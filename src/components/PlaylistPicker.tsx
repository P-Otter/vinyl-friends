import { useEffect, useState } from 'react';
import { getMyPlaylists, playlistTrackTotal, type SpotifyPlaylist } from '../lib/spotify-api';

type Props = {
  value: string;
  onChange: (id: string, name: string, total: number) => void;
};

export default function PlaylistPicker({ value, onChange }: Props) {
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyPlaylists()
      .then(setPlaylists)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) return <p className="text-sm text-red-400">Playlists laden fehlgeschlagen: {error}</p>;
  if (!playlists) return <p className="text-sm text-slate-400">Lade deine Playlists…</p>;
  if (playlists.length === 0)
    return <p className="text-sm text-slate-400">Keine Playlists gefunden.</p>;

  return (
    <select
      className="w-full rounded-xl bg-panel2 px-4 py-3 text-slate-100 outline-none ring-accent/50 focus:ring-2"
      value={value}
      onChange={(e) => {
        const pl = playlists.find((p) => p.id === e.target.value);
        if (pl) onChange(pl.id, pl.name, playlistTrackTotal(pl));
      }}
    >
      <option value="" disabled>
        — Playlist wählen —
      </option>
      {playlists.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} ({playlistTrackTotal(p)} Songs)
          {p.collaborative ? ' · collaborative' : ''}
        </option>
      ))}
    </select>
  );
}
