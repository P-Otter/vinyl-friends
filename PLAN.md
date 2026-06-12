# Hitster Friends — Plan

> **Scope (bewusst festgelegt):** Privates Tool für den eigenen Freundeskreis, **max. 5 Spotify-Premium-Accounts**, **nie öffentlich**. Warum diese harte Grenze: Spotifys Developer Policy verbietet Spiele/Quizze wörtlich (Section III.2: „Do not create a game, including trivia quizzes."), und seit Feb 2026 ist der Dev-Mode auf **5** manuell freigeschaltete Premium-Nutzer gedeckelt (vorher 25); Extended Quota gibt's nur für Firmen mit ≥250k MAU. Für eine kleine Privatrunde bewusst akzeptierter Graubereich — aber **nichts auf Skalierung oder Public-Launch bauen**, das ist strukturell ausgeschlossen.

## Vision in einem Satz
Eine Web-App, in der eine Gruppe Freunde gemeinsam eine Spotify-Playlist mit ihren Lieblingssongs füllt und daraus ein Hitster-artiges Party-Spiel wird — mit optionalen Theme-Packs (Soundtracks, 80er, etc.) als Würze.

## Warum das funktioniert (Hypothese)
Hitster ist gut, weil "den Song kennen" für jeden anders ist. Wenn der Pool aus den Lieblingssongs der Mitspieler kommt, wird das Spiel automatisch persönlich, witzig und mit Insider-Momenten ("Klar ist das dein Song"). Theme-Packs sorgen dafür, dass nicht nur die laute Person die ganze Playlist dominiert.

## Spielmodi (entschieden — Stand nach Review)
1. **Klassisch — relative Ordnung (Default)**: Song läuft, Spieler platziert Karte chronologisch zwischen bereits gelegten Karten. **Es werden KEINE Jahreszahlen geraten/angezeigt** — nur „älter oder neuer als?". Jahr erst beim Reveal. Das umarmt das Jahres-Clustering (siehe Knackpunkte) statt dagegen zu kämpfen und macht das unzuverlässige `release_date` für die Mechanik irrelevant. Erste*r mit X Karten gewinnt.
   - *Optional als Setting:* absolute Jahres-Schätzung mit ±2-Jahres-Toleranz (für die, die's klassisch-hart wollen).
2. **Wessen Liebling? / „Wer errät ihn zuerst?"** (in den Launch-Scope gezogen, vorher V2): Vor dem Clip wetten die Spieler, **welche*r Mitspieler*in den Song zuerst erkennt**. Invertiert von Erinnerung zu Social-Modeling — nutzt sich im Freundeskreis nicht ab. Der eigentliche USP dieses Pools. Quelle für „wer hat hinzugefügt": Spotify `added_by` der collaborative Playlist.
3. **Artist/Titel raten** (+ Wager): Schnellrunden-Variante, erste*r mit Artist + Titel kriegt den Punkt. **Confidence-Wager** gegen wildes Reinrufen: vor dem Clip Token auf die eigene Sicherheit setzen, falsch + hoch gewettet kostet. Nach dem Clip Adder-Username einblenden („warum hat Marcus 2026 Cascada hinzugefügt?").
4. **Theme-Packs**: kuratierte Spotify-Playlists (Filmsoundtracks, 80er, 90er Hip-Hop, …) in den Friends-Pool gemischt, Slider „70% Friends / 30% Soundtracks". Im Klassik-Modus optional als „Spread-Boost" zum Strecken der Timeline — aber **opt-in, nicht Pflicht** (sonst wird das eigene USP zu Füllmaterial).

## Pool-Definition
- **Friends-Pool**: Eine geteilte Spotify-Playlist, zu der alle Freunde ihre Picks hinzufügen. App liest die Playlist via Spotify Web API.
- **Theme-Packs**: Vorgefertigte Liste kuratierter Spotify-Playlist-IDs (hartcoded oder via simpler JSON-Datei im Repo). Beim Spielstart kann der Host beliebig viele aktivieren und Mischungsverhältnis setzen.
- **Dedup**: Songs die in mehreren Quellen vorkommen werden einmal gespielt.
- **Filter**: Min-Länge (z.B. >60s, wirft Skits raus), explizit-Toggle.

## Tech-Stack
- **Frontend**: React + Vite + TypeScript
- **Styling**: Tailwind (schnell, konsistent, keine Designsystem-Diskussion)
- **State**: Zustand (klein und reicht)
- **Auth**: Spotify OAuth via PKCE-Flow, komplett client-side, kein Backend nötig für MVP
- **Audio**: Spotify Web Playback SDK (Host braucht Premium — klar kommunizieren)
- **Metadaten**: Spotify Web API (`/playlists`, `/tracks`) — NICHT `audio-features`, seit Nov 2024 für neue Apps tot (siehe tech-stack.md)
- **Persistenz (MVP)**: Nichts. Game-State lebt im Browser. Spielstand-Anzeige reicht.

## Architektur grob
```
[Host-Browser]
   ├── Spotify OAuth (PKCE)
   ├── React App (Game-State, UI, Timeline, Scoring)
   └── Spotify Web Playback SDK ──► Spotify Audio
        ↑
        └── Web API (Playlists, Track-Metadata, release_date)
```
Kein Backend in v1. Kein Multiplayer-Sync — alle Spieler sitzen am gleichen Tisch, ein Host-Gerät. Karten werden physisch oder auf dem Bildschirm verwaltet.

## UI-Screens (MVP)
1. **Login** — "Mit Spotify verbinden" Button
2. **Setup** — Playlist auswählen + Theme-Packs auswählen + Mischverhältnis + Spielmodus + Spieleranzahl + Win-Condition
3. **Spieler-Einrichtung** — Namen eingeben, Reihenfolge
4. **Game-Screen** — Großer Play/Pause, aktueller Spieler, Timeline (oder Schnellraten), Karten-Stapel anderer Spieler, Skip-Button
5. **Reveal** — Karte aufdecken: Album-Art, Artist, Titel, Jahr
6. **Endscreen** — Sieger, Stats (raten-Quote pro Spieler, schwerster Song, etc.)

Details in [docs/ui-flow.md](docs/ui-flow.md).

## Bekannte Knackpunkte
- **release_date in Spotify ist Album-Datum**, nicht Song-Veröffentlichung. Bei Compilations/Best-Ofs/Re-Releases → falsche Jahre. **Im neuen Default-Modus (relative Ordnung) für die Mechanik egal**, weil keine absoluten Jahre geraten werden — nur fürs Reveal kosmetisch. Relevant erst wieder im optionalen Jahres-Modus → dann MusicBrainz-Lookup (V2).
- **Spotify Premium-Pflicht** beim Host wegen Web Playback SDK. Klar onboarden, sonst Frustration. (Seit Feb 2026 ist Premium sogar für den Dev-Account selbst Pflicht.)
- **Random Start-Offset im Song** sonst erkennt jeder den Intro-Sound zu schnell. → Bei `play` mit zufälligem Offset zwischen 10s und (Songlänge - 30s) starten.
- **Spotify Rate-Limits** bei großen Playlists. Tracks paginiert holen (100/Call). (Audio-Features-Batches gestrichen — Endpoint ist tot.)
- **CORS / SDK-Init im iframe** kann nervig sein — hier rechtzeitig Spike machen, das ist der erste echte Risiko-Punkt.
- **Spotify Dev-Mode = 5 User Cap** (seit Feb 2026, vorher 25). Max. 5 manuell freigeschaltete **Premium**-Accounts, 1 Client-ID. Für die Privatrunde bewusst akzeptiert (siehe Scope oben). Extended Quota nur für Firmen ≥250k MAU → strukturell unerreichbar, daher nie öffentlich.
- **ToS: Spotify verbietet Spiele/Quizze.** Developer Policy Section III.2 wörtlich: „Do not create a game, including trivia quizzes." → Bewusst akzeptierter Graubereich für rein private 5er-Nutzung; jede Veröffentlichung wäre ein klarer Verstoß. Verifiziert am 2026-05-31 direkt auf developer.spotify.com/policy.
- **✓ GELÖST — Jahres-Clustering:** Friends-Playlists ballen sich in ~2005–2024 statt über 1955–2024 zu streuen, was die klassische Jahr-Timeline zum Münzwurf macht. Fix: Klassik-Modus läuft jetzt auf **relativer Ordnung ohne Jahreszahlen** (Modus 1) — damit ist Clustering ein Feature, kein Bug. Details game-design.md.

## Roadmap

### MVP (Ziel: spielbar mit Freunden in 2 Wochenenden)
- Spotify-Login (PKCE) + collaborative Playlist holen (inkl. `added_by`)
- **Klassisch / relative Ordnung**: Song spielen, Karte zwischen Nachbarn einsortieren, Reveal, Punkt
- Eine harte Win-Condition (z.B. 10 Karten)
- Minimales UI, Desktop-first

### V1
- **Wessen Liebling? / „Wer errät ihn zuerst?"**-Modus (USP, daher früh)
- Artist/Titel-Modus + Confidence-Wager
- Theme-Packs einbinden (als opt-in Spread-Boost)
- Random-Offset beim Abspielen
- Endscreen mit Stats, Adder-Username im Reveal
- Settings: ±2-Jahres-Toleranz-Toggle, Min-Länge, Explicit, Snippet-Länge

### V2
- Steal/Einwand-Mechanik (Hitster-Original)
- Hot/Cold-Nudge-Bluff-Layer auf der Timeline
- MusicBrainz-Lookup für korrekte Original-Jahre (nur falls absoluter Jahres-Modus genutzt wird)
- Spieler-Profile lokal persistiert, Spielhistorie + Lieblings-Songs-Rankings
- Multi-Device: Spieler-Phones als Buzzer

### Verworfen / nicht geplant
- ~~Apple Music Support~~ — Pivot geprüft (iTunes/Deezer/YouTube), Entscheidung: bei Spotify bleiben (privat ≤5)
- ~~Public-Distribution / Quota-Ausweitung~~ — strukturell unmöglich (siehe Scope)
- ~~Eigenes Backend~~ — für 5er-Privatrunde unnötig

## Nächste konkrete Schritte
1. Spotify Developer App registrieren (Redirect URI: `http://127.0.0.1:5173/callback` — Loopback-IP, NICHT `localhost`; eigenen Account + die Handvoll Host-Accounts im Dashboard freischalten, **Dev-Mode-Cap jetzt 5**, alle müssen Premium sein)
2. Vite-Projekt scaffolden + Tailwind + Zustand setup
3. PKCE-Flow implementieren, Playlist-Liste holen, eine Playlist anzeigen — das ist der Risiko-Spike
4. Web Playback SDK initialisieren und einen Song abspielen — zweiter Spike
5. Erst dann Game-Loop bauen

## Open Questions
- **Snippet vs. unlimited**: Klassisches Hitster erlaubt unbegrenzt anhören bis man platziert. MVP genauso? → Ja, default. Optional Timer als Setting.
- **Wie viele Theme-Packs zum Launch?** → 5–8 reichen für Validierung
- **Distribution?** Lokal (`vite dev`) oder selbst-gehostet hinter Login reicht für die 5er-Runde. **Public ist bewusst raus** (Scope/ToS). Falls man's je größer wollte, müsste man die Audio-Quelle wechseln (iTunes-Preview/MusicBrainz statt Spotify) — der Pivot ist in der History dokumentiert, aber aktuell verworfen.

---

Deep-Dives:
- [docs/game-design.md](docs/game-design.md) — Spielregeln, Scoring, Edge-Cases
- [docs/tech-stack.md](docs/tech-stack.md) — Spotify-Integration im Detail, Datenmodell
- [docs/ui-flow.md](docs/ui-flow.md) — Screen-für-Screen-Flow, Interaktionen
