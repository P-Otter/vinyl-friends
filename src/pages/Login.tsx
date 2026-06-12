import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, isPremium } from '../auth-context';
import SpotifyLoginButton from '../components/SpotifyLoginButton';

export default function Login() {
  const { status, user, error, login, logout, configured } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'authenticated' && isPremium(user?.product)) {
      navigate('/setup', { replace: true });
    }
  }, [status, user, navigate]);

  const premiumProblem =
    status === 'authenticated' && user && !isPremium(user.product);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
      <h1 className="mb-2 text-5xl font-extrabold tracking-tight">
        HITSTER <span className="text-accent">FRIENDS</span>
      </h1>
      <p className="mb-10 text-slate-400">das Musikspiel mit deiner Crew</p>

      {!configured && (
        <div className="mb-6 max-w-md rounded-xl bg-red-500/10 p-4 text-sm text-red-300">
          Spotify ist nicht konfiguriert. Lege eine <code>.env</code> mit{' '}
          <code>VITE_SPOTIFY_CLIENT_ID</code> an — siehe README.
        </div>
      )}

      {premiumProblem ? (
        <div className="max-w-md space-y-4">
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
          <p className="mt-4 text-xs text-slate-500">benötigt Spotify Premium beim Host</p>
        </>
      )}

      {error && status === 'error' && (
        <p className="mt-6 max-w-md text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
