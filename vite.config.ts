import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Loopback-IP statt localhost: Spotify lehnt seit April 2025 http://localhost als
// Redirect URI explizit ab, erlaubt aber die Loopback-IP. Siehe docs/tech-stack.md.
//
// base: auf GitHub Pages liegt die App unter /vinyl-friends/ (Projekt-Page).
// Lokal bleibt '/'. Der Pages-Workflow baut mit `--mode ghpages`.
export default defineConfig(({ mode }) => ({
  base: mode === 'ghpages' ? '/vinyl-friends/' : '/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
}));
