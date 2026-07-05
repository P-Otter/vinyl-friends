import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { useAuth } from '../auth-context';
import PlaylistPicker from '../components/PlaylistPicker';
import ThemeChips from '../components/ThemeChips';
import MixSlider from '../components/MixSlider';
import ThemePicker from '../components/theme/ThemePicker';
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
    hint: 'Braucht X Karten, davon Y validiert (Jahr exakt, Titel/Artist tippfehlertolerant). Andere dürfen falsche Platzierungen und schwache Tipps stehlen.',
  },
  {
    id: 'plattenboerse',
    label: 'Plattenbörse 📀',
    hint: 'Catan-inspiriert: jeder Treffer bringt eine Dekaden-Marke. Marken mit anderen tauschen, volle Sätze gegen Bonuspunkte einlösen.',
  },
  {
    id: 'vinyl-uno',
    label: 'Vinyl! 🔄',
    hint: 'Echtes Kartenspiel: jede*r hat eine Hand aus dem 32er-Deck (Reverse, Skip, Zieh-1/2, Wunschkarte, Tausch, 2-für-1). Vor dem Song eine Karte wählen — bei Treffer wird ihr Effekt gültig, sonst 1 Strafkarte. Wer zuerst leer ist, gewinnt.',
  },
  {
    id: 'plus-minus',
    label: 'Plus/Minus ➕➖',
    hint: 'Die einfache Variante von Vinyl!: kein Kartendeck, keine Sondereffekte. Richtig platziert = −1 Karte, falsch = +1 Karte. Wer zuerst leer ist, gewinnt.',
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

      <ThemePicker />

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

      </section>

      {settings.mode === 'vinyl-uno' ? (
        <section className="panel space-y-3">
          <label className="field-label">Starthand-Größe</label>
          <p className="text-sm text-slate-400">
            Richtet sich automatisch nach der Spieleranzahl (2-4 Spieler: 7 Karten,
            mehr Spieler: entsprechend weniger) — die genaue Zahl siehst du auf der
            nächsten Seite, sobald alle Spieler eingetragen sind.
          </p>
        </section>
      ) : settings.mode === 'plus-minus' ? (
        <section className="panel space-y-3">
          <label className="field-label">Start-Kartenzahl</label>
          <div className="flex items-center gap-2">
            Jede Person startet mit
            <input
              type="number"
              min={3}
              max={15}
              value={settings.plusMinusStartCards}
              onChange={(e) => setSettings({ plusMinusStartCards: Number(e.target.value) })}
              className="w-20 rounded-lg bg-panel2 px-3 py-2 text-center"
            />
            Karten auf der Hand
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
                setSettings({
                  winCondition: { type: 'cards', n: Number(e.target.value) },
                  requiredMastered: Math.min(settings.requiredMastered, Number(e.target.value)),
                })
              }
              className="w-20 rounded-lg bg-panel2 px-3 py-2 text-center"
            />
            Karten gewinnt
          </div>

          {settings.mode === 'name-that-tune' && (
            <>
              <div className="flex items-center gap-2 border-t border-white/10 pt-3">
                Davon
                <input
                  type="number"
                  min={1}
                  max={winN}
                  value={settings.requiredMastered}
                  onChange={(e) => setSettings({ requiredMastered: Number(e.target.value) })}
                  className="w-20 rounded-lg bg-panel2 px-3 py-2 text-center"
                />
                validiert (Jahr/Titel/Artist)
              </div>
              <div>
                <span className="mb-1 block text-xs text-slate-400">Wann zählt eine Karte als validiert?</span>
                <div className="flex gap-2">
                  {[2, 3].map((n) => (
                    <button
                      key={n}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${settings.masteryThreshold === n ? 'bg-accent text-black' : 'bg-panel2 text-slate-300'}`}
                      onClick={() => setSettings({ masteryThreshold: n })}
                    >
                      {n === 2 ? '2 von 3 reichen' : 'alle 3 nötig'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
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
