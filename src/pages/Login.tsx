import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, isPremium } from '../auth-context';
import { useGameState } from '../hooks/useGameState';
import { useTheme } from '../hooks/useTheme';
import VinylDisc from '../components/theme/VinylDisc';
import ThemePicker from '../components/theme/ThemePicker';
import ThemedTitle from '../components/theme/ThemedTitle';
import SpotifyLoginButton from '../components/SpotifyLoginButton';

export default function Login() {
  const { status, user, error, login, logout, configured } = useAuth();
  const { setSettings } = useGameState();
  const navigate = useNavigate();
  const t = useTheme();

  useEffect(() => {
    if (status === 'authenticated' && isPremium(user?.product)) {
      setSettings({ musicSource: 'spotify' });
      navigate('/setup', { replace: true });
    }
  }, [status, user, navigate, setSettings]);

  const premiumProblem =
    status === 'authenticated' && user && !isPremium(user.product);

  const startPool = () => {
    setSettings({ musicSource: 'preview' });
    navigate('/pool');
  };

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
      <span className="mb-3 text-2xl" style={{ color: t.highlight }}>
        ♛
      </span>
      <VinylDisc spinning size={140} />
      <ThemedTitle size={42} className="mb-2 mt-6">
        {t.uppercaseTitles ? 'VINYL FRIENDS' : 'Vinyl Friends'}
      </ThemedTitle>
      <p className="mb-8 font-semibold" style={{ color: t.textMuted }}>
        Hör den Song. Schätze das Jahr. Bau deine Zeitleiste!
      </p>

      <ThemePicker />

      <div className="mt-6 w-full max-w-md space-y-4">
        <button className="btn-primary w-full py-4 text-lg" onClick={startPool}>
          ▶ Spielen — eigenen Pool bauen
        </button>
        <p className="text-xs" style={{ color: t.textMuted }}>
          Ohne Konto, läuft überall — Song-Packs, Suche &amp; 30s-Hörproben.
        </p>

        <div className="flex items-center gap-3 py-2 text-xs" style={{ color: t.textMuted }}>
          <span className="h-px flex-1" style={{ background: t.surfaceStroke, opacity: 0.3 }} />
          oder
          <span className="h-px flex-1" style={{ background: t.surfaceStroke, opacity: 0.3 }} />
        </div>

        {premiumProblem ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-yellow-500/10 p-4 text-sm text-yellow-200">
              Dein Account ist <b>{user?.product}</b> — der Host braucht <b>Spotify Premium</b>,
              weil das Web Playback SDK sonst nicht abspielt.
            </div>
            <button className="btn-ghost w-full" onClick={logout}>
              Anderen Account verwenden
            </button>
          </div>
        ) : (
          <>
            <SpotifyLoginButton onClick={login} disabled={!configured || status === 'loading'} />
            <p className="text-xs" style={{ color: t.textMuted }}>
              Mit euren echten Playlists — benötigt Spotify Premium beim Host.
              <br />
              Nur für Accounts, die der Host manuell freigeschaltet hat (Spotifys
              Entwickler-Limit) — sonst bitte den Pool-Modus oben nutzen.
            </p>
          </>
        )}
        {!configured && (
          <p className="text-xs" style={{ color: t.textMuted }}>
            (Spotify ist auf diesem Server nicht konfiguriert — der Pool-Modus oben
            funktioniert trotzdem.)
          </p>
        )}
      </div>

      {error && status === 'error' && (
        <p className="mt-6 max-w-md text-sm" style={{ color: t.bad }}>
          {error}
        </p>
      )}
    </div>
  );
}
