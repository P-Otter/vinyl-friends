// Spotify-App-Konfiguration. Die Client-ID ist öffentlich (PKCE, kein Secret).
// WICHTIG: Die Redirect-URI muss exakt so im Spotify Developer Dashboard
// (https://developer.spotify.com/dashboard) bei der App hinterlegt sein.
import Foundation

enum SpotifyConfig {
    static let clientID = "061815aad912456a892d0f621c67aca8"
    static let scheme = "hitsterfriends"
    static let redirectURI = "hitsterfriends://callback"
    static let scopes = "playlist-read-private playlist-read-collaborative"
}
