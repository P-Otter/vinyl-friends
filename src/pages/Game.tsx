import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer';
import { usePreviewPlayer } from '../hooks/usePreviewPlayer';
import { useTheme } from '../hooks/useTheme';
import { randomOffsetMs } from '../lib/queue-builder';
import { sortByYear } from '../lib/scoring';
import Timeline from '../components/Timeline';
import PlayControls from '../components/PlayControls';
import PlayerHUD from '../components/PlayerHUD';
import RevealOverlay from '../components/RevealOverlay';

export default function Game() {
  const navigate = useNavigate();
  const t = useTheme();
  const {
    phase,
    settings,
    queue,
    currentTrackIndex,
    players,
    currentPlayerIdx,
    round,
    lastResult,
    placeCard,
    nextPlayer,
    skipTrack,
  } = useGameState();

  // Flüssige Fortschrittsanzeige (500-ms-Ticker). Auf langsamen Geräten abschaltbar,
  // weil die häufigen Re-Renders das Audio des Web Playback SDK ruckeln lassen können.
  // In localStorage gemerkt, damit die Wahl Runden überlebt.
  const [smoothProgress, setSmoothProgress] = useState(
    () => localStorage.getItem('hf:smoothProgress') !== '0',
  );
  useEffect(() => {
    localStorage.setItem('hf:smoothProgress', smoothProgress ? '1' : '0');
  }, [smoothProgress]);

  // Beide Hooks IMMER aufrufen (Hook-Regel) — aktiv ist nur eine Quelle:
  // Spotify Web Playback SDK oder 30s-iTunes-Hörproben (Ohne-Spotify-Modus).
  const isPreviewMode = settings.musicSource === 'preview';
  const spotify = useSpotifyPlayer(!isPreviewMode, smoothProgress);
  const preview = usePreviewPlayer();
  const player = isPreviewMode ? preview : spotify;

  const track = queue[currentTrackIndex];
  const activePlayer = players[currentPlayerIdx];
  const sortedCards = useMemo(
    () => (activePlayer ? sortByYear(activePlayer.cards) : []),
    [activePlayer],
  );

  const [started, setStarted] = useState(false);
  const [selectedGap, setSelectedGap] = useState<number | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Neue Runde → lokalen Rundenzustand zurücksetzen + Hörprobe stoppen
  // (sonst liefe der alte Song nach einem Skip weiter). Der Generations-
  // Zähler invalidiert zusätzlich noch schwebende startSong-Aufrufe.
  useEffect(() => {
    playGenRef.current += 1;
    setStarted(false);
    setSelectedGap(null);
    setPlayError(null);
    setBusy(false);
    preview.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrackIndex]);

  // Spielende → Endscreen.
  useEffect(() => {
    if (phase === 'finished') navigate('/end', { replace: true });
  }, [phase, navigate]);

  const targetCards = settings.winCondition.type === 'cards' ? settings.winCondition.n : 10;

  // Generationszähler gegen das Skip-Race: startet jemand einen Song und
  // skippt, während die Hörprobe noch lädt, darf das verspätete Ergebnis
  // weder abspielen noch die NEUE Runde als „gestartet" markieren.
  const playGenRef = useRef(0);

  const startSong = async () => {
    if (!track) return;
    const gen = ++playGenRef.current;
    setBusy(true);
    setPlayError(null);
    try {
      if (isPreviewMode) {
        // Verspätetes Abspielen nach Skip verhindert der Player selbst (Token).
        await preview.play(track);
        if (gen !== playGenRef.current) return;
      } else {
        const offset = settings.randomOffset ? randomOffsetMs(track.durationMs) : 0;
        await spotify.play(track.uri, offset);
        if (gen !== playGenRef.current) return;
      }
      setStarted(true);
    } catch (e) {
      if (gen !== playGenRef.current) return;
      const msg = e instanceof Error ? e.message : String(e);
      if (isPreviewMode) {
        setPlayError(msg + ' — Du kannst überspringen, ohne den Zug zu verlieren.');
      } else {
        // Geräte-/Verbindungsfehler (404 oder fehlgeschlagener Reconnect) ≠ Song-Problem:
        // dann hilft Neuladen, nicht Überspringen.
        const deviceLost = /\b404\b/.test(msg) || /Reconnect|ready|Player/i.test(msg);
        const hint = deviceLost
          ? ' — Player-Gerät verloren. Seite neu laden (F5) und neu mit Spotify verbinden.'
          : ' — Song evtl. nicht verfügbar. Du kannst überspringen, ohne den Zug zu verlieren.';
        setPlayError(msg + hint);
      }
    } finally {
      setBusy(false);
    }
  };

  const togglePlay = async () => {
    try {
      if (player.isPlaying) await player.pause();
      else await player.resume();
    } catch {
      /* ignore – UI-State korrigiert sich über SDK-Events */
    }
  };

  const confirmPlacement = async () => {
    if (!activePlayer || selectedGap === null) return;
    try {
      await player.pause();
    } catch {
      /* egal */
    }
    placeCard(activePlayer.id, selectedGap);
  };

  // Snippet-Modus: nach lengthSec automatisch pausieren.
  useEffect(() => {
    if (!started || !settings.snippetMode.enabled) return;
    const timeoutId = window.setTimeout(
      () => void player.pause().catch(() => {}),
      settings.snippetMode.lengthSec * 1000,
    );
    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, settings.snippetMode.enabled, settings.snippetMode.lengthSec]);

  if (!track || !activePlayer) {
    return (
      <p style={{ color: t.textMuted }}>Lade Spiel…</p>
    );
  }

  const playerReady = isPreviewMode || player.status === 'ready';

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between text-sm">
        <span className="font-bold" style={{ color: t.textMuted }}>
          Runde {round}
        </span>
        <span className="flex items-center gap-2 font-black" style={{ color: activePlayer.color }}>
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: activePlayer.color }} />
          {activePlayer.name} ist dran
        </span>
        <button
          className="underline disabled:opacity-40"
          style={{ color: t.textMuted }}
          onClick={skipTrack}
          disabled={busy}
        >
          Skip
        </button>
      </header>

      {!playerReady && (
        <div className="rounded-xl bg-yellow-500/10 p-4 text-sm text-yellow-200">
          {player.status === 'error'
            ? `Player-Fehler: ${player.error}`
            : 'Spotify-Player verbindet sich… (braucht Premium, kein Safari-Privatmodus)'}
        </div>
      )}

      <section className="panel">
        <PlayControls
          isPlaying={player.isPlaying}
          positionMs={player.positionMs}
          durationMs={player.durationMs || track.durationMs}
          started={started}
          onStart={startSong}
          onTogglePlay={togglePlay}
          disabled={!playerReady || busy}
        />
        {playError && (
          <p className="mt-3 text-sm font-semibold" style={{ color: t.bad }}>
            {playError}
          </p>
        )}
        {!isPreviewMode && (
          <label className="mt-3 flex items-center gap-2 text-xs" style={{ color: t.textMuted }}>
            <input
              type="checkbox"
              checked={smoothProgress}
              onChange={(e) => setSmoothProgress(e.target.checked)}
              className="accent-accent"
            />
            Flüssige Fortschrittsanzeige
            <span>— bei Rucklern ausschalten</span>
          </label>
        )}
      </section>

      <section className="panel space-y-4">
        <div className="flex items-center justify-between">
          <label className="field-label mb-0">Deine Timeline — wohin gehört der Song?</label>
          <span className="text-xs" style={{ color: t.textMuted }}>
            älter ← → neuer (Jahre erst beim Reveal)
          </span>
        </div>
        <Timeline
          cards={sortedCards}
          selectedGap={selectedGap}
          onSelectGap={setSelectedGap}
          disabled={!started}
        />
        <button
          className="btn-primary w-full"
          disabled={!started || selectedGap === null}
          onClick={confirmPlacement}
        >
          Platzieren &amp; aufdecken
        </button>
        {!started && (
          <p className="text-xs" style={{ color: t.textMuted }}>
            Erst „Song starten" — dann eine Position wählen.
          </p>
        )}
      </section>

      <section>
        <h2 className="field-label">Spielstand</h2>
        <PlayerHUD
          players={players}
          currentPlayerId={activePlayer.id}
          targetCards={targetCards}
        />
      </section>

      {phase === 'reveal' && lastResult && (
        <RevealOverlay result={lastResult} onNext={nextPlayer} />
      )}
    </div>
  );
}
