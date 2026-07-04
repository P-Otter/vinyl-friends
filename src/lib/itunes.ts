// Song-Suche + 30s-Hörproben über die öffentliche iTunes-Search-API.
// Läuft ohne jedes Konto — Basis des Ohne-Spotify-Modus (Port der iOS-App:
// SongSearch.swift + PreviewPlayer.swift + FuzzyMatch.swift).
//
// Die API sendet keine verlässlichen CORS-Header, unterstützt aber JSONP
// (callback-Parameter) — deshalb Script-Tag statt fetch.
import type { Track } from '../types';
import { fuzzyMatches, fuzzyMatchesArtist } from './fuzzy-match';

type ItunesItem = {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  releaseDate?: string;
  trackTimeMillis?: number;
  trackExplicitness?: string;
  trackViewUrl?: string;
  previewUrl?: string;
};

type ItunesResponse = { results: ItunesItem[] };

let jsonpCounter = 0;

/** iTunes-Search per JSONP (CORS-frei). */
function jsonpSearch(term: string, limit: number): Promise<ItunesResponse> {
  return new Promise((resolve, reject) => {
    jsonpCounter += 1;
    const cbName = `__itunes_cb_${Date.now()}_${jsonpCounter}`;
    const params = new URLSearchParams({
      term,
      media: 'music',
      entity: 'song',
      limit: String(limit),
      callback: cbName,
    });
    const script = document.createElement('script');
    const cleanup = () => {
      delete (window as unknown as Record<string, unknown>)[cbName];
      script.remove();
      window.clearTimeout(timer);
    };
    const timer = window.setTimeout(() => {
      // Callback NICHT löschen, sondern durch No-op ersetzen: ein bereits
      // ladendes Script kann nach dem Timeout noch antworten — ohne Funktion
      // gäbe das einen uncaught ReferenceError in der Konsole.
      (window as unknown as Record<string, unknown>)[cbName] = () => {
        delete (window as unknown as Record<string, unknown>)[cbName];
      };
      script.remove();
      reject(new Error('iTunes-Suche: Zeitüberschreitung (kein Netz?)'));
    }, 12_000);
    (window as unknown as Record<string, unknown>)[cbName] = (data: ItunesResponse) => {
      cleanup();
      resolve(data);
    };
    script.src = `https://itunes.apple.com/search?${params.toString()}`;
    script.onerror = () => {
      cleanup();
      reject(new Error('iTunes-Suche fehlgeschlagen (kein Netz?)'));
    };
    document.head.appendChild(script);
  });
}

// ---------- Track-Mapping ----------

function itemToTrack(r: ItunesItem): Track | null {
  if (!r.trackId || !r.previewUrl) return null;
  const year = Number((r.releaseDate ?? '').slice(0, 4)) || 0;
  if (year <= 0) return null;
  return {
    id: `itunes-${r.trackId}`,
    uri: '',
    name: r.trackName ?? '',
    artist: r.artistName ?? '',
    albumName: r.collectionName ?? '',
    albumArt: (r.artworkUrl100 ?? '').replace('100x100', '300x300'),
    releaseYear: year,
    releaseDateRaw: String(year),
    releaseDatePrecision: 'year',
    source: 'local',
    durationMs: r.trackTimeMillis ?? 30_000,
    explicit: (r.trackExplicitness ?? '') === 'explicit',
    previewUrl: r.previewUrl,
  };
}

/** Song-Suche für den PoolBuilder — dedupliziert nach Titel+Artist. */
export async function searchSongs(query: string, limit = 25): Promise<Track[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const { results } = await jsonpSearch(trimmed, limit);
  const seen = new Set<string>();
  const out: Track[] = [];
  for (const r of results) {
    const track = itemToTrack(r);
    if (!track) continue;
    const key = `${track.name}|${track.artist}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(track);
  }
  return out;
}

// ---------- Hörproben-Auflösung (für Pack-Songs ohne previewUrl) ----------

const previewCache = new Map<string, string>();

/**
 * 30s-Hörproben-URL für Artist+Titel finden. iTunes liefert oft Cover/Remixe —
 * erst Titel UND Artist matchen, dann nur Titel, zur Not den ersten Treffer.
 */
export async function resolvePreviewUrl(
  artist: string,
  title: string,
  cacheKey: string,
): Promise<string> {
  const cached = previewCache.get(cacheKey);
  if (cached) return cached;

  const { results } = await jsonpSearch(`${artist} ${title}`, 8);
  const candidates = results.filter((r) => r.previewUrl);
  const best =
    candidates.find(
      (r) => fuzzyMatches(title, r.trackName ?? '') && fuzzyMatchesArtist(artist, r.artistName ?? ''),
    ) ??
    candidates.find((r) => fuzzyMatches(title, r.trackName ?? '')) ??
    candidates[0];

  if (!best?.previewUrl) {
    throw new Error(`Keine Hörprobe gefunden für „${title}“.`);
  }
  previewCache.set(cacheKey, best.previewUrl);
  return best.previewUrl;
}
