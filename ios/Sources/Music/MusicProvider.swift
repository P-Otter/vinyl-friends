// Austauschbare Player-Schicht: Demo (iTunes-Previews, ohne Account),
// später Spotify (privater Kreis) und Apple Music/MusicKit (App-Store-Version).
import Foundation

enum MusicProviderError: LocalizedError {
    case previewNotFound(String)
    case previewDisabled
    case notImplemented(String)

    var errorDescription: String? {
        switch self {
        case .previewNotFound(let track):
            return "Keine Hörprobe gefunden für „\(track)“."
        case .previewDisabled:
            return "Vorschau ist aus (Killswitch)."
        case .notImplemented(let provider):
            return "\(provider) ist noch nicht angebunden."
        }
    }
}

@MainActor
protocol MusicProvider: AnyObject {
    var displayName: String { get }
    /// Liefert die gemischte Spiel-Queue.
    func loadTracks(settings: GameSettings) async throws -> [Track]
    func play(_ track: Track) async throws
    func pause()
    func resume()
    func stop()
}

/// Hält den aktiven Provider für die ganze App.
@MainActor
final class MusicSession: ObservableObject {
    @Published var provider: (any MusicProvider)?
}
