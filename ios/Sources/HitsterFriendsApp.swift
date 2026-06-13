import SwiftUI

@main
struct HitsterFriendsApp: App {
    @StateObject private var engine = GameEngine()
    @StateObject private var music = MusicSession()
    @StateObject private var themeStore = ThemeStore()

    // Launch-Argument "-demoGame" startet direkt ein vorbereitetes Spiel —
    // für UI-Entwicklung und Screenshots. Theme dazu wählbar via "-themeId <id>"
    // (Standard-UserDefaults-Mechanik), z. B.:
    //   xcrun simctl launch <udid> com.shasha.HitsterFriends -demoGame -themeId neon
    private var isDemoGame: Bool {
        ProcessInfo.processInfo.arguments.contains("-demoGame")
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if isDemoGame {
                    NavigationStack { GameView() }
                } else {
                    HomeView()
                }
            }
            .environmentObject(engine)
            .environmentObject(music)
            .environmentObject(themeStore)
            .tint(themeStore.theme.accent)
            .preferredColorScheme(themeStore.theme.colorScheme)
            .onAppear {
                if isDemoGame { seedDemoGame() }
            }
        }
    }

    private func seedDemoGame() {
        music.provider = DemoProvider()
        let colors = themeStore.theme.playerColors
        engine.players = [
            Player(name: "Shayan", colorHex: colors[0]),
            Player(name: "Lena", colorHex: colors[1]),
            Player(name: "Mia", colorHex: colors[2]),
        ]
        engine.settings.winCondition = .cards(5)
        let args = ProcessInfo.processInfo.arguments
        if let i = args.firstIndex(of: "-cardLook"), i + 1 < args.count,
           let look = TimelineCardStyle(rawValue: args[i + 1]) {
            engine.settings.cardLook = look
        }
        engine.startGame(queue: DemoCatalog.tracks.shuffled())
        // Dem ersten Spieler ein paar Karten geben, damit die Timeline gefüllt aussieht.
        let seedYears = [1975, 1991, 2014]
        engine.players[0].cards = DemoCatalog.tracks.filter { seedYears.contains($0.releaseYear) }

        // Für Screenshots direkt in die Bonus-Phase: aktuellen Track korrekt platzieren.
        if args.contains("-demoBonus") || args.contains("-demoReveal") {
            let sorted = Scoring.sortByYear(engine.players[0].cards)
            if let track = engine.currentTrack {
                for idx in 0...sorted.count
                where Scoring.isPlacementCorrect(sorted: sorted, track: track, insertIndex: idx) {
                    engine.placeCard(insertIndex: idx)
                    break
                }
                if args.contains("-demoReveal") {
                    // Titel + Jahr richtig, Artist falsch → 2/3 → gemeistert.
                    engine.submitBonus(title: track.name, artist: "Irgendwer", year: track.releaseYear)
                }
            }
        }
    }
}
