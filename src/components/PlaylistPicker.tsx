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
//
// Echte Spotify-ORDNER lassen sich NICHT abbilden — die Web-API liefert dazu
// keinerlei Daten (kein /folders-Endpunkt, seit 2015 von Entwicklern gefordert,
// nie umgesetzt). Als Ersatz: Suche + Gruppierung (eigene/gemeinsam/gefolgt)
// + zuletzt genutzte Playlist angeheftet.
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../auth-context';
import { getMyPlaylists, playlistTrackTotal, type SpotifyPlaylist } from '../lib/spotify-api';
import { useTheme } from '../hooks/useTheme';
import type { AppTheme } from '../theme/tokens';
import ThemedField from './theme/ThemedField';

type Props = {
  value: string;
  onChange: (id: string, name: string, total: number) => void;
};

const LS_LAST_USED = 'hf_last_playlist_id';

function ownedBy(p: SpotifyPlaylist, myUserId: string | undefined): boolean {
  return p.owner.id === myUserId;
}
function usable(p: SpotifyPlaylist, myUserId: string | undefined): boolean {
  return ownedBy(p, myUserId) || p.collaborative;
}

export default function PlaylistPicker({ value, onChange }: Props) {
  const t = useTheme();
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [lastUsedId, setLastUsedId] = useState(() => localStorage.getItem(LS_LAST_USED));

  useEffect(() => {
    getMyPlaylists()
      .then(setPlaylists)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const select = (p: SpotifyPlaylist) => {
    localStorage.setItem(LS_LAST_USED, p.id);
    setLastUsedId(p.id);
    onChange(p.id, p.name, playlistTrackTotal(p));
  };

  if (error) return <p className="text-sm" style={{ color: t.bad }}>Playlists laden fehlgeschlagen: {error}</p>;
  if (!playlists) return <p className="text-sm" style={{ color: t.textMuted }}>Lade deine Playlists…</p>;
  if (playlists.length === 0)
    return <p className="text-sm" style={{ color: t.textMuted }}>Keine Playlists gefunden.</p>;

  const q = query.trim().toLowerCase();
  const filtered = q ? playlists.filter((p) => p.name.toLowerCase().includes(q)) : playlists;

  // Zuletzt genutzte Playlist oben anheften — nur wenn gerade nicht gesucht wird
  // (Suche soll ein klares, flaches Ergebnis liefern statt Sonderplatz vorne).
  const pinned = !q ? filtered.find((p) => p.id === lastUsedId) : undefined;
  const rest = pinned ? filtered.filter((p) => p.id !== pinned.id) : filtered;

  const owned = rest.filter((p) => ownedBy(p, user?.id));
  const shared = rest.filter((p) => !ownedBy(p, user?.id) && p.collaborative);
  const followedOnly = rest.filter((p) => !ownedBy(p, user?.id) && !p.collaborative);

  return (
    <div className="space-y-3">
      <ThemedField
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Playlist suchen…"
        className="w-full"
      />

      {followedOnly.length > 0 && !q && (
        <p className="text-xs" style={{ color: t.textMuted }}>
          ⚠️ Playlists, denen du nur folgst (nicht selbst erstellt, nicht als
          Mitbearbeiter:in hinzugefügt), kann Spotify seit Anfang 2026 nicht mehr
          auslesen — die Songs bleiben leer. Bitte eine eigene oder eine echte{' '}
          <i>collaborative</i> Playlist wählen.
        </p>
      )}

      <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
        {pinned && (
          <Section title="Zuletzt genutzt" t={t}>
            <Grid items={[pinned]} value={value} userId={user?.id} onSelect={select} t={t} />
          </Section>
        )}
        {owned.length > 0 && (
          <Section title="Eigene" t={t}>
            <Grid items={owned} value={value} userId={user?.id} onSelect={select} t={t} />
          </Section>
        )}
        {shared.length > 0 && (
          <Section title="Gemeinsam (collaborative)" t={t}>
            <Grid items={shared} value={value} userId={user?.id} onSelect={select} t={t} />
          </Section>
        )}
        {followedOnly.length > 0 && (
          <Section title="Nur gefolgt — funktioniert vermutlich nicht" t={t}>
            <Grid items={followedOnly} value={value} userId={user?.id} onSelect={select} t={t} />
          </Section>
        )}
        {filtered.length === 0 && (
          <p className="text-sm" style={{ color: t.textMuted }}>
            Keine Playlist gefunden für „{query}".
          </p>
        )}
      </div>
    </div>
  );
}

function Section({ title, t, children }: { title: string; t: AppTheme; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: t.textMuted }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Grid({
  items,
  value,
  userId,
  onSelect,
  t,
}: {
  items: SpotifyPlaylist[];
  value: string;
  userId: string | undefined;
  onSelect: (p: SpotifyPlaylist) => void;
  t: AppTheme;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((p) => {
        const ok = usable(p, userId);
        const selected = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p)}
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
  );
}
