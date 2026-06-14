// Song-Suche über die öffentliche iTunes-Search-API — liefert Titel, Künstler,
// Erscheinungsjahr und 30s-Vorschau, ohne Account/Spotify. Basis für den
// eigenen Pool (öffentliche, legale Variante: keine Spotify-Daten).
import Foundation

@MainActor
enum SongSearch {
    static func search(_ query: String, limit: Int = 25) async throws -> [Track] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 2 else { return [] }

        var comps = URLComponents(string: "https://itunes.apple.com/search")!
        comps.queryItems = [
            URLQueryItem(name: "term", value: trimmed),
            URLQueryItem(name: "media", value: "music"),
            URLQueryItem(name: "entity", value: "song"),
            URLQueryItem(name: "limit", value: String(limit)),
        ]
        let (data, _) = try await URLSession.shared.data(from: comps.url!)
        let response = try JSONDecoder().decode(Response.self, from: data)

        var seen = Set<String>()
        var out: [Track] = []
        for r in response.results {
            guard let id = r.trackId, r.previewUrl != nil else { continue }
            let year = Int(String((r.releaseDate ?? "").prefix(4))) ?? 0
            guard year > 0 else { continue }
            let key = "\(r.trackName ?? "")|\(r.artistName ?? "")".lowercased()
            if seen.contains(key) { continue }
            seen.insert(key)
            out.append(Track(
                id: "itunes-\(id)",
                uri: r.trackViewUrl ?? "",
                name: r.trackName ?? "",
                artist: r.artistName ?? "",
                albumName: r.collectionName ?? "",
                albumArt: (r.artworkUrl100 ?? "").replacingOccurrences(of: "100x100", with: "300x300"),
                releaseYear: year,
                durationMs: r.trackTimeMillis ?? 0,
                explicit: (r.trackExplicitness ?? "") == "explicit",
                source: .demo,
                addedByName: nil
            ))
        }
        return out
    }

    private struct Response: Decodable {
        let results: [Item]
    }
    private struct Item: Decodable {
        let trackId: Int?
        let trackName: String?
        let artistName: String?
        let collectionName: String?
        let artworkUrl100: String?
        let releaseDate: String?
        let trackTimeMillis: Int?
        let trackExplicitness: String?
        let trackViewUrl: String?
        let previewUrl: String?
    }
}
