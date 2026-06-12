// Demo-Modus: spielt 30s-Hörproben über die öffentliche iTunes-Search-API —
// funktioniert ohne Spotify-/Apple-Music-Account und im Simulator.
import AVFoundation
import Foundation

@MainActor
final class DemoProvider: MusicProvider {
    let displayName = "Demo"
    private let player = AVPlayer()
    private var previewCache: [String: URL] = [:]

    func loadTracks(settings: GameSettings) async throws -> [Track] {
        DemoCatalog.tracks.shuffled()
    }

    func play(_ track: Track) async throws {
        let url = try await previewURL(for: track)
        try? AVAudioSession.sharedInstance().setCategory(.playback)
        try? AVAudioSession.sharedInstance().setActive(true)
        player.replaceCurrentItem(with: AVPlayerItem(url: url))
        player.play()
    }

    func pause() { player.pause() }
    func resume() { player.play() }

    func stop() {
        player.pause()
        player.replaceCurrentItem(with: nil)
    }

    private func previewURL(for track: Track) async throws -> URL {
        if let cached = previewCache[track.id] { return cached }
        var comps = URLComponents(string: "https://itunes.apple.com/search")!
        comps.queryItems = [
            URLQueryItem(name: "term", value: "\(track.artist) \(track.name)"),
            URLQueryItem(name: "media", value: "music"),
            URLQueryItem(name: "limit", value: "1"),
        ]
        let (data, _) = try await URLSession.shared.data(from: comps.url!)
        let response = try JSONDecoder().decode(SearchResponse.self, from: data)
        guard let preview = response.results.first?.previewUrl else {
            throw MusicProviderError.previewNotFound(track.name)
        }
        previewCache[track.id] = preview
        return preview
    }

    private struct SearchResponse: Decodable {
        struct Item: Decodable { let previewUrl: URL? }
        let results: [Item]
    }
}
