// Spotify-Provider: echte Playlists über die Web API, Wiedergabe vorerst als
// 30s-Hörprobe (PreviewPlayer) — damit komplett im Simulator testbar.
// Volles Playback über das Spotify iOS SDK (App Remote) folgt auf dem Gerät.
import Foundation

@MainActor
final class SpotifyProvider: MusicProvider {
    let displayName = "Spotify"
    let auth = SpotifyAuth()
    private lazy var api = SpotifyAPI(auth: auth)
    private let preview = PreviewPlayer()

    var selectedPlaylist: SpotifyPlaylist?

    var isAuthorized: Bool { auth.isAuthorized }

    func authorize() async throws {
        try await auth.authorize()
    }

    func myPlaylists() async throws -> [SpotifyPlaylist] {
        try await api.myPlaylists()
    }

    /// Tracks einer Playlist (für den Pool-Import). Nur sinnvoll verwertbare
    /// (Jahr bekannt), dedupliziert.
    func playlistTracks(_ playlistId: String) async throws -> [Track] {
        let raw = try await api.playlistTracks(playlistId)
        var seen = Set<String>()
        return raw.filter { $0.releaseYear > 0 && seen.insert($0.id).inserted }
    }

    func loadTracks(settings: GameSettings) async throws -> [Track] {
        guard let playlist = selectedPlaylist else { throw SpotifyError.noPlaylistSelected }
        let raw = try await api.playlistTracks(playlist.id)

        let filtered = raw.filter { track in
            track.releaseYear > 0
                && track.durationMs >= settings.minTrackLengthSec * 1000
                && (settings.allowExplicit || !track.explicit)
        }

        var seen = Set<String>()
        var unique: [Track] = []
        for track in filtered where !seen.contains(track.id) {
            seen.insert(track.id)
            unique.append(track)
        }
        return unique.shuffled()
    }

    func play(_ track: Track) async throws {
        try await preview.play(artist: track.artist, title: track.name, cacheKey: track.id)
    }

    func pause() { preview.pause() }
    func resume() { preview.resume() }
    func stop() { preview.stop() }
}
