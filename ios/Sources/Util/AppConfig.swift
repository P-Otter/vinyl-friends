// Zentrale Schalter (Feature-Flags) für die App.
import Foundation

enum AppConfig {
    /// Schalter für die 30s-Song-Vorschau (iTunes).
    /// `true` = Ton an (normal). `false` = Ton komplett aus (keine iTunes-Abfragen).
    static let iTunesPreviewEnabled = true

    /// Spotify-Playlist-Import in den Pool.
    /// `true` = PRIVATE Version (≤5 Nutzer, TestFlight/Sideload, NICHT im Store).
    /// `false` = ÖFFENTLICHE App-Store-Version (Spotify-API darf NICHT mit rein).
    /// Vor jedem Store-Upload auf `false` setzen.
    static let spotifyImportEnabled = true
}
