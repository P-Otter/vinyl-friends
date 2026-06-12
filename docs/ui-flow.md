# UI Flow

Desktop-first, weil Host an Laptop/iPad. Funktioniert auch auf Tablet quer. Mobile nice-to-have.

## Screen 1: Login

```
┌──────────────────────────────────────────────┐
│                                              │
│            HITSTER FRIENDS                   │
│       das Musikspiel mit deiner Crew         │
│                                              │
│        ┌────────────────────────────┐        │
│        │  ▶  Mit Spotify verbinden  │        │
│        └────────────────────────────┘        │
│                                              │
│   benötigt Spotify Premium für den Host      │
│                                              │
└──────────────────────────────────────────────┘
```

- Ein Button. Klick → Spotify OAuth.
- Klein darunter: „benötigt Spotify Premium beim Host" — vor dem Login schon klar.

## Screen 2: Setup

```
┌──────────────────────────────────────────────────────────┐
│  Setup                                                   │
│                                                          │
│  Friends-Playlist                                        │
│  ┌────────────────────────────────────────────────┐      │
│  │ ▼ "Crew Picks 2026"  (142 Songs)               │      │
│  └────────────────────────────────────────────────┘      │
│                                                          │
│  Themes dazumischen                                      │
│  ☑ Filmsoundtracks      ☑ 80er Pop                       │
│  ☐ 90er Hip-Hop         ☑ Disney                         │
│  ☐ 2000er Indie         ☐ Eurodance                      │
│                                                          │
│  Mischverhältnis                                         │
│  Friends ────●─────── Themes      70% / 30%              │
│                                                          │
│  Modus                                                   │
│  ◉ Klassisch — Reihenfolge (ohne Jahre)                  │
│  ○ Wessen Liebling? / Wer errät ihn zuerst?              │
│  ○ Artist & Titel raten                                  │
│                                                          │
│  Win-Condition                                           │
│  Erste*r mit  [ 10 ] Karten gewinnt                      │
│                                                          │
│  ⚙ Mehr Einstellungen ▾                                  │
│                                                          │
│                          [ Weiter → Spieler ]            │
└──────────────────────────────────────────────────────────┘
```

Erweiterte Settings (Drawer):
- „Jahres-Modus" — statt nur Reihenfolge absolute Jahre mit ±2-Toleranz (default aus)
- Spread-Boost — Theme-Mindestanteil erzwingen, streckt die Timeline (default aus)
- Confidence-Wager (nur Artist/Titel-Modus)
- Ghost-Tracks (nur Wessen-Liebling, für kleine Gruppen)
- Min-Songlänge (default 60s)
- Explicit erlauben
- Random Start-Offset (default an)
- Snippet-Modus (off = unbegrenzt anhören)

## Screen 3: Spieler-Setup

```
┌──────────────────────────────────────────────┐
│  Wer spielt mit?                             │
│                                              │
│  1. [ Shayan        ] 🔴   [×]               │
│  2. [ Lukas         ] 🔵   [×]               │
│  3. [ Mia           ] 🟢   [×]               │
│  4. [ + Spieler hinzufügen ]                 │
│                                              │
│  Reihenfolge per Drag-and-Drop sortieren     │
│                                              │
│         [ ← zurück ]   [ Start! ]            │
└──────────────────────────────────────────────┘
```

## Screen 4: Game (Klassisch)

```
┌──────────────────────────────────────────────────────────────┐
│  Runde 12     |     🔴 Shayan ist dran     |    Skip  Pause  │
│                                                              │
│                                                              │
│       ┌────────────────────────────────────────┐             │
│       │           ▶  Song starten              │             │
│       │                                        │             │
│       │     1:23 ─────●─────── 3:45            │             │
│       └────────────────────────────────────────┘             │
│                                                              │
│                                                              │
│   Deine Timeline                                             │
│   ┌──┐  ┌──┐  ┌──┐  ┌──┐  ┌──┐                               │
│   │74│  │82│  │95│  │08│  │19│      ← klick zwischen Karten  │
│   └──┘  └──┘  └──┘  └──┘  └──┘                                │
│    ↑     ↑     ↑     ↑     ↑    ↑                            │
│  [hier][hier][hier][hier][hier][hier]                        │
│                                                              │
│   ─────────────────────────────────────────                  │
│   Andere Spieler                                             │
│   🔵 Lukas: 8 Karten   🟢 Mia: 6 Karten                      │
└──────────────────────────────────────────────────────────────┘
```

