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
                SpotifyPlaylist(id: $0.id, name: $0.name, trackCount: $0.count)
            }
            url = page.next
        }
        return out
    }

    /// Spotify hat den alten Sub-Endpoint `/tracks` für viele Apps gesperrt (403);
    /// `/items` ist der aktuelle und liefert dieselben Daten. Erst `/items`, bei
    /// 403/404 Fallback auf `/tracks` (genau wie die Web-App, src/lib/spotify-api.ts).
    func playlistTracks(_ playlistId: String) async throws -> [Track] {
        do {
            return try await fetchItems(playlistId, endpoint: "items")
        } catch SpotifyError.forbidden {
            return try await fetchItems(playlistId, endpoint: "tracks")
        } catch SpotifyError.http(404) {
            return try await fetchItems(playlistId, endpoint: "tracks")
        }
    }

    private func fetchItems(_ playlistId: String, endpoint: String) async throws -> [Track] {
        var out: [Track] = []
        var url: URL? = URL(string: "https://api.spotify.com/v1/playlists/\(playlistId)/\(endpoint)?limit=100")
        while let pageURL = url {
            let page: Page<PlaylistTrackItem> = try await get(pageURL)
            for item in page.items {
                // /items legt das Track-Objekt unter `item`, /tracks unter `track`.
                guard let t = item.track ?? item.item, let id = t.id,
                      item.isLocal != true, t.isPlayable != false else { continue }
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
        let status = (response as? HTTPURLResponse)?.statusCode ?? -1
        guard status == 200 else {
            // Spotify gibt für App-Modus-Sperren ein nacktes 403 „Forbidden" zurück —
            // betrifft das Auslesen von Playlist-Inhalten (siehe SpotifyProvider).
            if status == 403 { throw SpotifyError.forbidden }
            throw SpotifyError.http(status)
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
        struct CountRef: Decodable { let total: Int? }
        struct Owner: Decodable { let id: String? }
        let id: String
        let name: String
        let tracks: CountRef?
        let items: CountRef?  // Spotify liefert die Anzahl mittlerweile hier
        let owner: Owner?
        var count: Int { tracks?.total ?? items?.total ?? 0 }
    }

    private struct PlaylistTrackItem: Decodable {
        struct AddedBy: Decodable { let id: String? }
        let track: TrackObject?   // /tracks-Endpoint
        let item: TrackObject?    // /items-Endpoint
        let isLocal: Bool?        // liegt beim /items-Endpoint außen am Element
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
        let isPlayable: Bool?
        let artists: [Artist]
        let album: Album?
    }
}
