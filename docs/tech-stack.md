# Tech Stack & Architektur

> **Scope-Constraint (siehe PLAN.md):** Privates Tool, **max. 5 Spotify-Premium-Accounts**, nie öffentlich. Spotify-Developer-Policy verbietet Spiele/Quizze (Section III.2) und Dev-Mode ist seit Feb 2026 auf 5 Nutzer gedeckelt — bewusst akzeptierter Graubereich für die Privatrunde. **Nicht auf Skalierung bauen.**

## Stack
| Layer | Wahl | Begründung |
|---|---|---|
| Build | Vite + React + TypeScript | Schneller als Next.js für reine SPA, kein SSR nötig |
| Styling | Tailwind | Schnelle UI, keine CSS-Architektur-Diskussion |
| State | Zustand | Reicht für Game-State, kein Redux-Overkill |
| Auth | Spotify OAuth 2.0 PKCE | Client-only, kein Backend |
| Audio | Spotify Web Playback SDK | Einziger Weg full-track im Browser zu spielen |
| Metadaten | Spotify Web API | Playlists, Tracks, release_date (NICHT audio-features — deprecatet) |
| Routing | React Router | Login → Setup → Game → End |
| Persistenz | LocalStorage | Session-Recovery, Spieler-Namen, letzte Settings |

## Spotify-Integration

### Required Scopes
- `streaming` — Web Playback SDK
- `user-read-email` `user-read-private` — User-Info
- `playlist-read-private` `playlist-read-collaborative` — Playlists lesen
- `user-modify-playback-state` `user-read-playback-state` — Playback steuern

### PKCE-Flow (client-only, kein Secret nötig)
1. Code-Verifier + Code-Challenge generieren
2. Redirect zu `https://accounts.spotify.com/authorize` mit Challenge
3. User stimmt zu, redirect zurück zu `/callback?code=...`
4. Token-Exchange via `POST https://accounts.spotify.com/api/token` mit Verifier
5. Access-Token in Memory + Refresh-Token in LocalStorage
6. Auto-Refresh bevor `expires_in` abläuft

### Web Playback SDK Init
- Script async laden: `https://sdk.scdn.co/spotify-player.js`
- `window.onSpotifyWebPlaybackSDKReady` callback
- `new Spotify.Player({ name: "Hitster Friends", getOAuthToken: cb => cb(token) })`
- `player.connect()` → kriegt eine `device_id` zurück
- Playback startet via `PUT /me/player/play?device_id={id}` mit `{ uris: ["spotify:track:..."] }`
- Position-Offset: `{ uris: [...], position_ms: 45000 }`

### Wichtige Quirks
- SDK funktioniert NICHT in Safari Private Mode (DRM)
- Premium-Pflicht — beim Login prüfen via `/me` → `product: "premium"`, sonst klares Error-Onboarding
- Token-Refresh muss VOR Ablauf passieren, sonst bricht Playback ab
- Bei Wechsel auf neues Gerät (User skipped to phone): SDK kriegt das mit, App muss „Playback kontrolle übernehmen?"-CTA zeigen

## Datenmodell (Client-only)

```ts
type Track = {
  id: string;            // Spotify track ID
  uri: string;           // spotify:track:...
  name: string;
  artist: string;
  albumName: string;
  albumArt: string;      // URL
  releaseYear: number;   // aus album.release_date geparst — nur fürs Reveal, NICHT für die Default-Mechanik
  releaseDateRaw: string;
  source: 'friends' | `theme:${string}`;
  addedById?: string;    // Spotify user-id aus playlist.items[].added_by — für „Wessen Liebling?"
  addedByName?: string;  // aufgelöster Anzeigename (eigenes Mapping, da API nur die id liefert)
  durationMs: number;
};

type Player = {
  id: string;            // local uuid
  name: string;
  color: string;         // für UI
  cards: Track[];        // korrekt platzierte Karten (=Score)
};

type GameSettings = {
  mode: 'classic-relative' | 'classic-year' | 'whose-fave' | 'name-that-tune';
  yearTolerance?: number;   // nur bei 'classic-year', default 2 (±)
  wager?: boolean;          // Confidence-Wager bei name-that-tune
  ghostTracks?: boolean;    // anonyme Tracks bei whose-fave (kleine Gruppen)
  friendsPlaylistId: string;
  enabledThemes: string[];
  friendsRatio: number;     // 0..1
  spreadBoost?: boolean;    // Theme-Mindestanteil im Klassik-Modus erzwingen (opt-in)
  winCondition: { type: 'cards'; n: number } | { type: 'time'; minutes: number };
  minTrackLengthSec: number;
  allowExplicit: boolean;
  snippetMode: { enabled: boolean; lengthSec?: number };
  randomOffset: boolean;
};

type GameState = {
  phase: 'setup' | 'playing' | 'reveal' | 'finished';
  settings: GameSettings;
  queue: Track[];        // shuffled, deduped Track-Pool
  currentTrackIndex: number;
  players: Player[];
  currentPlayerIdx: number;
  pendingPlacement?: { trackId: string; playerId: string; insertAfter: number };
};
```

