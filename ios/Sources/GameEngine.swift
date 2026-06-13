// Zentraler Game-State — portiert aus src/hooks/useGameState.ts (Zustand-Store).
import Foundation
import Combine

@MainActor
final class GameEngine: ObservableObject {
    @Published private(set) var phase: GamePhase = .setup
    @Published var settings = GameSettings()
    @Published private(set) var queue: [Track] = []
    @Published private(set) var currentTrackIndex = 0
    @Published var players: [Player] = []
    @Published private(set) var currentPlayerIdx = 0
    @Published private(set) var round = 0
    @Published private(set) var lastResult: PlacementResult?
    private var startedAt: Date?

    var currentTrack: Track? {
        queue.indices.contains(currentTrackIndex) ? queue[currentTrackIndex] : nil
    }

    var currentPlayer: Player? {
        players.indices.contains(currentPlayerIdx) ? players[currentPlayerIdx] : nil
    }

    var winner: Player? {
        guard phase == .finished else { return nil }
        return Scoring.ranking(players).first.flatMap { stats in
            players.first { $0.id == stats.playerId }
        }
    }

    func startGame(queue: [Track]) {
        self.queue = queue
        currentTrackIndex = 0
        currentPlayerIdx = 0
        round = 1
        lastResult = nil
        startedAt = Date()
        for i in players.indices {
            players[i].cards = []
            players[i].attempts = 0
            players[i].hits = 0
            players[i].masteredCount = 0
        }
        phase = .playing
    }

    func placeCard(insertIndex: Int) {
        guard let track = currentTrack, players.indices.contains(currentPlayerIdx) else { return }
        var player = players[currentPlayerIdx]
        let sorted = Scoring.sortByYear(player.cards)
        let correct = Scoring.isPlacementCorrect(sorted: sorted, track: track, insertIndex: insertIndex)
        player.attempts += 1
        if correct {
            player.hits += 1
            player.cards = Scoring.insertCard(sorted: sorted, track: track)
        }
        players[currentPlayerIdx] = player
        lastResult = PlacementResult(track: track, playerId: player.id, insertIndex: insertIndex, correct: correct)
        // Bei korrektem Platzieren erst blind raten (Bonus), sonst direkt auflösen.
        phase = (correct && settings.bonusEnabled) ? .bonus : .reveal
    }

    /// Bonus-Rateergebnis auswerten (Titel/Artist toleranter Vergleich, Jahr ±Toleranz).
    func submitBonus(title: String, artist: String, year: Int) {
        guard var result = lastResult, let track = currentTrack else { return }
        let titleOK = FuzzyMatch.matches(title, track.name)
        let artistOK = FuzzyMatch.matchesArtist(artist, track.artist)
        let yearOK = abs(year - track.releaseYear) <= settings.yearTolerance
        let count = (titleOK ? 1 : 0) + (artistOK ? 1 : 0) + (yearOK ? 1 : 0)
        let mastered = count >= settings.masteryThreshold
        result.bonus = BonusResult(
            titleCorrect: titleOK, artistCorrect: artistOK, yearCorrect: yearOK,
            titleGuess: title, artistGuess: artist, yearGuess: year, mastered: mastered
        )
        lastResult = result
        if mastered, let idx = players.firstIndex(where: { $0.id == result.playerId }) {
            players[idx].masteredCount += 1
        }
        phase = .reveal
    }

    /// Bonus übersprungen — Karte zählt nicht als gemeistert.
    func skipBonus() {
        if var result = lastResult {
            result.bonus = BonusResult(
                titleCorrect: false, artistCorrect: false, yearCorrect: false,
                titleGuess: "", artistGuess: "", yearGuess: 0, mastered: false
            )
            lastResult = result
        }
        phase = .reveal
    }

    func nextPlayer() {
        let won: Bool
        switch settings.winCondition {
        case .cards(let n):
            // Sieg = genug Karten UND (bei Bonus) genug gemeisterte Karten.
            let needMastered = settings.bonusEnabled ? settings.requiredMastered : 0
            won = players.contains { $0.cards.count >= n && $0.masteredCount >= needMastered }
        case .time(let minutes):
            won = startedAt.map { Date().timeIntervalSince($0) >= Double(minutes) * 60 } ?? false
        }
        let nextIndex = currentTrackIndex + 1
        if won || nextIndex >= queue.count {
            phase = .finished
            lastResult = nil
            return
        }
        currentTrackIndex = nextIndex
        currentPlayerIdx = (currentPlayerIdx + 1) % max(1, players.count)
        round += 1
        lastResult = nil
        phase = .playing
    }

    func skipTrack() {
        let nextIndex = currentTrackIndex + 1
        if nextIndex >= queue.count {
            phase = .finished
            lastResult = nil
            return
        }
        currentTrackIndex = nextIndex
        lastResult = nil
    }

    func resetGame() {
        phase = .setup
        queue = []
        currentTrackIndex = 0
        currentPlayerIdx = 0
        round = 0
        lastResult = nil
        startedAt = nil
        for i in players.indices {
            players[i].cards = []
            players[i].attempts = 0
            players[i].hits = 0
            players[i].masteredCount = 0
        }
    }
}
