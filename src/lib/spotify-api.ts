// Dünner Wrapper um die Spotify Web API. Alle Calls holen sich einen frischen Token.
// Siehe docs/tech-stack.md → API-Calls die wir brauchen.
import { getValidAccessToken } from './spotify-auth';
import type { Track, TrackSource } from '../types';

const API = 'https://api.spotify.com/v1';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getValidAccessToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 429) {
    const retry = Number(res.headers.get('Retry-After') ?? '1');
    await new Promise((r) => setTimeout(r, (retry + 0.5) * 1000));
    return api<T>(path, init);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify API ${res.status} bei ${path}: ${text}`);
  }
  // Manche Playback-Endpoints liefern 204 ohne Body.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---- /me ----
export type SpotifyUser = {
  id: string;
  display_name: string | null;
  email?: string;
  product: string; // "premium" | "free" | ...
  images?: { url: string }[];
};

export function getMe(): Promise<SpotifyUser> {
  return api<SpotifyUser>('/me');
}

// ---- Playlists ----
export type SpotifyPlaylist = {
  id: string;
  name: string;
  images: { url: string }[];
  // Spotify hat das Track-Collection-Feld von `tracks` auf `items` umgestellt;
  // ältere Accounts liefern evtl. noch `tracks`. Beide optional behandeln.
  tracks?: { total: number };
  items?: { total: number };
  owner: { display_name: string | null; id: string };
  collaborative: boolean;
};

/** Song-Anzahl einer Playlist, egal ob Spotify `tracks` oder `items` liefert. */
export function playlistTrackTotal(p: SpotifyPlaylist): number {
  return (p.tracks ?? p.items)?.total ?? 0;
}

type Paged<T> = { items: T[]; next: string | null };

export async function getMyPlaylists(): Promise<SpotifyPlaylist[]> {
  // Map nach id: filtert null/kaputte Einträge UND Pagination-Duplikate (Spotify liefert
  // bei großen Listen dieselbe Playlist gelegentlich auf mehreren Seiten).
  const byId = new Map<string, SpotifyPlaylist>();
  let url = '/me/playlists?limit=50';
  for (;;) {
    const page = await api<Paged<SpotifyPlaylist>>(url);
    for (const p of page.items) {
      if (p && p.id && !byId.has(p.id)) byId.set(p.id, p);
    }
    if (!page.next) break;
    url = page.next.replace(API, '');
  }
  return [...byId.values()];
}

// ---- Tracks einer Playlist ----
type PlaylistTrackItem = {
  added_by?: { id: string } | null;
  // Spotify hat den Track-Wrapper umbenannt (tracks→items-Umstellung). Mehrere Keys
  // tolerieren, damit alte wie neue Antworten funktionieren.
  track?: SpotifyTrackObject | null;
  item?: SpotifyTrackObject | null;
};

function extractTrack(item: PlaylistTrackItem): SpotifyTrackObject | null {
  return item.track ?? item.item ?? null;
}

type SpotifyTrackObject = {
  id: string | null;
  uri: string;
  name: string;
  duration_ms: number;
  explicit: boolean;
  is_playable?: boolean;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
    release_date: string;
    release_date_precision: 'year' | 'month' | 'day';
  };
};

function parseYear(releaseDate: string): number {
  const y = parseInt(releaseDate.slice(0, 4), 10);
  return Number.isFinite(y) ? y : 0;
}

function toTrack(t: SpotifyTrackObject, source: TrackSource, addedById?: string): Track {
  return {
    id: t.id ?? t.uri,
    uri: t.uri,
    name: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    albumName: t.album.name,
    albumArt: t.album.images?.[0]?.url ?? '',
    releaseYear: parseYear(t.album.release_date),
    releaseDateRaw: t.album.release_date,
    releaseDatePrecision: t.album.release_date_precision,
    source,
    addedById,
    durationMs: t.duration_ms,
    explicit: t.explicit,
  };
}

async function fetchPlaylistItems(
  playlistId: string,
  endpoint: 'items' | 'tracks',
  source: TrackSource,
): Promise<Track[]> {
  const out: Track[] = [];
  // Kein fields-Filter: Spotify hat Feldnamen umbenannt; volle Objekte holen und
  // robust extrahieren (extractTrack toleriert `track` wie `item`).
  let url = `/playlists/${playlistId}/${endpoint}?limit=100`;
  for (;;) {
    const page = await api<Paged<PlaylistTrackItem>>(url);
    for (const item of page.items) {
      const t = extractTrack(item);
      if (!t || !t.id) continue; // lokale Dateien / entfernte Tracks raus
      if (t.is_playable === false) continue;
      out.push(toTrack(t, source, item.added_by?.id));
    }
    if (!page.next) break;
    url = page.next.replace(API, '');
  }
  return out;
}

/**
 * Holt alle Tracks einer Playlist (paginiert, 100/Call) und mappt sie auf unser Track-Modell.
 * Spotify hat den Sub-Endpoint von `/tracks` auf `/items` umgestellt — wir versuchen `/items`
 * zuerst und fallen bei 403/404 auf das alte `/tracks` zurück (für ältere Accounts).
 */
export async function getPlaylistTracks(
  playlistId: string,
  source: TrackSource,
): Promise<Track[]> {
  try {
    return await fetchPlaylistItems(playlistId, 'items', source);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (/\b(403|404)\b/.test(msg)) {
      return fetchPlaylistItems(playlistId, 'tracks', source);
    }
    throw e;
  }
}

// ---- Playback (Web Playback SDK device) ----

export function transferPlayback(deviceId: string, play = false): Promise<void> {
  return api<void>('/me/player', {
    method: 'PUT',
    body: JSON.stringify({ device_ids: [deviceId], play }),
  });
}

export function playTrack(
  deviceId: string,
  uri: string,
  positionMs = 0,
): Promise<void> {
  return api<void>(`/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    body: JSON.stringify({ uris: [uri], position_ms: positionMs }),
  });
}

export function pausePlayback(deviceId: string): Promise<void> {
  return api<void>(`/me/player/pause?device_id=${deviceId}`, { method: 'PUT' });
}

export function seek(deviceId: string, positionMs: number): Promise<void> {
  return api<void>(
    `/me/player/seek?position_ms=${positionMs}&device_id=${deviceId}`,
    { method: 'PUT' },
  );
}