## Track-Queue-Generation

```
1. Friends-Playlist holen → Track-Liste
2. Pro aktivem Theme: Playlist holen → Track-Liste
3. Filtern: durationMs >= minTrackLengthSec*1000, explicit-Filter
4. Dedup nach Track-ID, Friends-Pool gewinnt
5. Pro Track: source taggen, releaseYear aus album.release_date parsen
6. Gewichtetes Sampling: friendsRatio% aus Friends, Rest gleichverteilt auf Themes
7. Shuffle (Fisher-Yates) → finale Queue
8. (NICHT mehr: Audio-Features-Endpoint — seit Nov 2024 für neue Apps deprecatet, siehe Gotchas unten)
```

## API-Calls die wir brauchen

| Endpoint | Wozu | Notes |
|---|---|---|
| `GET /me` | User-Info + Premium-Check | einmal nach Login |
| `GET /me/playlists` | Playlist-Auswahl beim Setup | paginiert |
| `GET /playlists/{id}/tracks` | Track-Liste einer Playlist | 100/Call, paginieren; liefert `added_by.id` → für „Wessen Liebling?" |
| `GET /tracks?ids=...` | Falls Detail-Daten fehlen | 50/Call |
| ~~`GET /audio-features`~~ | ~~extra Metadata~~ | DEPRECATET für neue Apps — nicht verwenden |
| `PUT /me/player/play` | Song starten mit Offset | device_id required |
| `PUT /me/player/pause` | Pause | |
| `PUT /me/player/seek` | Falls User „nochmal von vorne" will | |

## Spotify-Gotchas 2024/2025 (NEU — kritisch)
Spotify hat am **27. Nov 2024** für alle neu angelegten Apps mehrere Endpoints abgeschaltet (403). Betrifft uns direkt:
- **Audio Features / Audio Analysis** → tot für neue Apps. Kein BPM/Energy/Danceability mehr. → Wir brauchen sie nicht für den Core, also egal. Frühere „optional v1"-Idee gestrichen.
- **Recommendations, Related Artists, Featured/Category Playlists** → tot. → Brauchen wir nicht.
- **`preview_url` (30s-Snippets)** → kommt für neue Apps oft `null`. → **Wir umgehen das komplett**, weil wir per Web Playback SDK den vollen Track abspielen (Premium). Das war im Nachhinein die richtige Architektur-Wahl, nicht nur Komfort. Ein „Free-Fallback ohne Premium" existiert praktisch nicht mehr — Premium-Pflicht ist damit hart, nicht optional.

**Development Mode Quota (Feb 2026 verschärft):** Eine frische Spotify-App startet im *Development Mode* → seit 6. Feb 2026 max. **5 Nutzer** (vorher 25), die du manuell im Dashboard freischaltest; der Dev-Account selbst braucht jetzt **Premium**, und du darfst nur **eine** Dev-Mode-Client-ID haben. „Extended Quota Mode" gibt's seit Mai 2025 nur noch für **registrierte Firmen (keine Einzelpersonen) mit ≥250k MAU** und nachgewiesener kommerzieller Tragfähigkeit → für ein Hobby-Party-Spiel **strukturell unerreichbar**.
→ **Für die 5er-Privatrunde ok**: Nur der **Host** authentifiziert sich (Spieler raten mündlich). Du schaltest die paar Host-Accounts frei. Aber: das Ding kann **nie** öffentlich werden — das ist eine harte, bewusst akzeptierte Grenze, kein „später lösen wir das".

**⚠ ToS — Spiele verboten:** Developer Policy Section III.2: „Do not create a game, including trivia quizzes." Section III.6/7 verbieten zusätzlich Sync mit visuellen Medien und das Mischen/Übergehen von Spotify-Content. Ein Hitster-Klon verstößt direkt dagegen. **Bewusst akzeptierter Graubereich für rein private Nutzung** — bei jeder Veröffentlichung droht App-Sperre. (Verifiziert 2026-05-31 auf developer.spotify.com/policy.)

**Redirect URI:** Spotify verlangt seit April 2025 HTTPS — einzige HTTP-Ausnahme ist die Loopback-IP. Daher `http://127.0.0.1:5173/callback` (NICHT `localhost`, wird explizit abgelehnt). Steht schon richtig im PLAN.

## Risk-Spikes vor Bauen
1. **PKCE + Token-Refresh** in 2h Spike prototypen — wenn das hakt, gleich klar
2. **Web Playback SDK** mit einem hartcoded Track abspielen — wenn DRM/Safari/Premium Bugs kommen, früh wissen
3. **Random Offset im Track** funktioniert? Position_ms im play-call beim Erst-Play vs. nach Pause testen

## Deployment
- MVP: Vercel oder Netlify, statisches Hosting
- Redirect URI muss in Spotify Dev Dashboard registriert sein
- Custom Domain irrelevant für Friends-Use

## Was wir NICHT brauchen (bewusst)
- Backend / DB (für MVP)
- WebSockets / Realtime-Sync
- User-Accounts außerhalb Spotify
- Mobile-App
- CMS für Themes (JSON-File reicht)
- Analytics (MVP)
