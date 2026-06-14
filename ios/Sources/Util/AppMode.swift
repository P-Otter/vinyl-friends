// Laufzeit-Modus: „Lokal" (privat, Spotify-Import erlaubt) vs. „App Store"
// (öffentlich, keine Spotify-API). Vom Nutzer am Start gewählt, umschaltbar.
import SwiftUI

enum AppMode: String, Codable, CaseIterable, Identifiable {
    case local, appStore
    var id: String { rawValue }

    var title: String { self == .local ? "Lokal" : "App Store" }
    var subtitle: String {
        self == .local
            ? "Privat mit deinem Kreis — eure echte Spotify-Playlist als Pool."
            : "Öffentliche Version — Pool per Suche/Liste, ohne Spotify-API."
    }
    var icon: String { self == .local ? "person.2.fill" : "globe" }
    /// Ob Spotify-API-Funktionen (Playlist lesen) verfügbar sind.
    var spotifyEnabled: Bool { self == .local }
}

@MainActor
final class AppModeStore: ObservableObject {
    @Published var mode: AppMode? {
        didSet {
            if let mode { UserDefaults.standard.set(mode.rawValue, forKey: key) }
            else { UserDefaults.standard.removeObject(forKey: key) }
        }
    }

    private let key = "appMode"
    /// Default „lokal", solange nichts gewählt (z. B. in Demo-/Dev-Starts).
    var spotifyEnabled: Bool { (mode ?? .local).spotifyEnabled }

    init() {
        mode = UserDefaults.standard.string(forKey: key).flatMap(AppMode.init(rawValue:))
    }

    func reset() { mode = nil }
}
