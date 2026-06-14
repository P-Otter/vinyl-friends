// Kuratierte Song-Packs (gebündeltes JSON) — Titel/Künstler/Jahr.
// Jahr aus der Kuratierung (verifiziert), nicht aus iTunes/Spotify.
import Foundation

struct SongPack: Identifiable, Decodable {
    let id: String
    let name: String
    let emoji: String
    let songs: [PackSong]

    func tracks() -> [Track] {
        songs.map { s in
            Track(
                id: "pack-\(id)-\(s.title)-\(s.artist)",
                uri: "",
                name: s.title,
                artist: s.artist,
                albumName: "",
                albumArt: "",
                releaseYear: s.year,
                durationMs: 0,
                explicit: false,
                source: .demo,
                addedByName: nil
            )
        }
    }
}

struct PackSong: Decodable {
    let title: String
    let artist: String
    let year: Int
}

enum SongPacks {
    static let all: [SongPack] = load()

    private static func load() -> [SongPack] {
        guard let url = Bundle.main.url(forResource: "SongPacks", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode(Wrapper.self, from: data)
        else { return [] }
        return decoded.packs
    }

    private struct Wrapper: Decodable { let packs: [SongPack] }
}
