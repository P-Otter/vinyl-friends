// Spotify OAuth 2.0 PKCE — client-only Token-Management.
// Access-Token lebt in Memory, Refresh-Token in LocalStorage. Auto-Refresh vor Ablauf.
import { deriveCodeChallenge, generateCodeVerifier, randomState } from './pkce';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';

const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-modify-playback-state',
  'user-read-playback-state',
].join(' ');

const LS_VERIFIER = 'hf_pkce_verifier';
const LS_STATE = 'hf_pkce_state';
const LS_REFRESH = 'hf_refresh_token';

export function isConfigured(): boolean {
  return Boolean(CLIENT_ID && REDIRECT_URI);
}

// In-Memory Token-State (überlebt kein Reload — dafür ist der Refresh-Token da).
let accessToken: string | null = null;
let expiresAt = 0; // epoch ms
let refreshPromise: Promise<string> | null = null;

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
};

function storeTokens(data: TokenResponse) {
  accessToken = data.access_token;
  // 60s Puffer, damit ein laufender Call nicht mitten im Ablauf stirbt.
  expiresAt = Date.now() + (data.expires_in - 60) * 1000;
  if (data.refresh_token) {
    localStorage.setItem(LS_REFRESH, data.refresh_token);
  }
}

/** Startet den Login: Redirect zu Spotifys Consent-Screen. */
export async function beginLogin(): Promise<void> {
  if (!isConfigured()) {
    throw new Error('VITE_SPOTIFY_CLIENT_ID / VITE_SPOTIFY_REDIRECT_URI fehlen in .env');
  }
  const verifier = generateCodeVerifier();
  const challenge = await deriveCodeChallenge(verifier);
  const state = randomState();
  localStorage.setItem(LS_VERIFIER, verifier);
  localStorage.setItem(LS_STATE, state);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    scope: SCOPES,
    // Frische Zustimmung erzwingen — sonst recycelt Spotify eine alte (evtl. mit weniger Scopes).
    show_dialog: 'true',
  });
  window.location.assign(`${AUTHORIZE_URL}?${params.toString()}`);
}

/** Verarbeitet den Redirect von /callback: tauscht code gegen Tokens. */
export async function handleCallback(code: string, state: string): Promise<void> {
  const storedState = localStorage.getItem(LS_STATE);
  const verifier = localStorage.getItem(LS_VERIFIER);
  if (!storedState || state !== storedState) {
    throw new Error('OAuth-State stimmt nicht (CSRF-Schutz). Bitte erneut einloggen.');
  }
  if (!verifier) {
    throw new Error('Code-Verifier fehlt. Bitte erneut einloggen.');
  }

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token-Exchange fehlgeschlagen (${res.status}): ${text}`);
  }
  const data = (await res.json()) as TokenResponse;
  storeTokens(data);
  localStorage.removeItem(LS_VERIFIER);
  localStorage.removeItem(LS_STATE);
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem(LS_REFRESH);
  if (!refreshToken) throw new Error('Kein Refresh-Token — Login nötig.');

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    // Refresh-Token ungültig → harter Logout.
    logout();
    throw new Error('Session abgelaufen — bitte erneut einloggen.');
  }
  const data = (await res.json()) as TokenResponse;
  storeTokens(data);
  return accessToken!;
}

/** Gibt einen gültigen Access-Token zurück, refreshed bei Bedarf. */
export async function getValidAccessToken(): Promise<string> {
  if (accessToken && Date.now() < expiresAt) return accessToken;
  // Parallele Calls sollen denselben Refresh teilen, nicht mehrere lostreten.
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export function hasSession(): boolean {
  return Boolean(accessToken) || Boolean(localStorage.getItem(LS_REFRESH));
}

export function logout(): void {
  accessToken = null;
  expiresAt = 0;
  localStorage.removeItem(LS_REFRESH);
  localStorage.removeItem(LS_VERIFIER);
  localStorage.removeItem(LS_STATE);
}
