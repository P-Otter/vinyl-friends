// Spotify Web API: eigene Playlists und Playlist-Tracks (mit Pagination) —
// portiert aus src/lib/spotify-api.ts der Web-App.
import Foundation

struct SpotifyPlaylist: Identifiable, Hashable {
    let id: String
    let name: String
    let trackCount: Int
}

@MainActor
final class SpotifyAPI {
    private let auth: SpotifyAuth

    init(auth: SpotifyAuth) {
        self.auth = auth
    }

    func myPlaylists() async throws -> [SpotifyPlaylist] {
        var out: [SpotifyPlaylist] = []
        var url: URL? = URL(string: "https://api.spotify.com/v1/me/playlists?limit=50")
        while let pageURL = url {
            let page: Page<PlaylistItem> = try await get(pageURL)
            out += page.items.map {
                SpotifyPlaylist(id: $0.id, name: $0.name, trackCount: $0.tracks?.total ?? 0)
            }
            url = page.next
        }
        return out
    }

    func playlistTracks(_ playlistId: String) async throws -> [Track] {
        var out: [Track] = []
        var url: URL? = URL(string: "https://api.spotify.com/v1/playlists/\(playlistId)/tracks?limit=100")
        while let pageURL = url {
            let page: Page<PlaylistTrackItem> = try await get(pageURL)
            for item in page.items {
                guard let t = item.track, let id = t.id, t.isLocal != true else { continue }
                let year = Int(String((t.album?.releaseDate ?? "").prefix(4))) ?? 0
                out.append(Track(
                    id: id,
                    uri: t.uri ?? "",
                    name: t.name,
                    artist: t.artists.map(\.name).joined(separator: ", "),
                    albumName: t.album?.name ?? "",
                    albumArt: t.album?.images?.first?.url ?? "",
                    releaseYear: year,
                    durationMs: t.durationMs,
                    explicit: t.explicit ?? false,
                    source: .friends,
                    addedByName: item.addedBy?.id
                ))
            }
            url = page.next
        }
        return out
    }

    // MARK: HTTP + Decoding

    private func get<T: Decodable>(_ url: URL) async throws -> T {
        var req = URLRequest(url: url)
        let token = try await auth.validAccessToken()
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw SpotifyError.http((response as? HTTPURLResponse)?.statusCode ?? -1)
        }
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(T.self, from: data)
    }

    private struct Page<Item: Decodable>: Decodable {
        let items: [Item]
        let next: URL?
    }

    private struct PlaylistItem: Decodable {
        struct TracksRef: Decodable { let total: Int? }
        let id: String
        let name: String
        let tracks: TracksRef?
    }

    private struct PlaylistTrackItem: Decodable {
        struct AddedBy: Decodable { let id: String? }
        let track: TrackObject?
        let addedBy: AddedBy?
    }

    private struct TrackObject: Decodable {
        struct Artist: Decodable { let name: String }
        struct Image: Decodable { let url: String }
        struct Album: Decodable {
            let name: String?
            let releaseDate: String?
            let images: [Image]?
        }
        let id: String?
        let uri: String?
        let name: String
        let durationMs: Int
        let explicit: Bool?
        let isLocal: Bool?
        let artists: [Artist]
        let album: Album?
    }
}
