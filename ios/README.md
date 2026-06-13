# Vinyl Friends — iOS-App

Natives SwiftUI-Spiel: Hör den Song, schätze das Erscheinungsjahr, bau deine Zeitleiste.
Der **Demo-Modus** läuft ohne Spotify-/Apple-Music-Account (30s-Hörproben über die iTunes-API).

## Selbst bauen (kostenlos, eigener Mac nötig)

1. **Xcode installieren** (Mac App Store, kostenlos) und einmal öffnen, damit die
   iOS-Plattform mitinstalliert wird.
2. **Projekt generieren** (das `.xcodeproj` ist nicht eingecheckt):
   ```sh
   brew install xcodegen
   cd ios && xcodegen generate
   ```
3. `HitsterFriends.xcodeproj` in Xcode öffnen.

### Im Simulator spielen
Oben ein iPhone als Ziel wählen → **▶ Play**. Fertig.

### Auf dem eigenen iPhone spielen
1. Xcode → Settings → Accounts → mit deiner (kostenlosen) Apple-ID anmelden.
2. Im Projekt unter *Signing & Capabilities* dein „Personal Team" auswählen.
3. iPhone per Kabel anschließen, als Ziel wählen → **▶ Play**.
4. Beim ersten Start auf dem iPhone: Einstellungen → Allgemein → VPN & Geräteverwaltung
   → deinem Entwicklerzertifikat vertrauen.

Hinweis: Mit kostenloser Apple-ID läuft die Signatur nach **7 Tagen** ab — danach die App
einfach erneut aus Xcode aufs iPhone spielen (Daten bleiben erhalten).

## Architektur

- `Sources/Models.swift`, `Scoring.swift`, `GameEngine.swift` — Spiellogik (portiert aus der Web-App in `../src/`)
- `Sources/Music/` — austauschbare Player-Schicht (`MusicProvider`-Protokoll):
  - `DemoProvider` — iTunes-Previews, ohne Account ✅
  - Spotify (privater Kreis, max. 25 Allowlist-Nutzer) — geplant
  - Apple Music / MusicKit (App-Store-Version) — geplant
- `Sources/Views/` — SwiftUI-Screens: Home → Spieler → Spiel → Auflösung → Endstand
