// Datenmodell — portiert aus src/types.ts der Web-App. Client-only, kein Backend.
import Foundation

enum TrackSource: Codable, Hashable {
    case friends
    case theme(String)
    case demo
}

struct Track: Codable, Hashable, Identifiable {
    var id: String
    var uri: String
    var name: String
    var artist: String
    var albumName: String
    var albumArt: String
    var releaseYear: Int
    var durationMs: Int
    var explicit: Bool
    var source: TrackSource
    var addedByName: String?
}

struct Player: Codable, Hashable, Identifiable {
    var id: UUID = UUID()
    var name: String
    var colorHex: String
    // Korrekt platzierte Karten (= Score), chronologisch sortiert.
    var cards: [Track] = []
    var attempts: Int = 0
    var hits: Int = 0
    // Karten, bei denen der Bonus (Titel/Artist/Jahr) ausreichend erraten wurde.
    var masteredCount: Int = 0
}

enum WinCondition: Codable, Hashable {
    case cards(Int)
    case time(minutes: Int)
}

struct GameSettings: Codable, Hashable {
    var winCondition: WinCondition = .cards(10)
    var minTrackLengthSec: Int = 60
    var allowExplicit: Bool = true
    var randomOffset: Bool = true
    // Sekunden, die ein Song-Schnipsel spielt, bevor automatisch gestoppt wird.
    // 30s-Vorschauen begrenzen das nach oben; volle Songs (Spotify auf dem Gerät)
    // erlauben später mehr.
    var snippetSeconds: Int = 20
    var cardLook: TimelineCardStyle = .classic

    // Bonus-Raten nach korrektem Platzieren.
    var bonusEnabled: Bool = true
    // Wie viele von {Jahr, Titel, Artist} müssen stimmen, damit eine Karte als
    // „gemeistert" zählt (2 = leichter, 3 = alle).
    var masteryThreshold: Int = 2
    // So viele gemeisterte Karten braucht man zusätzlich zur Kartenzahl zum Sieg.
    var requiredMastered: Int = 3
    // ± Jahre, innerhalb derer eine Jahresschätzung als richtig gilt.
    var yearTolerance: Int = 2
    // Klauen: bei falschem Platzieren darf der nächste Spieler die Karte stehlen.
    var stealEnabled: Bool = true
}

enum GamePhase: String, Codable {
    case setup, playing, bonus, steal, reveal, finished
}

/// Spielmodi.
enum GameMode: String, Codable, CaseIterable, Identifiable {
    case classic        // Wettlauf um Karten (+ optional Raten)
    case plattenboerse  // Catan-Style: Dekaden-Abzeichen + Punkte
    var id: String { rawValue }
    var label: String { self == .classic ? "Klassik" : "Plattenbörse" }
    var blurb: String {
        self == .classic
            ? "Sammle Karten, errate Songs."
            : "Führe Jahrzehnte an — Abzeichen geben Punkte."
    }
}

/// Ergebnis des Bonus-Ratens (Titel/Artist/Jahr) zu einer platzierten Karte.
struct BonusResult: Codable, Hashable {
    var titleCorrect: Bool
    var artistCorrect: Bool
    var yearCorrect: Bool
    var titleGuess: String
    var artistGuess: String
    var yearGuess: Int
    var correctCount: Int { (titleCorrect ? 1 : 0) + (artistCorrect ? 1 : 0) + (yearCorrect ? 1 : 0) }
    var mastered: Bool
}

/// Optik der Timeline-Karten — im Setup wählbar.
enum TimelineCardStyle: String, Codable, CaseIterable, Identifiable {
    case classic, vinyl, shelf
    var id: String { rawValue }
    var label: String {
        switch self {
        case .classic: return "Klassisch"
        case .vinyl: return "Mini-Platte"
        case .shelf: return "Plattenregal"
        }
    }
}

// Ergebnis einer Platzierung, fürs Reveal-Overlay festgehalten.
struct PlacementResult: Codable, Hashable {
    var track: Track
    var playerId: UUID
    var insertIndex: Int
    var correct: Bool
    var bonus: BonusResult?
    var isSteal: Bool = false
}
