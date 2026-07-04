// Playlist-Auswahl im Spotify-Look (Cover-Art-Kacheln statt <select>-Dropdown).
//
// WICHTIG (Stand Feb 2026): Spotify erlaubt das Auslesen von Playlist-Songs
// (GET /playlists/{id}/items) nur noch, wenn der eingeloggte Account
// Besitzer:in ODER echte:r Kollaborateur:in der Playlist ist — reines Folgen
// einer fremden öffentlichen Playlist reicht seit der API-Änderung vom
// 11.02.2026 nicht mehr, sonst 403 Forbidden. Wir können das nicht umgehen
// (Plattform-Limit, kein Code-Bug) — aber wir können VORHER anzeigen, welche
// Playlists funktionieren werden, statt den Nutzer beim Spielstart in einen
// kryptischen 403 laufen zu lassen.
import { useEffect, useState } from 'react';
import { useAuth } from '../auth-context';
import { getMyPlaylists, playlistTrackTotal, type SpotifyPlaylist } from '../lib/spotify-api';
import { useTheme } from '../hooks/useTheme';

type Props = {
  value: string;
  onChange: (id: string, name: string, total: number) => void;
};

function usable(p: SpotifyPlaylist, myUserId: string | undefined): boolean {
  return p.owner.id === myUserId || p.collaborative;
}

export default function PlaylistPicker({ value, onChange }: Props) {
  const t = useTheme();
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyPlaylists()
      .then(setPlaylists)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) return <p className="text-sm" style={{ color: t.bad }}>Playlists laden fehlgeschlagen: {error}</p>;
  if (!playlists) return <p className="text-sm" style={{ color: t.textMuted }}>Lade deine Playlists…</p>;
  if (playlists.length === 0)
    return <p className="text-sm" style={{ color: t.textMuted }}>Keine Playlists gefunden.</p>;

  // Nutzbare (eigene/echte Kollaborateur-Playlists) zuerst — die werden mit
  // hoher Wahrscheinlichkeit tatsächlich funktionieren.
  const sorted = [...playlists].sort((a, b) => Number(usable(b, user?.id)) - Number(usable(a, user?.id)));
  const anyBlocked = sorted.some((p) => !usable(p, user?.id));

  return (
    <div className="space-y-2">
      {anyBlocked && (
        <p className="text-xs" style={{ color: t.textMuted }}>
          ⚠️ Playlists, denen du nur folgst (nicht selbst erstellt, nicht als
          Mitbearbeiter:in hinzugefügt), kann Spotify seit Anfang 2026 nicht mehr
          auslesen — die Songs bleiben leer. Bitte eine eigene oder eine echte{' '}
          <i>collaborative</i> Playlist wählen.
        </p>
      )}
      <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
        {sorted.map((p) => {
          const ok = usable(p, user?.id);
          const selected = p.id === value;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id, p.name, playlistTrackTotal(p))}
              className="flex flex-col items-start gap-1.5 rounded-xl p-2 text-left transition"
              style={{
                background: selected ? `${t.highlight}26` : t.background,
                border: `${selected ? 2 : 1}px solid ${selected ? t.highlight : t.surfaceStroke}66`,
                opacity: ok ? 1 : 0.55,
              }}
            >
              {p.images?.[0]?.url ? (
                <img src={p.images[0].url} alt="" className="aspect-square w-full rounded-lg object-cover" />
              ) : (
                <div
                  className="flex aspect-square w-full items-center justify-center rounded-lg text-2xl"
                  style={{ background: `${t.textMuted}1a` }}
                >
                  🎵
                </div>
              )}
              <span className="line-clamp-2 text-xs font-bold leading-tight">{p.name}</span>
              <span className="flex items-center gap-1 text-[10px]" style={{ color: t.textMuted }}>
                {playlistTrackTotal(p)} Songs
                {ok ? (
                  <span style={{ color: t.good }}>· ✓ nutzbar</span>
                ) : (
                  <span style={{ color: t.bad }}>· nur gefolgt</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
