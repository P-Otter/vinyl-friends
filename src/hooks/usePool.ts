// Song-Pool für den Ohne-Spotify-Modus — persistiert, damit der Pool
// einen Reload/Session-Wechsel überlebt (wie im iOS-PoolBuilder).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Track } from '../types';

type PoolStore = {
  pool: Track[];
  add: (tracks: Track[]) => number; // Anzahl tatsächlich neu hinzugefügter
  remove: (id: string) => void;
  clear: () => void;
};

// Duplikat-Schlüssel über Quellen hinweg: derselbe Song steckt in mehreren
// Packs (mit unterschiedlichen IDs) und kommt auch über die Suche rein —
// nach Künstler+Titel deduplizieren, damit er nie zweimal in der Queue landet.
function songKey(t: Track): string {
  return `${t.artist}|${t.name}`.toLowerCase().replace(/\s+/g, ' ').trim();
}

export const usePool = create<PoolStore>()(
  persist(
    (set, get) => ({
      pool: [],
      add: (tracks) => {
        const existingIds = new Set(get().pool.map((t) => t.id));
        const existingSongs = new Set(get().pool.map(songKey));
        const fresh: Track[] = [];
        for (const t of tracks) {
          if (existingIds.has(t.id) || existingSongs.has(songKey(t))) continue;
          existingIds.add(t.id);
          existingSongs.add(songKey(t));
          fresh.push(t);
        }
        if (fresh.length > 0) set({ pool: [...get().pool, ...fresh] });
        return fresh.length;
      },
      remove: (id) => set({ pool: get().pool.filter((t) => t.id !== id) }),
      clear: () => set({ pool: [] }),
    }),
    { name: 'hf_pool' },
  ),
);
