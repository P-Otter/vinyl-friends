import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Loopback-IP statt localhost: Spotify lehnt seit April 2025 http://localhost als
// Redirect URI explizit ab, erlaubt aber die Loopback-IP. Siehe docs/tech-stack.md.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
});
