import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, isPremium } from '../auth-context';
import { useGameState } from '../hooks/useGameState';
import SpotifyLoginButton from '../components/SpotifyLoginButton';

export default function Login() {
  const { status, user, error, login, logout, configured } = useAuth();
  const { setSettings } = useGameState();
  const navigate = useNavigate();

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
      <h1 className="mb-2 text-5xl font-extrabold tracking-tight">
        VINYL <span className="text-accent">FRIENDS</span>
      </h1>
      <p className="mb-10 text-slate-400">
        Hör den Song. Schätze das Jahr. Bau deine Zeitleiste!
      </p>

      <div className="w-full max-w-md space-y-4">
        <button className="btn-primary w-full py-4 text-lg" onClick={startPool}>
          ▶ Spielen — eigenen Pool bauen
        </button>
        <p className="text-xs text-slate-500">
          Ohne Konto, läuft überall — Song-Packs, Suche & 30s-Hörproben.
        </p>

        <div className="flex items-center gap-3 py-2 text-xs text-slate-600">
          <span className="h-px flex-1 bg-slate-700" />
          oder
          <span className="h-px flex-1 bg-slate-700" />
        </div>

        {premiumProblem ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-yellow-500/10 p-4 text-sm text-yellow-200">
              Dein Account ist <b>{user?.product}</b> — der Host braucht <b>Spotify Premium</b>,
              weil das Web Playback SDK sonst nicht abspielt.
            </div>
            <button className="btn-ghost" onClick={logout}>
              Anderen Account verwenden
            </button>
          </div>
        ) : (
          <>
            <SpotifyLoginButton onClick={login} disabled={!configured || status === 'loading'} />
            <p className="text-xs text-slate-500">
              Mit euren echten Playlists — benötigt Spotify Premium beim Host.
            </p>
          </>
        )}
        {!configured && (
          <p className="text-xs text-slate-600">
            (Spotify ist auf diesem Server nicht konfiguriert — der Pool-Modus oben
            funktioniert trotzdem.)
          </p>
        )}
      </div>

      {error && status === 'error' && (
        <p className="mt-6 max-w-md text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
