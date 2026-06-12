import { useCallback, useEffect, useState } from 'react';
import {
  beginLogin,
  getValidAccessToken,
  hasSession,
  isConfigured,
  logout as authLogout,
} from '../lib/spotify-auth';
import { getMe, type SpotifyUser } from '../lib/spotify-api';

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'error';

type AuthState = {
  status: AuthStatus;
  user: SpotifyUser | null;
  error: string | null;
};

/**
 * Verwaltet die Spotify-Session auf App-Ebene. Versucht beim Mount stillschweigend
 * einen Refresh, lädt dann /me. Premium-Check macht der Aufrufer über user.product.
 */
export function useSpotifyAuth() {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
    user: null,
    error: null,
  });

  const loadUser = useCallback(async () => {
    try {
      await getValidAccessToken(); // refreshed bei Bedarf
      const user = await getMe();
      setState({ status: 'authenticated', user, error: null });
    } catch (e) {
      setState({
        status: 'error',
        user: null,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }, []);

  useEffect(() => {
    if (!isConfigured()) {
      setState({
        status: 'error',
        user: null,
        error: 'Spotify Client-ID nicht konfiguriert — siehe README / .env.',
      });
      return;
    }
    if (hasSession()) {
      void loadUser();
    } else {
      setState({ status: 'unauthenticated', user: null, error: null });
    }
  }, [loadUser]);

  const login = useCallback(async () => {
    try {
      await beginLogin();
    } catch (e) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
      }));
    }
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setState({ status: 'unauthenticated', user: null, error: null });
  }, []);

  return { ...state, login, logout, reload: loadUser, configured: isConfigured() };
}
