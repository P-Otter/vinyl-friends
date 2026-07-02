#if !APPSTORE  // im App-Store-Build komplett ausgeschlossen
// Spotify-Login per PKCE (Authorization Code + Code Challenge) —
// portiert aus src/lib/pkce.ts + spotify-auth.ts der Web-App.
import AuthenticationServices
import CryptoKit
import Foundation
import UIKit

enum SpotifyError: LocalizedError {
    case notAuthorized
    case authFailed
    case http(Int)
    case forbidden
    case noPlaylistSelected

    var errorDescription: String? {
        switch self {
        case .notAuthorized: return "Nicht bei Spotify angemeldet."
        case .authFailed: return "Spotify-Login fehlgeschlagen oder abgebrochen."
        case .http(let code): return "Spotify-Anfrage fehlgeschlagen (HTTP \(code))."
        case .forbidden:
            return "Spotify hat den Zugriff verweigert (403)."
        case .noPlaylistSelected: return "Bitte zuerst eine Playlist auswählen."
        }
    }
}

@MainActor
final class SpotifyAuth: NSObject, ASWebAuthenticationPresentationContextProviding {
    private struct Tokens: Codable {
        var accessToken: String
        var refreshToken: String
        var expiresAt: Date
    }

    private let storageKey = "spotify_tokens"
    private var currentSession: ASWebAuthenticationSession?

    private var tokens: Tokens? {
        get {
            guard let data = UserDefaults.standard.data(forKey: storageKey) else { return nil }
            return try? JSONDecoder().decode(Tokens.self, from: data)
        }
        set {
            if let newValue, let data = try? JSONEncoder().encode(newValue) {
                UserDefaults.standard.set(data, forKey: storageKey)
            } else {
                UserDefaults.standard.removeObject(forKey: storageKey)
            }
        }
    }

    var isAuthorized: Bool { tokens != nil }

    func signOut() { tokens = nil }

    // MARK: Login-Flow

    func authorize() async throws {
        let verifier = Self.randomVerifier()
        let challenge = Self.challenge(for: verifier)

        var comps = URLComponents(string: "https://accounts.spotify.com/authorize")!
        comps.queryItems = [
            URLQueryItem(name: "client_id", value: SpotifyConfig.clientID),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "redirect_uri", value: SpotifyConfig.redirectURI),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "code_challenge", value: challenge),
            URLQueryItem(name: "scope", value: SpotifyConfig.scopes),
        ]

        let callbackURL: URL = try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: comps.url!,
                callbackURLScheme: SpotifyConfig.scheme
            ) { url, error in
                if let url {
                    continuation.resume(returning: url)
                } else {
                    continuation.resume(throwing: error ?? SpotifyError.authFailed)
                }
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            self.currentSession = session
            session.start()
        }
        currentSession = nil

        guard let code = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false)?
            .queryItems?.first(where: { $0.name == "code" })?.value
        else { throw SpotifyError.authFailed }

        try await exchangeCode(code, verifier: verifier)
    }

    /// Gültiges Access-Token liefern, bei Bedarf vorher refreshen.
    func validAccessToken() async throws -> String {
        guard let current = tokens else { throw SpotifyError.notAuthorized }
        if current.expiresAt > Date().addingTimeInterval(60) {
            return current.accessToken
        }
        try await refresh(using: current.refreshToken)
        guard let refreshed = tokens else { throw SpotifyError.notAuthorized }
        return refreshed.accessToken
    }

    // MARK: Token-Endpunkt

    private struct TokenResponse: Decodable {
        let accessToken: String
        let refreshToken: String?
        let expiresIn: Int
    }

    private func exchangeCode(_ code: String, verifier: String) async throws {
        try await tokenRequest(body: [
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": SpotifyConfig.redirectURI,
            "client_id": SpotifyConfig.clientID,
            "code_verifier": verifier,
        ], fallbackRefreshToken: nil)
    }

    private func refresh(using refreshToken: String) async throws {
        try await tokenRequest(body: [
            "grant_type": "refresh_token",
            "refresh_token": refreshToken,
            "client_id": SpotifyConfig.clientID,
        ], fallbackRefreshToken: refreshToken)
    }

    private func tokenRequest(body: [String: String], fallbackRefreshToken: String?) async throws {
        var req = URLRequest(url: URL(string: "https://accounts.spotify.com/api/token")!)
        req.httpMethod = "POST"
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        req.httpBody = body
            .map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? $0.value)" }
            .joined(separator: "&")
            .data(using: .utf8)

        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw SpotifyError.http((response as? HTTPURLResponse)?.statusCode ?? -1)
        }
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let token = try decoder.decode(TokenResponse.self, from: data)
        tokens = Tokens(
            accessToken: token.accessToken,
            refreshToken: token.refreshToken ?? fallbackRefreshToken ?? "",
            expiresAt: Date().addingTimeInterval(TimeInterval(token.expiresIn))
        )
    }

    // MARK: PKCE-Bausteine

    private static func randomVerifier() -> String {
        let charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
        return String((0..<64).compactMap { _ in charset.randomElement() })
    }

    private static func challenge(for verifier: String) -> String {
        let digest = SHA256.hash(data: Data(verifier.utf8))
        return Data(digest)
            .base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    // MARK: Präsentation

    nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        MainActor.assumeIsolated {
            UIApplication.shared.connectedScenes
                .compactMap { ($0 as? UIWindowScene)?.keyWindow }
                .first ?? ASPresentationAnchor()
        }
    }
}
#endif
