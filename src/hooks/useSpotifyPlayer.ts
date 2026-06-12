import { useCallback, useEffect, useRef, useState } from 'react';
import { getValidAccessToken } from '../lib/spotify-auth';
import {
  pausePlayback,
  playTrack as apiPlayTrack,
  seek as apiSeek,
  transferPlayback,
} from '../lib/spotify-api';

const SDK_SRC = 'https://sdk.scdn.co/spotify-player.js';

export type PlayerStatus = 'idle' | 'loading' | 'ready' | 'error';

type PlayerState = {
  status: PlayerStatus;
  deviceId: string | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  error: string | null;
};

let sdkLoading: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (window.Spotify) return Promise.resolve();
  if (sdkLoading) return sdkLoading;
  sdkLoading = new Promise<void>((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    const script = document.createElement('script');
    script.src = SDK_SRC;
    script.async = true;
    script.onerror = () => reject(new Error('Spotify Web Playback SDK Script konnte nicht geladen werden.'));
    document.body.appendChild(script);
  });
  return sdkLoading;
}

/**
 * Initialisiert den Web Playback SDK Player und gibt Steuerfunktionen zurück.
 * Hält Position/Playing-State über die SDK-Events aktuell.
 */
export function useSpotifyPlayer(enabled: boolean, smoothProgress = true) {
  const [state, setState] = useState<PlayerState>({
    status: 'idle',
    deviceId: null,
    isPlaying: false,
    positionMs: 0,
    durationMs: 0,
    error: null,
  });
  const playerRef = useRef<Spotify.Player | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  // Auf das nächste `ready`-Event wartende Resolver — für reconnect() nach einem
  // Abriss der Dealer-WebSocket, der eine frische device_id liefert.
  const readyWaitersRef = useRef<((id: string) => void)[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let player: Spotify.Player | null = null;

    setState((s) => ({ ...s, status: 'loading' }));

    loadSdk()
      .then(() => {
        if (cancelled) return;
        player = new window.Spotify.Player({
          name: 'Hitster Friends',
          getOAuthToken: (cb) => {
            void getValidAccessToken().then(cb);
          },
          volume: 0.8,
        });
        playerRef.current = player;

        player.addListener('ready', ({ device_id }) => {
          deviceIdRef.current = device_id;
          setState((s) => ({ ...s, status: 'ready', deviceId: device_id, error: null }));
          // Wartende reconnect()-Aufrufe mit der frischen device_id auflösen.
          readyWaitersRef.current.splice(0).forEach((fn) => fn(device_id));
          // Dieses Gerät zum aktiven Wiedergabegerät machen, damit /play zuverlässig
          // hier landet (und nicht auf einem anderen offenen Spotify-Client).
          void transferPlayback(device_id, false).catch(() => {});
        });
        player.addListener('not_ready', ({ device_id }) => {
          setState((s) => ({ ...s, deviceId: s.deviceId === device_id ? null : s.deviceId }));
        });
        player.addListener('player_state_changed', (ps) => {
          if (!ps) return;
          setState((s) => ({
            ...s,
            isPlaying: !ps.paused,
            positionMs: ps.position,
            durationMs: ps.duration,
          }));
        });
        const fail = (msg: string) => setState((s) => ({ ...s, status: 'error', error: msg }));
        player.addListener('initialization_error', ({ message }) => fail(message));
        player.addListener('authentication_error', ({ message }) => fail(message));
        player.addListener('account_error', ({ message }) =>
          fail(`Account-Fehler (Premium nötig?): ${message}`),
        );

        return player.connect();
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          status: 'error',
          error: e instanceof Error ? e.message : String(e),
        }));
      });

    return () => {
      cancelled = true;
      player?.disconnect();
      playerRef.current = null;
    };
  }, [enabled]);

  // Position-Ticker während Wiedergabe (SDK liefert nur bei Events, wir wollen flüssig).
  // Abschaltbar (smoothProgress=false): spart auf langsamen Geräten die 500-ms-Re-Renders,
  // die das Audio des SDK ruckeln lassen können — die Leiste springt dann nur bei
  // SDK-Events (Start/Pause/Seek) statt sanimiert mitzulaufen.
  useEffect(() => {
    if (!smoothProgress) return;
    if (!state.isPlaying) return;
    const t = window.setInterval(() => {
      setState((s) =>
        s.isPlaying
          ? { ...s, positionMs: Math.min(s.positionMs + 500, s.durationMs || s.positionMs + 500) }
          : s,
      );
    }, 500);
    return () => window.clearInterval(t);
  }, [state.isPlaying, smoothProgress]);

  // Stellt die Verbindung zum Spotify-Dealer wieder her und wartet auf eine frische
  // device_id. Nötig, wenn die WebSocket abreißt ("network connection was lost") und
  // das Gerät serverseitig verschwindet — dann liefert /play 404 und ein bloßer
  // transfer auf die alte device_id schlägt ebenfalls fehl.
  const reconnect = useCallback(async (): Promise<string> => {
    const p = playerRef.current;
    if (!p) throw new Error('Player nicht initialisiert.');
    const waitForReady = new Promise<string>((resolve, reject) => {
      readyWaitersRef.current.push(resolve);
      window.setTimeout(() => reject(new Error('Reconnect-Timeout (kein ready)')), 12000);
    });
    // WICHTIG: erst disconnect, dann connect. Ein bloßes connect() ist ein No-Op, wenn
    // das SDK sich noch für verbunden hält (tote WebSocket) — dann kommt nie ein neues
    // `ready` und wir laufen in den Timeout. Der Teardown erzwingt ein frisches `ready`.
    deviceIdRef.current = null;
    try {
      p.disconnect();
    } catch {
      /* egal */
    }
    await new Promise((r) => setTimeout(r, 300));
    await p.connect();
    const id = await waitForReady;
    await transferPlayback(id, false).catch(() => {});
    return id;
  }, []);

  const play = useCallback(async (uri: string, positionMs = 0) => {
    const id = deviceIdRef.current;
    if (!id) throw new Error('Player noch nicht bereit.');
    // WICHTIG: Audio-Element im Nutzer-Gesten-Kontext freischalten, sonst blockiert
    // die Browser-Autoplay-Policy den ersten Ton (klassische SDK-Falle: man hört sonst
    // erst den alten Track und muss zum „Aufwecken" pausieren/fortsetzen).
    try {
      await playerRef.current?.activateElement();
    } catch {
      /* aktivierung optional – manche Browser brauchen sie nicht */
    }
    try {
      await apiPlayTrack(id, uri, positionMs);
    } catch (e) {
      // 404 „Device not found": SDK-Gerät ist serverseitig weg (Dealer-WebSocket
      // abgerissen, z. B. zwischen zwei Songs). Player neu verbinden, auf die neue
      // device_id warten und genau einmal erneut abspielen.
      if (e instanceof Error && /\b404\b/.test(e.message)) {
        const freshId = await reconnect();
        try {
          await playerRef.current?.activateElement();
        } catch {
          /* optional */
        }
        await new Promise((r) => setTimeout(r, 400));
        await apiPlayTrack(freshId, uri, positionMs);
      } else {
        throw e;
      }
    }
  }, [reconnect]);

  const resume = useCallback(async () => {
    await playerRef.current?.resume();
  }, []);

  const pause = useCallback(async () => {
    const id = deviceIdRef.current;
    if (id) await pausePlayback(id);
    else await playerRef.current?.pause();
  }, []);

  const seek = useCallback(async (positionMs: number) => {
    const id = deviceIdRef.current;
    if (id) await apiSeek(id, positionMs);
  }, []);

  return { ...state, play, resume, pause, seek };
}
