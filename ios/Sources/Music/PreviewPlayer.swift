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
            URLQueryItem(name: "entity", value: "song"),
            URLQueryItem(name: "limit", value: "8"),
        ]
        let (data, _) = try await URLSession.shared.data(from: comps.url!)
        let response = try JSONDecoder().decode(SearchResponse.self, from: data)
        let candidates = response.results.filter { $0.previewUrl != nil }

        // iTunes liefert oft Cover/Remixes/fremde Songs. Erst den nehmen, dessen
        // Titel UND Künstler passen, dann nur-Titel, sonst (zur Not) den ersten.
        let best = candidates.first { match(title, $0.trackName) && matchArtist(artist, $0.artistName) }
            ?? candidates.first { match(title, $0.trackName) }
            ?? candidates.first

        guard let preview = best?.previewUrl else {
            throw MusicProviderError.previewNotFound(title)
        }
        cache[cacheKey] = preview
        return preview
    }

    private func match(_ a: String, _ b: String?) -> Bool {
        guard let b else { return false }
        return FuzzyMatch.matches(a, b, tolerance: 0.2)
    }

    private func matchArtist(_ a: String, _ b: String?) -> Bool {
        guard let b else { return false }
        return FuzzyMatch.matchesArtist(a, b, tolerance: 0.2)
    }

    private struct SearchResponse: Decodable {
        struct Item: Decodable {
            let trackName: String?
            let artistName: String?
            let previewUrl: URL?
        }
        let results: [Item]
    }
}
