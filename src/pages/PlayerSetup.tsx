import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { makePlayer, useGameState } from '../hooks/useGameState';
import { usePool } from '../hooks/usePool';
import { buildQueue } from '../lib/queue-builder';
import type { Track } from '../types';

const DEFAULT_NAMES = ['Spieler 1', 'Spieler 2'];

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function PlayerSetup() {
  const navigate = useNavigate();
  const { players, setPlayers, settings, startGame } = useGameState();
  const { pool } = usePool();
  const isPoolMode = settings.musicSource === 'preview';
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lazy-Init: beim ersten Besuch zwei leere Spieler anlegen.
  useEffect(() => {
    if (players.length === 0) {
      setPlayers(DEFAULT_NAMES.map((n, i) => makePlayer(n, i)));
    }
  }, [players.length, setPlayers]);

  const list = players;

  const rename = (id: string, name: string) =>
    setPlayers(list.map((p) => (p.id === id ? { ...p, name } : p)));

  const remove = (id: string) => setPlayers(list.filter((p) => p.id !== id));

  const add = () => {
    if (list.length >= 8) return;
    setPlayers([...list, makePlayer(`Spieler ${list.length + 1}`, list.length)]);
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    setPlayers(next);
  };

  const start = async () => {
    setError(null);
    setBuilding(true);
    try {
      let queue: Track[];
      if (isPoolMode) {
        // Ohne-Spotify-Modus: der selbst gebaute Pool IST die Queue.
        const targetCards = settings.winCondition.type === 'cards' ? settings.winCondition.n : 10;
        const minNeeded = Math.max(targetCards + 3, 8);
        if (pool.length < minNeeded) {
          throw new Error(
            `Zu wenige Songs im Pool (${pool.length}). Mindestens ${minNeeded} nötig — geh zurück und füg mehr hinzu.`,
          );
        }
        queue = shuffle(pool);
      } else {
        const result = await buildQueue(settings);
        queue = result.queue;
        if (queue.length === 0) {
          throw new Error(
            'Die Queue ist leer — Playlist zu kurz oder alle Songs herausgefiltert (Min-Länge/Explicit prüfen).',
          );
        }
      }
      startGame(queue);
      navigate('/game');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBuilding(false);
    }
  };

  const validNames = list.length >= 2 && list.every((p) => p.name.trim().length > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Wer spielt mit?</h1>

      <section className="panel space-y-3">
        {list.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3">
            <span className="w-5 text-slate-500">{i + 1}.</span>
            <span
              className="h-4 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <input
              value={p.name}
              onChange={(e) => rename(p.id, e.target.value)}
              className="flex-1 rounded-lg bg-panel2 px-3 py-2"
              maxLength={20}
            />
            <div className="flex gap-1">
              <button
                className="rounded bg-panel2 px-3 py-2 text-sm disabled:opacity-30"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                title="nach oben"
              >
                ↑
              </button>
              <button
                className="rounded bg-panel2 px-3 py-2 text-sm disabled:opacity-30"
                onClick={() => move(i, 1)}
                disabled={i === list.length - 1}
                title="nach unten"
              >
                ↓
              </button>
            </div>
            <button
              className="rounded bg-panel2 px-3 py-2 text-sm text-red-300 disabled:opacity-30"
              onClick={() => remove(p.id)}
              disabled={list.length <= 2}
              title="entfernen"
            >
              ✕
            </button>
          </div>
        ))}
        {list.length < 8 && (
          <button className="btn-ghost w-full" onClick={add}>
            + Spieler hinzufügen
          </button>
        )}
        <p className="text-xs text-slate-500">2–8 Spieler · Reihenfolge mit ↑ ↓ sortieren</p>
      </section>

      {error && (
        <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
      )}

      <div className="flex justify-between">
        <button
          className="btn-ghost"
          onClick={() => navigate(isPoolMode ? '/pool' : '/setup')}
          disabled={building}
        >
          ← zurück
        </button>
        <button className="btn-primary" onClick={start} disabled={!validNames || building}>
          {building ? 'Baue Queue…' : 'Start!'}
        </button>
      </div>
    </div>
  );
}
