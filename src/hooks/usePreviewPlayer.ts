// 30s-Hörproben-Player für den Ohne-Spotify-Modus — HTMLAudio statt
// Spotify Web Playback SDK, gleiche Oberfläche wie useSpotifyPlayer,
// damit Game.tsx nur die Quelle umschalten muss. Läuft überall (auch iOS-Safari).
import { useCallback, useEffect, useRef, useState } from 'react';
import { resolvePreviewUrl } from '../lib/itunes';
import type { Track } from '../types';

type PreviewState = {
  status: 'ready' | 'error';
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  error: string | null;
};

// Stilles Mini-WAV (44 Bytes). iOS-Safari erlaubt audio.play() nur aus einer
// User-Geste — muss vor play() aber erst ein Netz-Request laufen (Hörproben-
// Auflösung), ist die Gesten-Kette gerissen. Trick: das Element noch IN der
// Geste einmal mit dieser stillen Quelle abspielen ("freischalten") — danach
// darf dasselbe Element auch nach dem await programmatisch abspielen.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

export function usePreviewPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);
  // Jeder play()-Aufruf bekommt ein Token; stop()/neues play() entwerten es.
  // Verhindert, dass eine langsam aufgelöste Hörprobe (JSONP) nach einem
  // Skip/Trackwechsel verspätet losspielt und den aktuellen Song überschreibt.
  const playTokenRef = useRef(0);
  const [state, setState] = useState<PreviewState>({
    status: 'ready',
    isPlaying: false,
    positionMs: 0,
    durationMs: 30_000,
    error: null,
  });

  // Ein einziges Audio-Element für die ganze Session.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const onTime = () =>
      setState((s) => ({
        ...s,
        positionMs: Math.round(audio.currentTime * 1000),
        durationMs: Number.isFinite(audio.duration) && audio.duration > 0
          ? Math.round(audio.duration * 1000)
          : s.durationMs,
      }));
    const onPlay = () => setState((s) => ({ ...s, isPlaying: true }));
    const onPause = () => setState((s) => ({ ...s, isPlaying: false }));
    const onEnded = () => setState((s) => ({ ...s, isPlaying: false }));

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  /** Hörprobe des Tracks laden + abspielen. Muss aus einer User-Geste heraus
   *  aufgerufen werden (iOS-Autoplay-Regel) — ist es: der „Song starten"-Button. */
  const play = useCallback(async (track: Track) => {
    const audio = audioRef.current;
    if (!audio) return;
    const token = ++playTokenRef.current;
    let url = track.previewUrl;
    if (!url) {
      // Gleich folgt ein await (Hörproben-Auflösung) — vorher das Element
      // noch synchron in der Geste freischalten, sonst blockt iOS das play().
      if (!unlockedRef.current) {
        unlockedRef.current = true;
        audio.src = SILENT_WAV;
        void audio.play().catch(() => {});
      }
      url = await resolvePreviewUrl(track.artist, track.name, track.id);
      if (token !== playTokenRef.current) return; // inzwischen geskippt/gestoppt
    }
    if (audio.src !== url) {
      audio.src = url;
      audio.currentTime = 0;
    }
    await audio.play();
    setState((s) => ({ ...s, error: null, positionMs: 0 }));
  }, []);

  const pause = useCallback(async () => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(async () => {
    await audioRef.current?.play();
  }, []);

  const stop = useCallback(() => {
    playTokenRef.current += 1; // schwebende play()-Aufrufe entwerten
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  return { ...state, play, pause, resume, stop };
}
