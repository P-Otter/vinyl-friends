/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPOTIFY_CLIENT_ID: string;
  readonly VITE_SPOTIFY_REDIRECT_URI: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Die Spotify-Web-Playback-SDK-Globals (window.Spotify, onSpotifyWebPlaybackSDKReady)
// kommen ambient aus @types/spotify-web-playback-sdk.
