# Vinyl Friends

Party-Musikspiel: Song hören, Erscheinungsjahr schätzen, Karte chronologisch in die
eigene Zeitleiste einsortieren. **Live: <https://p-otter.github.io/vinyl-friends/>**

Zwei Spielarten in einer App:

1. **Eigener Pool (Standard)** — ganz ohne Konto, läuft überall (auch iPhone/iPad).
   Pool aus fertigen Song-Packs, iTunes-Suche oder eingefügter Songliste;
   gespielt wird mit offiziellen 30-Sekunden-Hörproben.
2. **Spotify-Modus (privat)** — eure echten Playlists in voller Länge.
   Braucht Spotify Premium beim Host + Freischaltung im eigenen Spotify-Dashboard
   (max. 5 Nutzer, **nie öffentlich** — siehe [PLAN.md](PLAN.md) für ToS-Hintergrund).

Im selben Repo liegt unter [`ios/`](ios/) die native SwiftUI-iOS-App (XcodeGen).

## Stack
React + Vite + TypeScript · Tailwind · Zustand · React Router · iTunes-Search-API
(30s-Previews, JSONP) · optional Spotify OAuth (PKCE, client-only) + Web Playback SDK.
Kein Backend. Deploy: GitHub Actions → GitHub Pages.

## Sofort spielen (ohne alles)
<https://p-otter.github.io/vinyl-friends/> öffnen → **„Spielen — eigenen Pool bauen"**.
Kein Konto, kein Setup. Auf dem iPhone/iPad: in Safari öffnen → Teilen-Menü →
**„Zum Home-Bildschirm"** — dann startet es wie eine App.

---

Der Rest dieses Abschnitts betrifft nur den optionalen **Spotify-Modus** und die lokale Entwicklung.

## Voraussetzungen (nur Spotify-Modus / Entwicklung)
- Node ≥ 18 (getestet mit 25)
- **Spotify Premium** beim Host (Web Playback SDK spielt sonst nicht)
- Kein Safari-Privatmodus (DRM-Beschränkung)

## 1. Spotify-App registrieren (einmalig, deine Aufgabe)
1. [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) → **Create app**
2. Felder:
   - **App name / description**: beliebig (z. B. „Hitster Friends private")
   - **Redirect URI**: exakt `http://127.0.0.1:5173/callback`
     ⚠️ **Loopback-IP, NICHT `localhost`** — Spotify lehnt `localhost` seit April 2025 ab.
   - **APIs**: „Web API" **und** „Web Playback SDK" anhaken
3. Speichern → **Client ID** kopieren (kein Client-Secret nötig, PKCE).
4. **Settings → User Management**: jeden Mitspieler-Account (E-Mail + Name) freischalten.
   Development Mode ist seit Feb 2026 auf **5 Premium-Nutzer** gedeckelt — reicht für die
   Privatrunde, mehr geht strukturell nicht.

## 2. Konfigurieren
```bash
cp .env.example .env
# .env öffnen und VITE_SPOTIFY_CLIENT_ID = deine Client ID eintragen
```

## 3. Starten
```bash
npm install
npm run dev
```
Dann **http://127.0.0.1:5173** öffnen (nicht `localhost` — sonst matcht die Redirect URI nicht).

## Spielablauf
1. **Login** — mit Spotify verbinden (Premium-Check passiert automatisch).
2. **Setup** — Friends-Playlist wählen, optional Themes dazumischen, Win-Condition (Standard: 10 Karten).
3. **Spieler** — 2–8 Namen, Reihenfolge mit ↑ ↓.
4. **Spiel** — „Song starten" → Position in der eigenen Timeline wählen → „Platzieren & aufdecken".
   Richtig einsortiert = Karte bleibt + Punkt. Erste*r mit N Karten gewinnt.

Der Spielstand liegt im LocalStorage — Reload setzt das Spiel fort.

## Bekannte Einschränkungen (MVP)
- Nur **Klassik-Modus** spielbar. „Wessen Liebling?" und „Artist & Titel" sind im Setup als
  **V1** markiert (Datenmodell & `added_by`-Erfassung sind schon da, UI fehlt noch).
- **Theme-Playlist-IDs** in [`src/data/themes.json`](src/data/themes.json) sind Platzhalter.
  Spotifys redaktionelle/algorithmische Playlists (`37i9…`) sind für neu angelegte Apps oft
  **nicht** per API lesbar — nicht erreichbare Themes werden beim Queue-Bau still übersprungen.
  → Mit eigenen (öffentlichen oder eigenen) Playlist-IDs ersetzen, dann funktioniert der Mix.
- Kein Multiplayer-Sync: ein Host-Gerät, Spieler raten mündlich (so geplant).
- Jahres-Modus (±2-Toleranz) ist als Setting da, aber das Reveal-Jahr stammt aus dem
  Spotify-**Album**-Datum (bei Compilations mit `*` markiert) — exakte Original-Jahre via
  MusicBrainz sind für V2 vorgesehen.

## Skripte
| Befehl | Wirkung |
|---|---|
| `npm run dev` | Dev-Server auf 127.0.0.1:5173 |
| `npm run build` | Typecheck + Production-Build nach `dist/` |
| `npm run preview` | gebauten Build lokal servieren |
| `npm run lint` | nur Typecheck |

## Projektstruktur
```
src/
├── components/   UI-Bausteine (Timeline, TrackCard, PlayControls, RevealOverlay, …)
├── hooks/        useSpotifyAuth · useSpotifyPlayer (SDK) · useGameState (Zustand-Store)
├── lib/          pkce · spotify-auth · spotify-api · queue-builder · scoring
├── pages/        Login · Callback · Setup · PlayerSetup · Game · End
├── data/         themes.json
├── types.ts      Datenmodell
└── App.tsx       Routing + Auth-Gating
```

Design-Hintergrund in [docs/](docs/): `game-design.md`, `tech-stack.md`, `ui-flow.md`.
