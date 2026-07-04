import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState, decadesInQueue } from '../hooks/useGameState';
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer';
import { usePreviewPlayer } from '../hooks/usePreviewPlayer';
import { useTheme } from '../hooks/useTheme';
import { randomOffsetMs } from '../lib/queue-builder';
import { sortByYear } from '../lib/scoring';
import Timeline from '../components/Timeline';
import PlayControls from '../components/PlayControls';
import PlayerHUD from '../components/PlayerHUD';
import RevealOverlay from '../components/RevealOverlay';
import MarketPanel from '../components/MarketPanel';

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
    resetGame,
    awardFaveGuess,
    submitTuneGuess,
    submitTuneSteal,
    finishTuneRound,
    tradeTokens,
    redeemSet,
  } = useGameState();
  // Im Ohne-Spotify-Modus führt "Verlassen" zurück zum Pool, nicht zum Spotify-Setup
  // (gleiche Logik wie End.tsx beim regulären Spielende).
  const setupPath = settings.musicSource === 'preview' ? '/pool' : '/setup';
  const [confirmingExit, setConfirmingExit] = useState(false);
  // Zweistufiges Reveal: erst das eigene (aktualisierte) Spielfeld wieder sehen,
  // dann explizit "Nächstes Team" drücken — ein Klick schließt nicht mehr beides
  // auf einmal. Reine Anzeige-Präferenz für diese eine Runde, nicht persistiert.
  const [revealSeen, setRevealSeen] = useState(false);
  const isPlattenboerse = settings.mode === 'plattenboerse';
  const isVinylUno = settings.mode === 'vinyl-uno';
  const decades = useMemo(() => (isPlattenboerse ? decadesInQueue(queue) : []), [isPlattenboerse, queue]);

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
  // "Artist & Titel raten": die gerade platzierte Karte steht schon in der Timeline
  // (Farbe/Jahr korrekt), aber der Songname muss versteckt bleiben, bis der
  // komplette Rate-/Steal-Ablauf abgeschlossen ist — sonst verrät die Timeline
  // die Lösung (oder zumindest die Korrektheit) hinter dem Overlay.
  const tuneGuessPending =
    phase === 'reveal' && settings.mode === 'name-that-tune' && !lastResult?.tuneRoundFinished;

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
  // Sobald aufgedeckt wird, ist die Runde inhaltlich vorbei — kein Spielfeld
  // (auch das der aktiven Person) darf dann noch anklickbar sein.
  const canPlaceNow = started && phase === 'playing';

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
        <div className="flex items-center gap-3">
          <button
            className="underline disabled:opacity-40"
            style={{ color: t.textMuted }}
            onClick={skipTrack}
            disabled={busy || phase !== 'playing'}
          >
            Skip
          </button>
          <button className="underline" style={{ color: t.bad }} onClick={() => setConfirmingExit(true)}>
            Verlassen
          </button>
        </div>
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
          <label className="field-label mb-0">Spielfelder — wohin gehört der Song?</label>
          <span className="text-xs" style={{ color: t.textMuted }}>
            älter ← → neuer (Jahre erst beim Reveal)
          </span>
        </div>

        {players.map((p) => {
          const isActive = p.id === activePlayer.id;
          return (
            <div key={p.id} className={`space-y-1.5 ${isActive ? '' : 'opacity-45 grayscale'}`}>
              <div
                className="flex items-center gap-1.5 text-xs font-black"
                style={{ color: isActive ? p.color : t.textMuted }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
              </div>
              <Timeline
                cards={sortByYear(p.cards)}
                selectedGap={isActive ? selectedGap : null}
                onSelectGap={isActive ? setSelectedGap : () => {}}
                disabled={!isActive || !canPlaceNow}
                maskedCardId={isActive && tuneGuessPending ? lastResult?.track.id : undefined}
              />
            </div>
          );
        })}

        {phase === 'reveal' && revealSeen ? (
          <button
            className="btn-primary w-full"
            onClick={() => {
              setRevealSeen(false);
              nextPlayer();
            }}
          >
            Nächstes Team →
          </button>
        ) : (
          <>
            <button
              className="btn-primary w-full"
              disabled={!canPlaceNow || selectedGap === null}
              onClick={confirmPlacement}
            >
              Platzieren &amp; aufdecken
            </button>
            {!started && (
              <p className="text-xs" style={{ color: t.textMuted }}>
                Erst „Song starten" — dann eine Position wählen.
              </p>
            )}
          </>
        )}
      </section>

      <section>
        <h2 className="field-label">Spielstand</h2>
        <PlayerHUD
          players={players}
          currentPlayerId={activePlayer.id}
          targetCards={targetCards}
          isVinylUno={isVinylUno}
          isNameThatTune={settings.mode === 'name-that-tune'}
          requiredMastered={settings.requiredMastered}
        />
      </section>

      {isPlattenboerse && (
        <MarketPanel players={players} decades={decades} onTrade={tradeTokens} onRedeem={redeemSet} />
      )}

      {phase === 'reveal' && lastResult && !revealSeen && (
        <RevealOverlay
          result={lastResult}
          onNext={() => setRevealSeen(true)}
          mode={settings.mode}
          players={players}
          masteryThreshold={settings.masteryThreshold}
          onAwardFaveGuess={awardFaveGuess}
          onSubmitTuneGuess={submitTuneGuess}
          onSubmitTuneSteal={submitTuneSteal}
          onFinishTuneRound={finishTuneRound}
        />
      )}

      {confirmingExit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="w-full max-w-sm space-y-4 rounded-3xl p-6 text-center"
            style={{ background: t.surface, border: `${t.strokeWidth}px solid ${t.surfaceStroke}`, boxShadow: 'var(--t-shadow)' }}
          >
            <p className="text-lg font-black">Spiel wirklich verlassen?</p>
            <p className="text-sm" style={{ color: t.textMuted }}>
              Der aktuelle Fortschritt geht verloren.
            </p>
            <div className="flex gap-3">
              <button className="btn-ghost flex-1" onClick={() => setConfirmingExit(false)}>
                Abbrechen
              </button>
              <button
                className="flex-1 rounded-xl px-4 py-3 font-bold"
                style={{ background: `${t.bad}26`, color: t.bad, border: `${t.strokeWidth}px solid ${t.bad}` }}
                onClick={() => {
                  resetGame();
                  navigate(setupPath);
                }}
              >
                Ja, verlassen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
