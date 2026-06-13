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
}

enum GamePhase: String, Codable {
    case setup, playing, reveal, finished
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
}
