// Scoring für den Klassik-Modus (relative Ordnung) — portiert aus src/lib/scoring.ts.
// Gleiche Jahre an den Rändern gelten als korrekt (>=/<=), Ties sind also erlaubt.
import Foundation

enum Scoring {
    /// Karten chronologisch nach Jahr sortieren (Swift-Sort ist stabil).
    static func sortByYear(_ cards: [Track]) -> [Track] {
        cards.sorted { $0.releaseYear < $1.releaseYear }
    }

    /// insertIndex ist die Lücke: 0 = ganz links, cards.count = ganz rechts.
    static func isPlacementCorrect(sorted: [Track], track: Track, insertIndex: Int) -> Bool {
        let left = insertIndex > 0 ? sorted[insertIndex - 1] : nil
        let right = insertIndex < sorted.count ? sorted[insertIndex] : nil
        let okLeft = left.map { track.releaseYear >= $0.releaseYear } ?? true
        let okRight = right.map { track.releaseYear <= $0.releaseYear } ?? true
        return okLeft && okRight
    }

    /// Korrekt platzierte Karte einsortiert zurückgeben (bleibt chronologisch).
    static func insertCard(sorted: [Track], track: Track) -> [Track] {
        sortByYear(sorted + [track])
    }

    struct PlayerStats: Identifiable {
        var id: UUID { playerId }
        let playerId: UUID
        let name: String
        let colorHex: String
        let cards: Int
        let accuracy: Double // 0..1
    }

    static func ranking(_ players: [Player]) -> [PlayerStats] {
        players
            .map {
                PlayerStats(
                    playerId: $0.id,
                    name: $0.name,
                    colorHex: $0.colorHex,
                    cards: $0.cards.count,
                    accuracy: $0.attempts > 0 ? Double($0.hits) / Double($0.attempts) : 0
                )
            }
            .sorted { ($0.cards, $0.accuracy) > ($1.cards, $1.accuracy) }
    }
}
