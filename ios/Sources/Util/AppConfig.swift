// Zentrale Schalter (Feature-Flags) für die App.
import Foundation

enum AppConfig {
    /// KILL-SWITCH für die iTunes-30s-Vorschau-Wiedergabe.
    /// `false` = aus (keine iTunes-Abfragen, keine Wiedergabe).
    /// Zum Reaktivieren hier auf `true` setzen.
    static let iTunesPreviewEnabled = false
}
