// Track-Queue-Generation — Dedup, Filter, gewichtetes Mischen, Shuffle.
// Siehe docs/tech-stack.md → Track-Queue-Generation.
import { getPlaylistTracks } from './spotify-api';
import type { GameSettings, Theme, Track } from '../types';
import themesData from '../data/themes.json';

export const THEMES = themesData as Theme[];

export function themeById(id: string): Theme | undefined {
  return THEMES.find((t) => t.id === id);
}

// Deterministischer Shuffle wäre für Tests schön, aber fürs Spiel wollen wir echtes Zufalls-Mischen.
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function dedupe(tracks: Track[]): Track[] {
  // Friends-Pool gewinnt bei Kollision (es ist jemandes Lieblingssong).
  const byId = new Map<string, Track>();
  for (const t of tracks) {
    const existing = byId.get(t.id);
    if (!existing) {
      byId.set(t.id, t);
    } else if (existing.source !== 'friends' && t.source === 'friends') {
      byId.set(t.id, t);
    }
  }
  return [...byId.values()];
}

function applyFilters(tracks: Track[], settings: GameSettings): Track[] {
  return tracks.filter((t) => {
    if (t.durationMs < settings.minTrackLengthSec * 1000) return false;
    if (!settings.allowExplicit && t.explicit) return false;
    return true;
  });
}

/**
 * Gewichtetes Sampling: friendsRatio aus dem Friends-Pool, der Rest gleichverteilt
 * auf die Themes. Es werden nur so viele Tracks gezogen wie verfügbar sind.
 */
function weightedMix(
  friends: Track[],
  themePools: Track[][],
  friendsRatio: number,
): Track[] {
  const totalAvailable =
    friends.length + themePools.reduce((s, p) => s + p.length, 0);
  if (totalAvailable === 0) return [];

  // Ohne aktive Themes: einfach alle Friends-Tracks.
  if (themePools.length === 0) return shuffle(friends);

  const shuffledFriends = shuffle(friends);
  const shuffledThemes = themePools.map((p) => shuffle(p));

  // Zielgröße = alle verfügbaren Tracks, aber Anteile gemäß Ratio respektieren,
  // soweit die Pools reichen.
  const out: Track[] = [];
  const wantFriends = Math.round(totalAvailable * friendsRatio);
  out.push(...shuffledFriends.slice(0, wantFriends));

  const remainingFriends = shuffledFriends.slice(wantFriends);
  const wantPerTheme = Math.ceil(
    (totalAvailable - out.length) / Math.max(1, shuffledThemes.length),
  );
  for (const pool of shuffledThemes) {
    out.push(...pool.slice(0, wantPerTheme));
  }
  // Falls die Themes zu wenig liefern, mit übrigen Friends auffüllen.
  out.push(...remainingFriends);

  return dedupe(out);
}

export type QueueBuildResult = {
  queue: Track[];
  friendsCount: number;
  themeCounts: Record<string, number>;
  totalBeforeFilter: number;
};

/** Baut die finale, gemischte Spiel-Queue aus Friends-Playlist + aktiven Themes. */
export async function buildQueue(settings: GameSettings): Promise<QueueBuildResult> {
  const friendsRaw = await getPlaylistTracks(settings.friendsPlaylistId, 'friends');

  const themeRaw = await Promise.all(
    settings.enabledThemes.map(async (id) => {
      const theme = themeById(id);
      if (!theme) return { id, tracks: [] as Track[] };
      try {
        const tracks = await getPlaylistTracks(theme.playlistId, `theme:${id}`);
        return { id, tracks };
      } catch {
        // Theme-Playlist nicht erreichbar (z.B. editorial/algorithmic) → still überspringen.
        return { id, tracks: [] as Track[] };
      }
    }),
  );

  const totalBeforeFilter =
    friendsRaw.length + themeRaw.reduce((s, t) => s + t.tracks.length, 0);

  const friends = applyFilters(friendsRaw, settings);
  const themePools = themeRaw.map((t) => applyFilters(t.tracks, settings));

  const mixed = weightedMix(friends, themePools, settings.friendsRatio);
  const queue = shuffle(dedupe(mixed));

  const themeCounts: Record<string, number> = {};
  for (const t of queue) {
    if (t.source.startsWith('theme:')) {
      const id = t.source.slice('theme:'.length);
      themeCounts[id] = (themeCounts[id] ?? 0) + 1;
    }
  }

  return {
    queue,
    friendsCount: queue.filter((t) => t.source === 'friends').length,
    themeCounts,
    totalBeforeFilter,
  };
}

/** Zufälliger Start-Offset im Track, damit das Intro nicht sofort verrät. */
export function randomOffsetMs(durationMs: number): number {
  const minStart = 10_000;
  const maxStart = Math.max(minStart, durationMs - 30_000);
  if (maxStart <= minStart) return 0;
  return Math.floor(minStart + Math.random() * (maxStart - minStart));
}
