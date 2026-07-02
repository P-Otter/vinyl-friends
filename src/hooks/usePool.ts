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

export const usePool = create<PoolStore>()(
  persist(
    (set, get) => ({
      pool: [],
      add: (tracks) => {
        const existing = new Set(get().pool.map((t) => t.id));
        const fresh = tracks.filter((t) => !existing.has(t.id));
        if (fresh.length > 0) set({ pool: [...get().pool, ...fresh] });
        return fresh.length;
      },
      remove: (id) => set({ pool: get().pool.filter((t) => t.id !== id) }),
      clear: () => set({ pool: [] }),
    }),
    { name: 'hf_pool' },
  ),
);