Interaktion:
- Großer Play-Button startet Song (mit Random-Offset)
- Während Song läuft: Timeline zeigt Karten des aktiven Spielers
- Klick auf einen Gap zwischen Karten → highlighted
- „Platzieren" Button erscheint → bestätigen
- Reveal-Animation

## Screen 5: Reveal

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│              ┌────────────────────────┐                      │
│              │                        │                      │
│              │     [Album-Cover]      │                      │
│              │                        │                      │
│              │       1 9 8 4          │                      │
│              │                        │                      │
│              │   When Doves Cry       │                      │
│              │       Prince           │                      │
│              │                        │                      │
│              └────────────────────────┘                      │
│                                                              │
│              ✓ Richtig platziert! +1 Karte                   │
│                                                              │
│              aus Friends-Pool                                │
│                                                              │
│                                                              │
│                  [ Nächste*r Spieler*in → ]                  │
└──────────────────────────────────────────────────────────────┘
```

- Album-Cover prominent
- Jahr groß
- Artist/Titel klein
- Outcome (✓/✗)
- Source-Hinweis klein
- „Nächster Spieler" — primärer Button

## Screen 6: Game (Artist/Titel-Modus)

```
┌──────────────────────────────────────────────────────────────┐
│  Runde 7    |    Alle hören mit    |    Skip   Pause         │
│                                                              │
│              ┌────────────────────────────┐                  │
│              │      ▶  Song läuft         │                  │
│              │    0:34 ───●───── 3:21      │                 │
│              └────────────────────────────┘                  │
│                                                              │
│   Wer hat zuerst geraten?                                    │
│                                                              │
│   [ 🔴 Shayan ]   [ 🔵 Lukas ]   [ 🟢 Mia ]                   │
│   [ Niemand — auflösen ]                                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Host klickt auf den Spieler-Button der die richtige Antwort zuerst hatte → Reveal.

## Screen 7: Endscreen

```
┌──────────────────────────────────────────────────────────────┐
│                    🏆  Shayan gewinnt!                       │
│                                                              │
│   Endstand                                                   │
│   1. 🔴 Shayan      10 Karten                                │
│   2. 🟢 Mia          7 Karten                                │
│   3. 🔵 Lukas        5 Karten                                │
│                                                              │
│   Stats                                                      │
│   • Trefferquote: Shayan 71% · Mia 58% · Lukas 42%           │
│   • Schwerster Song: Hammer To Fall (Queen, 1984)             │
│   • Leichtester: Bad Guy (Billie Eilish, 2019)               │
│                                                              │
│        [ Neue Runde ]    [ Zurück zum Setup ]                │
└──────────────────────────────────────────────────────────────┘
```

## Animations & Polish (V1, nicht MVP)
- Karten-Flip beim Reveal
- Album-Cover blurred während Song läuft, scharf beim Reveal
- Konfetti bei Sieg
- Sound-Hooks (Tickticktick beim Platzieren, Ding bei Korrekt)

## Komponenten-Inventar (für Code-Strukturierung)

```
src/
├── components/
│   ├── SpotifyLoginButton.tsx
│   ├── PlaylistPicker.tsx
│   ├── ThemeChips.tsx
│   ├── MixSlider.tsx
│   ├── PlayerSetup.tsx
│   ├── PlayerCard.tsx
│   ├── Timeline.tsx         ← Karten + Gap-Drop-Zones
│   ├── TrackCard.tsx        ← einzelne Karte mit Jahr/Cover
│   ├── PlayerHUD.tsx        ← Punkte aller Spieler unten
│   ├── PlayControls.tsx     ← Play/Pause/Seek
│   ├── RevealOverlay.tsx
│   └── EndScreen.tsx
├── hooks/
│   ├── useSpotifyAuth.ts
│   ├── useSpotifyPlayer.ts  ← Web Playback SDK Wrapper
│   └── useGameState.ts      ← Zustand store
├── lib/
│   ├── spotify-api.ts
│   ├── pkce.ts
│   ├── queue-builder.ts     ← Dedup, Filter, Shuffle, Mix
│   └── scoring.ts
├── data/
│   └── themes.json          ← Theme-Definitionen
├── pages/
│   ├── Login.tsx
│   ├── Setup.tsx
│   ├── Game.tsx
│   └── End.tsx
└── App.tsx
```
