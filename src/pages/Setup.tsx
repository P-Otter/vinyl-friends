import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { useAuth } from '../auth-context';
import PlaylistPicker from '../components/PlaylistPicker';
import ThemeChips from '../components/ThemeChips';
import MixSlider from '../components/MixSlider';
import type { GameMode } from '../types';

const MODES: { id: GameMode; label: string; hint: string }[] = [
  {
    id: 'classic-relative',
    label: 'Klassisch — Reihenfolge (ohne Jahre)',
    hint: 'Karte chronologisch einsortieren, Jahr erst beim Aufdecken.',
  },
  {
    id: 'whose-fave',
    label: 'Wessen Liebling?',
    hint: 'Zusätzlich raten, wer den Song zur Playlist hinzugefügt hat — Bonuspunkt für die Gruppe. Braucht eine Friends-Playlist (nicht bei reinem Theme-Mix).',
  },
  {
    id: 'name-that-tune',
    label: 'Artist & Titel raten',
    hint: 'Nach richtiger Platzierung Titel & Künstler erraten — optional mit Risiko-Wette.',
  },
  {
    id: 'plattenboerse',
    label: 'Plattenbörse 📀',
    hint: 'Catan-inspiriert: jeder Treffer bringt eine Dekaden-Marke. Marken mit anderen tauschen, volle Sätze gegen Bonuspunkte einlösen.',
  },
  {
    id: 'vinyl-uno',
    label: 'Vinyl! 🔄',
    hint: 'UNO-inspiriert: alle starten mit einer Hand voll Songs. Richtig = Karte weg, falsch = Karte dazu. Wer zuerst leer ist, gewinnt — plus Zufalls-Ereignisse.',
  },
];

export default function Setup() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { settings, setSettings } = useGameState();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const winN = settings.winCondition.type === 'cards' ? settings.winCondition.n : 10;
  const canContinue = Boolean(settings.friendsPlaylistId);

  const toggleTheme = (id: string) => {
    const enabled = settings.enabledThemes.includes(id)
      ? settings.enabledThemes.filter((t) => t !== id)
      : [...settings.enabledThemes, id];
    setSettings({ enabledThemes: enabled });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Setup</h1>
        <div className="text-right text-sm text-slate-400">
          {user?.display_name ?? 'Spotify'} ·{' '}
          <button className="underline hover:text-slate-200" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <section className="panel space-y-3">
        <label className="field-label">Friends-Playlist</label>
        <PlaylistPicker
          value={settings.friendsPlaylistId}
          onChange={(id, name) =>
            setSettings({ friendsPlaylistId: id, friendsPlaylistName: name })
          }
        />
        <p className="text-xs text-slate-500">
          Tipp: eine <i>collaborative</i> Playlist nehmen, zu der alle ihre Lieblingssongs
          hinzufügen.
        </p>
      </section>

      <section className="panel space-y-4">
        <div>
          <label className="field-label">Themes dazumischen (optional)</label>
          <ThemeChips enabled={settings.enabledThemes} onToggle={toggleTheme} />
        </div>
        <div>
          <label className="field-label">Mischverhältnis</label>
          <MixSlider
            value={settings.friendsRatio}
            onChange={(v) => setSettings({ friendsRatio: v })}
            disabled={settings.enabledThemes.length === 0}
          />
          {settings.enabledThemes.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">
              Aktiviere ein Theme, um den Mix zu nutzen — sonst spielen nur Friends-Songs.
            </p>
          )}
        </div>
      </section>

      <section className="panel space-y-3">
        <label className="field-label">Modus</label>
        {MODES.map((m) => {
          const checked = settings.mode === m.id || (m.id === 'classic-relative' && settings.mode === 'classic-year');
          return (
            <label key={m.id} className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1">
              <input
                type="radio"
                name="mode"
                className="accent-accent mt-1"
                checked={checked}
                onChange={() => setSettings({ mode: m.id })}
              />
              <span>
                <span className="block font-semibold">{m.label}</span>
                <span className="block text-xs text-slate-400">{m.hint}</span>
              </span>
            </label>
          );
        })}

        {settings.mode === 'name-that-tune' && (
          <label className="flex items-center justify-between rounded-lg bg-panel2 px-3 py-2 text-sm">
            <span>
              Risiko-Wette erlauben
              <span className="block text-xs text-slate-400">
                Vor der Auflösung wetten: beide richtig = doppelter Bonus, falsch = Karte weg.
              </span>
            </span>
            <input
              type="checkbox"
              className="accent-accent"
              checked={settings.wager}
              onChange={(e) => setSettings({ wager: e.target.checked })}
            />
          </label>
        )}
      </section>

      {settings.mode === 'vinyl-uno' ? (
        <section className="panel space-y-3">
          <label className="field-label">Starthand-Größe</label>
          <div className="flex items-center gap-2">
            Jede*r startet mit
            <input
              type="number"
              min={4}
              max={12}
              value={settings.startingHandSize}
              onChange={(e) => setSettings({ startingHandSize: Number(e.target.value) })}
              className="w-20 rounded-lg bg-panel2 px-3 py-2 text-center"
            />
            Songs auf der Hand — wer zuerst leer ist, gewinnt.
          </div>
        </section>
      ) : (
        <section className="panel space-y-3">
          <label className="field-label">Win-Condition</label>
          <div className="flex items-center gap-2">
            Erste*r mit
            <input
              type="number"
              min={3}
              max={30}
              value={winN}
              onChange={(e) =>
                setSettings({ winCondition: { type: 'cards', n: Number(e.target.value) } })
              }
              className="w-20 rounded-lg bg-panel2 px-3 py-2 text-center"
            />
            Karten gewinnt
          </div>
        </section>
      )}

      <section className="panel">
        <button
          className="field-label flex w-full items-center justify-between"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          <span>⚙ Mehr Einstellungen</span>
          <span>{showAdvanced ? '▴' : '▾'}</span>
        </button>
        {showAdvanced && (
          <div className="mt-4 space-y-4 text-sm">
            <label className="flex items-center justify-between">
              <span>
                Jahres-Modus (absolute Jahre, ±{settings.yearTolerance}-Toleranz)
              </span>
              <input
                type="checkbox"
                className="accent-accent"
                checked={settings.mode === 'classic-year'}
                onChange={(e) =>
                  setSettings({ mode: e.target.checked ? 'classic-year' : 'classic-relative' })
                }
              />
            </label>
            <label className="flex items-center justify-between">
              <span>Spread-Boost (Themes strecken die Timeline)</span>
              <input
                type="checkbox"
                className="accent-accent"
                checked={settings.spreadBoost}
                onChange={(e) => setSettings({ spreadBoost: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between">
              <span>Random Start-Offset (verhindert Intro-Erkennung)</span>
              <input
                type="checkbox"
                className="accent-accent"
                checked={settings.randomOffset}
                onChange={(e) => setSettings({ randomOffset: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between">
              <span>Explicit-Songs erlauben</span>
              <input
                type="checkbox"
                className="accent-accent"
                checked={settings.allowExplicit}
                onChange={(e) => setSettings({ allowExplicit: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span>Min. Songlänge (Sek.)</span>
              <input
                type="number"
                min={0}
                max={300}
                value={settings.minTrackLengthSec}
                onChange={(e) => setSettings({ minTrackLengthSec: Number(e.target.value) })}
                className="w-20 rounded-lg bg-panel2 px-3 py-1 text-center"
              />
            </label>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <button
          className="btn-primary"
          disabled={!canContinue}
          onClick={() => navigate('/players')}
        >
          Weiter → Spieler
        </button>
      </div>
    </div>
  );
}
