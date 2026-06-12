// Gemeinsamer 30s-Hörproben-Player (iTunes-Search-API + AVPlayer).
// Wird vom Demo-Modus und vorerst auch vom Spotify-Provider genutzt —
// läuft ohne Streaming-Account und im Simulator.
import AVFoundation
import Foundation

@MainActor
final class PreviewPlayer {
    private let player = AVPlayer()
    private var cache: [String: URL] = [:]

    func play(artist: String, title: String, cacheKey: String) async throws {
        let url = try await previewURL(artist: artist, title: title, cacheKey: cacheKey)
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

    private func previewURL(artist: String, title: String, cacheKey: String) async throws -> URL {
        if let cached = cache[cacheKey] { return cached }
        var comps = URLComponents(string: "https://itunes.apple.com/search")!
        comps.queryItems = [
            URLQueryItem(name: "term", value: "\(artist) \(title)"),
            URLQueryItem(name: "media", value: "music"),
            URLQueryItem(name: "limit", value: "1"),
        ]
        let (data, _) = try await URLSession.shared.data(from: comps.url!)
        let response = try JSONDecoder().decode(SearchResponse.self, from: data)
        guard let preview = response.results.first?.previewUrl else {
            throw MusicProviderError.previewNotFound(title)
        }
        cache[cacheKey] = preview
        return preview
    }

    private struct SearchResponse: Decodable {
        struct Item: Decodable { let previewUrl: URL? }
        let results: [Item]
    }
}
