// Demo-Modus: eingebauter Songkatalog, Wiedergabe als 30s-Hörprobe —
// funktioniert ohne Spotify-/Apple-Music-Account und im Simulator.
import Foundation

@MainActor
final class DemoProvider: MusicProvider {
    let displayName = "Demo"
    private let preview = PreviewPlayer()

    func loadTracks(settings: GameSettings) async throws -> [Track] {
        DemoCatalog.tracks.shuffled()
    }

    func play(_ track: Track) async throws {
        try await preview.play(artist: track.artist, title: track.name, cacheKey: track.id)
    }

    func pause() { preview.pause() }
    func resume() { preview.resume() }
    func stop() { preview.stop() }
}
