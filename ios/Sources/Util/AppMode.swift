// Laufzeit-Modus: „Lokal" (privat, Spotify-Import erlaubt) vs. „App Store"
// (öffentlich, keine Spotify-API). Vom Nutzer am Start gewählt, umschaltbar.
import SwiftUI

enum AppMode: String, Codable, CaseIterable, Identifiable {
    case local, appStore
    var id: String { rawValue }

    var title: String { self == .local ? "Lokal" : "App Store" }
    var subtitle: String {
        #if APPSTORE
        // Store-Build kennt nur einen Modus; kein Spotify-Bezug im Binary.
        return "Pool aus Suche, Songliste oder fertigen Packs — gespielt als 30s-Vorschau."
        #else
        return self == .local
            ? "Privat mit deinem Kreis — eure echte Spotify-Playlist als Pool."
            : "Öffentliche Version — Pool per Suche/Liste, ohne Spotify-API."
        #endif
    }
    var icon: String { self == .local ? "person.2.fill" : "globe" }
    /// Ob Spotify-API-Funktionen (Playlist lesen) verfügbar sind.
    /// Im APPSTORE-Build IMMER aus (Spotify-Code ist gar nicht mit drin).
    var spotifyEnabled: Bool {
        #if APPSTORE
        false
        #else
        self == .local
        #endif
    }
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
    var spotifyEnabled: Bool {
        #if APPSTORE
        false
        #else
        (mode ?? .local).spotifyEnabled
        #endif
    }

    init() {
        #if APPSTORE
        mode = .appStore // im Store-Build gibt es keinen Lokal-Modus
        #else
        mode = UserDefaults.standard.string(forKey: key).flatMap(AppMode.init(rawValue:))
        #endif
    }

    func reset() {
        #if APPSTORE
        mode = .appStore
        #else
        mode = nil
        #endif
    }
}
