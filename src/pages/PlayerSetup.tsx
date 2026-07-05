import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { makePlayer, useGameState } from '../hooks/useGameState';
import { usePool } from '../hooks/usePool';
import { useTheme } from '../hooks/useTheme';
import { buildQueue } from '../lib/queue-builder';
import { vinylHandSize } from '../lib/vinylDeck';
import ThemedTitle from '../components/theme/ThemedTitle';
import ThemedField from '../components/theme/ThemedField';
import type { Track } from '../types';

const DEFAULT_NAMES = ['Spieler 1', 'Spieler 2'];
const SNIPPET_LENGTHS = [10, 15, 20, 30, 45, 60];

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
  const targetCardsForMastery = settings.winCondition.type === 'cards' ? settings.winCondition.n : 10;

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
        // "vinyl-uno"/"plus-minus" haben kein Karten-Ziel (Rennen auf leere Hand) —
        // Richtwert stattdessen an Starthand × Spielerzahl anlehnen (Fehlversuche
        // brauchen zusätzliche Songs, der outOfTracks-Fallback fängt ein zu kurzes
        // Deck/Pool ab).
        const targetCards =
          settings.mode === 'vinyl-uno'
            ? vinylHandSize(Math.max(2, list.length)) * Math.max(2, list.length)
            : settings.mode === 'plus-minus'
              ? settings.plusMinusStartCards * Math.max(2, list.length)
              : settings.winCondition.type === 'cards'
                ? settings.winCondition.n
                : 10;
        // "Artist & Titel raten" braucht im Schnitt deutlich mehr Versuche pro
        // validierter Karte (Platzierung UND ≥2/3 Bonusfelder nötig) — größerer
        // Puffer, damit der Pool nicht vorzeitig ausgeht. "Plus/Minus" hat (anders
        // als "Vinyl!") kein festes Deck-Limit — falsche Tipps lassen die Hand
        // NETTO wachsen (+1, statt bei "Vinyl!" abgelegt+nachgezogen = ±0), daher
        // etwas mehr Puffer als die generischen Modi, aber moderat (ein einzelner
        // 40-Song-Pack-Pack muss für 2 Spieler mit Standard-Starthand reichen).
        const minNeeded =
          settings.mode === 'name-that-tune'
            ? Math.max(targetCards * 4 + 5, 12)
            : settings.mode === 'plus-minus'
              ? Math.max(targetCards * 2 + 5, 15)
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
              hint: 'Braucht X Karten, davon Y validiert (Jahr exakt, Titel/Artist tippfehlertolerant). Andere dürfen falsche Platzierungen und schwache Tipps stehlen.',
            },
            {
              id: 'plattenboerse' as const,
              label: 'Plattenbörse 📀',
              hint: 'Catan-inspiriert: jeder Treffer bringt eine Dekaden-Marke. Tauschen + volle Sätze gegen Bonuspunkte einlösen.',
            },
            {
              id: 'vinyl-uno' as const,
              label: 'Vinyl! 🔄',
              hint: 'Echtes Kartenspiel: jede*r hat eine Hand aus dem 32er-Deck (Reverse, Skip, Zieh-1/2, Wunschkarte, Tausch, 2-für-1). Vor dem Song eine Karte wählen — bei Treffer wird ihr Effekt gültig, sonst 1 Strafkarte. Wer zuerst leer ist, gewinnt.',
            },
            {
              id: 'plus-minus' as const,
              label: 'Plus/Minus ➕➖',
              hint: 'Die einfache Variante von Vinyl!: kein Kartendeck, keine Sondereffekte. Richtig platziert = −1 Karte, falsch = +1 Karte. Wer zuerst leer ist, gewinnt.',
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
        {settings.mode === 'name-that-tune' && (
          <>
            <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: t.background }}>
              <span>Davon validiert</span>
              <div className="flex items-center gap-3">
                <button
                  className="btn-ghost px-3 py-1"
                  onClick={() => setSettings({ requiredMastered: Math.max(1, settings.requiredMastered - 1) })}
                >
                  −
                </button>
                <span className="w-6 text-center font-mono font-bold">{settings.requiredMastered}</span>
                <button
                  className="btn-ghost px-3 py-1"
                  onClick={() =>
                    setSettings({
                      requiredMastered: Math.min(targetCardsForMastery, settings.requiredMastered + 1),
                    })
                  }
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <span className="mb-1 block text-xs" style={{ color: t.textMuted }}>
                Wann zählt eine Karte als validiert?
              </span>
              <div className="flex gap-2">
                {[2, 3].map((n) => (
                  <button
                    key={n}
                    className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold"
                    style={{
                      background: settings.masteryThreshold === n ? t.highlight : t.background,
                      color: settings.masteryThreshold === n ? t.onAccent : t.textMuted,
                    }}
                    onClick={() => setSettings({ masteryThreshold: n })}
                  >
                    {n === 2 ? '2 von 3 reichen' : 'alle 3 nötig'}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        {settings.mode === 'vinyl-uno' && (
          <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: t.background }}>
            <span>
              Starthand-Größe
              <span className="block text-xs" style={{ color: t.textMuted }}>
                Richtet sich nach der Spieleranzahl ({list.length})
              </span>
            </span>
            <span className="font-mono font-bold">{vinylHandSize(Math.max(2, list.length))}</span>
          </div>
        )}
        {settings.mode === 'plus-minus' && (
          <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: t.background }}>
            <span>Start-Kartenzahl</span>
            <div className="flex items-center gap-3">
              <button
                className="btn-ghost px-3 py-1"
                onClick={() => setSettings({ plusMinusStartCards: Math.max(3, settings.plusMinusStartCards - 1) })}
              >
                −
              </button>
              <span className="w-6 text-center font-mono font-bold">{settings.plusMinusStartCards}</span>
              <button
                className="btn-ghost px-3 py-1"
                onClick={() => setSettings({ plusMinusStartCards: Math.min(15, settings.plusMinusStartCards + 1) })}
              >
                +
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="panel space-y-3">
        <label className="field-label mb-0">Hörprobe-Länge</label>
        <div className="flex flex-wrap gap-2">
          {SNIPPET_LENGTHS.map((sec) => (
            <button
              key={sec}
              className="rounded-lg px-3 py-2 text-sm font-semibold"
              style={{
                background: settings.snippetMode.enabled && settings.snippetMode.lengthSec === sec ? t.highlight : t.background,
                color: settings.snippetMode.enabled && settings.snippetMode.lengthSec === sec ? t.onAccent : t.textMuted,
              }}
              onClick={() => setSettings({ snippetMode: { enabled: true, lengthSec: sec } })}
            >
              {sec}s
            </button>
          ))}
          <button
            className="rounded-lg px-3 py-2 text-sm font-semibold"
            style={{
              background: !settings.snippetMode.enabled ? t.highlight : t.background,
              color: !settings.snippetMode.enabled ? t.onAccent : t.textMuted,
            }}
            onClick={() => setSettings({ snippetMode: { ...settings.snippetMode, enabled: false } })}
          >
            Ganzer Song
          </button>
        </div>
        <p className="text-xs" style={{ color: t.textMuted }}>
          Song pausiert automatisch nach der gewählten Zeit — gilt für alle Modi. Jederzeit
          manuell weiterhörbar (Play-Button).
        </p>
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
