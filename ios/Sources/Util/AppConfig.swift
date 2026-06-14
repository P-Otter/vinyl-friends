// Zentrale Schalter (Feature-Flags) für die App.
import Foundation

enum AppConfig {
    /// Schalter für die 30s-Song-Vorschau (iTunes).
    /// `true` = Ton an (normal). `false` = Ton komplett aus (keine iTunes-Abfragen).
    static let iTunesPreviewEnabled = true

    // Hinweis: Spotify-Import wird jetzt zur Laufzeit über AppMode gesteuert
    // (Lokal = an, App Store = aus), nicht mehr über eine Konstante.
}
