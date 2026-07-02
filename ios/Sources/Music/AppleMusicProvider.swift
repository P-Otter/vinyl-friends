// Apple-Music-Provider (MusicKit) für die öffentliche App-Store-Version.
// Stufen pro Song:
//   1) Abonnent + autorisiert  → ganzer Song (ApplicationMusicPlayer)
//   2) autorisiert, kein Abo   → Apple-Music-Katalog-Vorschau (30s)
//   3) sonst / kein Treffer    → 30s-Vorschau über die iTunes-Search-API
// Stufe 3 ist Apples eigene, öffentliche Schnittstelle (kein Spotify, kein
// Account, kein Abo) und damit App-Store-konform — sie garantiert, dass JEDER
// Song für JEDEN Nutzer (auch der Reviewer ohne Apple-Music) hörbar ist.
//
// HINWEIS: Voll-Playback (Stufe 1) braucht das Apple Developer Program (MusicKit
// als App-Service auf der App-ID) + echtes Gerät + Apple-Music-Abo.
import MusicKit
import AVFoundation
import Foundation

@MainActor
final class AppleMusicProvider: MusicProvider {
    let displayName = "Apple Music"
    private(set) var pool: [Track]

    private let appMusic = ApplicationMusicPlayer.shared
    private let avPlayer = AVPlayer()
    private let itunesFallback = PreviewPlayer()

    private enum Active { case none, full, preview, itunes }
    private var active: Active = .none
    private var canPlayFull = false
    private var audioSessionConfigured = false

    init(pool: [Track] = []) { self.pool = pool }
    func setPool(_ tracks: [Track]) { pool = tracks }

    func loadTracks(settings: GameSettings) async throws -> [Track] {
        pool.filter { $0.releaseYear > 0 }.shuffled()
    }

    /// Berechtigung anfragen (nur wenn noch unentschieden) und Abo-Status prüfen,
    /// solange Vollwiedergabe noch nicht bestätigt ist. Kein hartes Cachen — ein
    /// später erteiltes Abo/Recht wird beim nächsten Versuch berücksichtigt.
    private func ensureAuth() async {
        if MusicAuthorization.currentStatus == .notDetermined {
            _ = await MusicAuthorization.request()
        }
        if !canPlayFull, MusicAuthorization.currentStatus == .authorized,
           let sub = try? await MusicSubscription.current {
            canPlayFull = sub.canPlayCatalogContent
        }
    }

    func play(_ track: Track) async throws {
        resetActiveSources()
        await ensureAuth()

        if MusicAuthorization.currentStatus == .authorized {
            var req = MusicCatalogSearchRequest(term: "\(track.artist) \(track.name)", types: [Song.self])
            req.limit = 1
            if let song = try? await req.response().songs.first {
                if canPlayFull {
                    do {
                        appMusic.queue = ApplicationMusicPlayer.Queue(for: [song])
                        try await appMusic.prepareToPlay()
                        try await appMusic.play()
                        active = .full
                        return
                    } catch {
                        // Voll-Playback fehlgeschlagen (Song im Storefront nicht
                        // abspielbar / Netz) → NICHT stumm bleiben, sondern unten
                        // auf Apple-Vorschau bzw. iTunes durchfallen.
                    }
                }
                if let url = song.previewAssets?.first?.url {
                    playPreview(url)
                    active = .preview
                    return
                }
            }
        }

        // Stufe 3: abofreie 30s-Vorschau über die iTunes-Search-API. Greift, wenn
        // keine Apple-Music-Berechtigung/kein Abo vorliegt ODER der Katalog keinen
        // Treffer hat — so bleibt nie eine tonlose, nicht-ratbare Runde übrig.
        try await itunesFallback.play(artist: track.artist, title: track.name, cacheKey: track.id)
        active = .itunes
    }

    /// Vorher laufende Quelle stoppen, bevor eine neue startet — macht play()
    /// unabhängig von der stop()-Disziplin des Aufrufers (keine Doppelwiedergabe).
    private func resetActiveSources() {
        switch active {
        case .full: appMusic.stop()
        case .preview: avPlayer.replaceCurrentItem(with: nil)
        case .itunes: itunesFallback.stop()
        case .none: break
        }
        active = .none
    }

    private func playPreview(_ url: URL) {
        configureAudioSession()
        avPlayer.replaceCurrentItem(with: AVPlayerItem(url: url))
        avPlayer.play()
    }

    private func configureAudioSession() {
        guard !audioSessionConfigured else { return }
        try? AVAudioSession.sharedInstance().setCategory(.playback)
        try? AVAudioSession.sharedInstance().setActive(true)
        audioSessionConfigured = true
    }

    func pause() {
        switch active {
        case .full: appMusic.pause()
        case .preview: avPlayer.pause()
        case .itunes: itunesFallback.pause()
        case .none: break
        }
    }

    func resume() {
        switch active {
        case .full: Task { try? await appMusic.play() }
        case .preview: avPlayer.play()
        case .itunes: itunesFallback.resume()
        case .none: break
        }
    }

    func stop() {
        appMusic.stop()
        avPlayer.replaceCurrentItem(with: nil)
        itunesFallback.stop()
        // Audio-Session freigeben, damit andere Apps wieder Ton bekommen.
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        audioSessionConfigured = false
        active = .none
    }
}
