# Game Design

## Grundregeln (Klassischer Modus — relative Ordnung)

**Default-Mechanik nach Review:** Spieler raten/sehen **keine Jahreszahlen**, nur „älter oder neuer als die liegenden Karten?". Die Timeline zeigt Artist/Titel-Karten, das Jahr erscheint erst beim Reveal. Begründung: löst das Jahres-Clustering (unten) UND die `release_date`-Unzuverlässigkeit auf einen Schlag — die exakte Zahl ist für die Mechanik nie nötig.

### Setup
- Host wählt Playlist(s) + optionalen Theme-Mix
- 2–8 Spieler, Reihenfolge festgelegt
- Win-Condition: Erste*r mit **N korrekt einsortierten Karten** (default 10)

### Runden-Ablauf
1. Aktive*r Spieler*in startet die nächste Karte (Button „Song starten")
2. Song läuft, mit zufälligem Offset (verhindert Intro-Erkennung)
3. Spieler*in legt sich fest → klickt Position in der Timeline (zwischen zwei Karten oder ganz links/rechts). **Kein Jahr eingeben.**
4. Bestätigen → Reveal: Karte fliegt auf, zeigt Jahr/Artist/Titel
5. **Korrekt einsortiert** (Reihenfolge stimmt) → Karte bleibt, Punkt
6. **Falsch** → Karte verschwindet, kein Punkt
7. Nächste*r Spieler*in

*Optional-Setting „Jahres-Modus":* statt nur Reihenfolge eine absolute Jahres-Schätzung mit **±2-Jahres-Toleranz**. Für Puristen, aber clustering-anfälliger und auf korrekte `release_date`/MusicBrainz-Jahre angewiesen.

### Steal-Mechanik (Hitster-Original übernehmen)
Nachdem ein*e Spieler*in platziert hat aber **bevor** sie bestätigt, dürfen andere Spieler*innen „Einwand" einlegen — sie behaupten die Karte gehört woanders hin. Wenn der Einwand richtig ist und die ursprüngliche Platzierung falsch wäre, geht die Karte an die einwendende Person (als Bonus-Karte zusätzlich zu ihrer regulären Runde).

→ Im MVP weglassen, in V1 rein. Verkompliziert UI zu früh.

## Artist/Titel-Modus

### Ablauf
- Song läuft, **alle** Spieler*innen hören gleichzeitig
- Erste Person mit korrekter Antwort (Artist + Titel) → Punkt
- Host bestätigt manuell wer zuerst war (Knopf "Punkt an Spieler X")
- Alternativ: Spieler*innen tippen Antwort lokal ein (V2 mit Multi-Device)

### Scoring-Varianten
- Standard: 1 Punkt nur bei Artist + Titel
- Großzügig: 0.5 für nur Artist, 0.5 für nur Titel
- Pro Setting wählbar

### Confidence-Wager (gegen wildes Reinrufen)
- Vor dem Clip setzt jede*r verdeckt Token auf die eigene Sicherheit (z.B. 1–3)
- Richtig → Einsatz als Punkte gutgeschrieben; falsch + hoch gesetzt → Abzug
- Bremst Schnellrufer mit Glücksraten aus, gibt bedächtigen Spielern einen Pfad
- Nach dem Clip **Adder-Username einblenden** — macht den Modus eigenständig ggü. jedem Standard-Musikquiz („warum hat Marcus 2026 Cascada hinzugefügt?")

## Wessen Liebling? / „Wer errät ihn zuerst?" (USP-Modus)

Der eigentliche Grund warum der Friends-Pool besser ist als ein Standard-Quiz. Aus dem Review in den frühen Scope (V1) gezogen. Zwei Spielarten:

**A — Wer errät ihn zuerst? (empfohlen)**
- Vor dem Clip wetten alle, **welche*r Mitspieler*in den Song zuerst korrekt benennt**
- Clip läuft, erste korrekte Nennung gewinnt → wer richtig auf diese Person gewettet hat, kriegt Punkte
- Invertiert die Aufgabe von „Erinnerung" zu „Social-Modeling" (wer kennt wen?) — nutzt sich nicht ab, auch wenn man die Geschmäcker kennt. Wenn alle wissen „das ist Saras Song", wird die Spannung: chokt Sara unter Druck?

**B — Wessen Liebling ist das? (simpler)**
- Song läuft, Spieler raten **wer ihn zur Playlist hinzugefügt hat**
- Datenquelle: `added_by` aus der collaborative Spotify-Playlist
- Schwächer in kleinen, eng vertrauten Gruppen (zu leicht). Gegenmittel: **Ghost-Tracks** — ein paar Songs anonym/aus dem Theme-Pool reinmischen, damit Unsicherheit bleibt

**Mindest-Spieleranzahl:** 4+, ideal 5+. Darunter zu vorhersehbar.

## Theme-Packs

### Wie sie wirken
- Host wählt aktive Themes vor Spielstart
- Slider: "Friends-Anteil" 0–100%, Rest verteilt sich gleichmäßig auf gewählte Themes
- App generiert vor Spielstart eine kombinierte, durchgemischte Song-Queue
- Pro Song wird beim Reveal angezeigt aus welcher Quelle er kam ("aus Friends-Pool" / "aus Theme: 80er")
- Im **Klassik-Modus** zusätzlich als „Spread-Boost" nutzbar: streckt die Timeline über mehr Jahrzehnte. Bewusst **opt-in, nicht Pflicht** — sonst wird die eigene Lieblingsmusik zu bloßem Füllmaterial und das USP verwässert.

### Starter-Themes (V1)
- Filmsoundtracks
- Disney/Animation
- 70er Klassiker
- 80er Pop
- 90er Hip-Hop
- 2000er Indie
- Eurodance
- Deutsche Hits

Jedes Theme = eine kuratierte Spotify-Playlist deren ID in `src/data/themes.json` liegt.

## Edge-Cases

### Song nicht abspielbar (Markt-Restriktion, Track removed)
- App skippt automatisch, Notice unten "Song nicht verfügbar — übersprungen"
- Spieler verliert nicht den Zug

### Doppelte Songs (selbe Track-ID in Friends + Theme)
- Vor Spielstart dedupliziert
- Friends-Pool gewinnt (es ist ja jemandes Lieblingssong)

### Compilation/Best-Of falsches Jahr
- Anzeigen mit Sternchen: „1969*" mit Tooltip „lt. Spotify-Album, kann bei Compilations abweichen"
- v2: MusicBrainz-Fallback

### Zwei Karten aus dem gleichen Jahr
- Reihenfolge egal, jede Position zwischen oder davor/danach gilt als korrekt
- Bei exakt gleichem Tag: auch egal

### Spotify-Connection bricht ab
- Reconnect-Versuch automatisch, sonst Game-State im LocalStorage gerettet → bei Reload kann weitergespielt werden

## Win-Conditions (alle wählbar)
- **Karten-Race**: Erste*r mit N Karten gewinnt (default, klassisch)
- **Zeit-Limit**: 30 Min Spielzeit, meiste Karten gewinnt
- **Sudden Death**: Bei Gleichstand am Ende — eine letzte Karte entscheidet

## Schwierigkeitsbalance
Friends-Pool ist tendenziell „leichter" als Hitster (Songs die jemand liebt → wahrscheinlicher dass andere sie kennen). Daher:
- Default Win-Condition höher (10 statt 8)
- Theme-Packs erhöhen Schwierigkeit, weil unbekannte Songs reinkommen
- Setting „Schwer-Modus": Reveal zeigt nur Jahr, Spieler müssen Artist/Titel selbst rausfinden (kombinierter Modus)

## ⚠ Kern-Risiko: Jahres-Clustering bricht den Klassik-Modus
Das ist die wichtigste Design-Erkenntnis und betrifft den entschiedenen Haupt-Modus.

**Problem:** Hitsters Timeline funktioniert nur, weil das Original-Deck bewusst über 1955–2024 gestreut ist. Eine echte Freundes-Lieblingsplaylist verteilt sich nicht gleichmäßig — sie ballt sich um die prägenden Jahre der Gruppe + aktuelle Faves, realistisch ~2005–2024. Effekt: Die meisten Karten liegen im selben schmalen Band, „dazwischen einsortieren" wird zum Münzwurf zwischen benachbarten Jahren, und die elegante Timeline-Spannung verpufft.

**Das heißt: der Pool den der Nutzer will (Friends-Faves) passt am schlechtesten zum Modus den er gewählt hat (Jahr-Timeline).** Die Modi „Wessen Lieblingssong?" und „Artist/Titel" gewinnen dagegen GERADE durch persönliche, bekannte Songs.

**Lösungsoptionen (nicht exklusiv):**
1. **Sub-Year-Granularität:** Bei eng beieinander liegenden Karten auf Monat/Quartal statt nur Jahr einsortieren. Mehr Präzision im dichten Band, aber UI komplexer und Spotify-release_date ist da unzuverlässig (Album- statt Song-Datum).
2. **Closest-Year-Scoring statt strikter Reihenfolge:** Punkt wenn die Schätzung ±2 Jahre trifft, statt „korrekt zwischen Nachbarn". Verzeiht das Clustering, fühlt sich aber weniger nach Timeline an.
3. **Theme-Packs als Pflicht-Spreizung:** Klassik-Modus erzwingt einen Mindest-Theme-Anteil. Friends-Pool liefert die Mitte, Themes die Ränder. Risiko: untergräbt das eigene USP, wenn die spannenden Jahrzehnte Füllmaterial sind.
4. **Modus-Pool-Kopplung:** Friends-Pool speist primär „Wessen Lieblingssong?" + „Artist/Titel". Jahr-Timeline läuft bevorzugt auf gestreuten Theme-Packs.
5. **Relative Ordnung ohne Jahreszahlen (GEWÄHLT):** Spieler sehen/raten keine absoluten Jahre, nur die Reihenfolge. Clustering wird zum Feature statt Bug (2011 vs. 2013 = echte Unsicherheit), und das unzuverlässige `release_date` ist für die Mechanik irrelevant. Aufgabe verschiebt sich von „Jahr abrufen" zu „Erinnerungen sortieren" — sozialer und im Friends-Kontext besser.

**Entscheidung nach Review:** Variante **5 als Default-Classic**. Variante 2 (±2-Toleranz) als optionales „Jahres-Modus"-Setting. Variante 3 nur als **opt-in Spread-Boost**, nicht als Default-Guardrail. „Wessen Lieblingssong?" wurde in den frühen Scope (V1) gezogen — es ist der eigentliche USP dieses Pools.

**Weitere Mechaniken aus dem Review (V2-Kandidaten):**
- **Hot/Cold-Nudge (aus Wavelength):** Nach dem Platzieren dürfen andere die Karte still um eine Position schieben, bevor gewertet wird → Bluff-Layer.
- **Team-Asymmetrie (aus Codenames):** Eine Person hört 10s vor, gibt einen Hinweis (nicht Titel/Artist), das Team wettet dann auf Reihenfolge.
