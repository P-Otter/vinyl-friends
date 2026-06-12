import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer';
import { randomOffsetMs } from '../lib/queue-builder';
import { sortByYear } from '../lib/scoring';
import Timeline from '../components/Timeline';
import PlayControls from '../components/PlayControls';
import PlayerHUD from '../components/PlayerHUD';
import RevealOverlay from '../components/RevealOverlay';

export default function Game() {
  const navigate = useNavigate();
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

  const player = useSpotifyPlayer(true, smoothProgress);

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

  // Neue Runde → lokalen Rundenzustand zurücksetzen.
  useEffect(() => {
    setStarted(false);
    setSelectedGap(null);
    setPlayError(null);
  }, [currentTrackIndex]);

  // Spielende → Endscreen.
  useEffect(() => {
    if (phase === 'finished') navigate('/end', { replace: true });
  }, [phase, navigate]);

  const targetCards = settings.winCondition.type === 'cards' ? settings.winCondition.n : 10;

  const startSong = async () => {
    if (!track) return;
    setBusy(true);
    setPlayError(null);
    try {
      const offset = settings.randomOffset ? randomOffsetMs(track.durationMs) : 0;
      await player.play(track.uri, offset);
      setStarted(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Geräte-/Verbindungsfehler (404 oder fehlgeschlagener Reconnect) ≠ Song-Problem:
      // dann hilft Neuladen, nicht Überspringen.
      const deviceLost = /\b404\b/.test(msg) || /Reconnect|ready|Player/i.test(msg);
      const hint = deviceLost
        ? ' — Player-Gerät verloren. Seite neu laden (F5) und neu mit Spotify verbinden.'
        : ' — Song evtl. nicht verfügbar. Du kannst überspringen, ohne den Zug zu verlieren.';
      setPlayError(msg + hint);
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
    const t = window.setTimeout(
      () => void player.pause().catch(() => {}),
      settings.snippetMode.lengthSec * 1000,
    );
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, settings.snippetMode.enabled, settings.snippetMode.lengthSec]);

  if (!track || !activePlayer) {
    return <p className="text-slate-400">Lade Spiel…</p>;
  }

  const playerReady = player.status === 'ready';

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between text-sm">
        <span className="text-slate-400">Runde {round}</span>
        <span className="flex items-center gap-2 font-semibold">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: activePlayer.color }} />
          {activePlayer.name} ist dran
        </span>
        <button className="text-slate-400 underline hover:text-slate-200" onClick={skipTrack}>
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
        {playError && <p className="mt-3 text-sm text-red-300">{playError}</p>}
        <label className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={smoothProgress}
            onChange={(e) => setSmoothProgress(e.target.checked)}
            className="accent-accent"
          />
          Flüssige Fortschrittsanzeige
          <span className="text-slate-500">— bei Rucklern ausschalten</span>
        </label>
      </section>

      <section className="panel space-y-4">
        <div className="flex items-center justify-between">
          <label className="field-label mb-0">Deine Timeline — wohin gehört der Song?</label>
          <span className="text-xs text-slate-500">
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
          Platzieren & aufdecken
        </button>
        {!started && (
          <p className="text-xs text-slate-500">
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
