import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { makePlayer, useGameState } from '../hooks/useGameState';
import { usePool } from '../hooks/usePool';
import { useTheme } from '../hooks/useTheme';
import { buildQueue } from '../lib/queue-builder';
import ThemedTitle from '../components/theme/ThemedTitle';
import ThemedField from '../components/theme/ThemedField';
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
  const { players, setPlayers, settings, setSettings, startGame } = useGameState();
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

  // "Wessen Liebling?" braucht added_by-Daten aus einer echten Spotify-Playlist —
  // im Pool-Modus (evtl. aus einer früheren Spotify-Session in settings hängen
  // geblieben) gibt's die nicht, also auf Klassisch zurückfallen.
  useEffect(() => {
    if (isPoolMode && settings.mode === 'whose-fave') {
      setSettings({ mode: 'classic-relative' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPoolMode]);

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
        // "vinyl-uno" hat kein Karten-Ziel (Rennen auf leere Hand) — Richtwert
        // stattdessen an Starthand × Spielerzahl anlehnen (Fehlversuche brauchen
        // zusätzliche Songs, der outOfTracks-Fallback fängt ein zu kurzes Deck ab).
        const targetCards =
          settings.mode === 'vinyl-uno'
            ? settings.startingHandSize * Math.max(2, list.length)
            : settings.winCondition.type === 'cards'
              ? settings.winCondition.n
              : 10;
        // "Artist & Titel raten" braucht im Schnitt deutlich mehr Versuche pro
        // validierter Karte (Platzierung UND ≥2/3 Bonusfelder nötig) — größerer
        // Puffer, damit der Pool nicht vorzeitig ausgeht.
        const minNeeded =
          settings.mode === 'name-that-tune'
            ? Math.max(targetCards * 4 + 5, 12)
            : Math.max(targetCards + 3, 8);
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
  const t = useTheme();

  return (
    <div className="space-y-6">
      <ThemedTitle size={30}>Wer spielt mit?</ThemedTitle>

      <section className="panel space-y-3">
        {list.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3">
            <span className="w-5" style={{ color: t.textMuted }}>
              {i + 1}.
            </span>
            <span
              className="h-4 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <ThemedField
              value={p.name}
              onChange={(e) => rename(p.id, e.target.value)}
              className="flex-1"
              maxLength={20}
            />
            <div className="flex gap-1">
              <button
                className="rounded px-3 py-2 text-sm disabled:opacity-30"
                style={{ background: t.background, border: `1px solid ${t.surfaceStroke}4d` }}
                onClick={() => move(i, -1)}
                disabled={i === 0}
                title="nach oben"
              >
                ↑
              </button>
              <button
                className="rounded px-3 py-2 text-sm disabled:opacity-30"
                style={{ background: t.background, border: `1px solid ${t.surfaceStroke}4d` }}
                onClick={() => move(i, 1)}
                disabled={i === list.length - 1}
                title="nach unten"
              >
                ↓
              </button>
            </div>
            <button
              className="rounded px-3 py-2 text-sm disabled:opacity-30"
              style={{ background: t.background, border: `1px solid ${t.surfaceStroke}4d`, color: t.bad }}
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
        <p className="text-xs" style={{ color: t.textMuted }}>
          2–8 Spieler · Reihenfolge mit ↑ ↓ sortieren
        </p>
      </section>

      <section className="panel space-y-3">
        <label className="field-label mb-0">Modus</label>
        {(
          [
            { id: 'classic-relative' as const, label: 'Klassisch', hint: 'Nur Jahr einsortieren.' },
            {
              id: 'name-that-tune' as const,
              label: 'Artist & Titel raten',
              hint: 'Karten zählen erst mit Platzierung UND ≥2/3 (Jahr/Titel/Artist) als validiert. Andere dürfen falsche Platzierungen und schwache Tipps stehlen.',
            },
            {
              id: 'plattenboerse' as const,
              label: 'Plattenbörse 📀',
              hint: 'Catan-inspiriert: jeder Treffer bringt eine Dekaden-Marke. Tauschen + volle Sätze gegen Bonuspunkte einlösen.',
            },
            {
              id: 'vinyl-uno' as const,
              label: 'Vinyl! 🔄',
              hint: 'UNO-inspiriert: alle starten mit einer Hand voll Songs. Richtig = Karte weg, falsch = Karte dazu, plus Zufalls-Ereignisse. Wer zuerst leer ist, gewinnt.',
            },
          ]
        ).map((m) => {
          const checked = settings.mode === m.id || (m.id === 'classic-relative' && settings.mode === 'classic-year');
          return (
            <label key={m.id} className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="pool-mode"
                className="mt-1"
                checked={checked}
                onChange={() => setSettings({ mode: m.id })}
              />
              <span>
                <span className="block font-semibold">{m.label}</span>
                <span className="block text-xs" style={{ color: t.textMuted }}>
                  {m.hint}
                </span>
              </span>
            </label>
          );
        })}
        {settings.mode === 'vinyl-uno' && (
          <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: t.background }}>
            <span>Starthand-Größe</span>
            <div className="flex items-center gap-3">
              <button
                className="btn-ghost px-3 py-1"
                onClick={() => setSettings({ startingHandSize: Math.max(4, settings.startingHandSize - 1) })}
              >
                −
              </button>
              <span className="w-6 text-center font-mono font-bold">{settings.startingHandSize}</span>
              <button
                className="btn-ghost px-3 py-1"
                onClick={() => setSettings({ startingHandSize: Math.min(12, settings.startingHandSize + 1) })}
              >
                +
              </button>
            </div>
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-xl p-4 text-sm font-semibold" style={{ background: `${t.bad}1a`, color: t.bad }}>
          {error}
        </div>
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
