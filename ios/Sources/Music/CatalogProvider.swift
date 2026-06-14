// Provider für einen selbst gebauten Song-Pool (Suche + Import).
// Keine Spotify-Daten/-API — Wiedergabe als 30s-Vorschau. Das ist die legale,
// App-Store-taugliche Quelle (siehe Compliance-Entscheidung).
import Foundation

@MainActor
final class CatalogProvider: MusicProvider {
    let displayName = "Eigener Pool"
    private(set) var pool: [Track]
    private let preview = PreviewPlayer()

    init(pool: [Track] = []) {
        self.pool = pool
    }

    func setPool(_ tracks: [Track]) { pool = tracks }

    func loadTracks(settings: GameSettings) async throws -> [Track] {
        pool.filter { $0.releaseYear > 0 }.shuffled()
    }

    func play(_ track: Track) async throws {
        try await preview.play(artist: track.artist, title: track.name, cacheKey: track.id)
    }

    func pause() { preview.pause() }
    func resume() { preview.resume() }
    func stop() { preview.stop() }
}
