import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleCallback } from '../lib/spotify-auth';
import { useAuth } from '../auth-context';

export default function Callback() {
  const navigate = useNavigate();
  const { reload } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    // StrictMode mountet doppelt — den Token-Exchange nur einmal ausführen.
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const authError = params.get('error');

    if (authError) {
      setError(`Spotify-Login abgebrochen: ${authError}`);
      return;
    }
    if (!code || !state) {
      setError('Kein Authorization-Code im Callback gefunden.');
      return;
    }

    handleCallback(code, state)
      .then(() => reload())
      .then(() => navigate('/setup', { replace: true }))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      );
  }, [navigate, reload]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      {error ? (
        <div className="max-w-md space-y-4">
          <p className="text-red-400">{error}</p>
          <button className="btn-ghost" onClick={() => navigate('/', { replace: true })}>
            Zurück zum Login
          </button>
        </div>
      ) : (
        <p className="text-slate-400">Login wird abgeschlossen…</p>
      )}
    </div>
  );
}
