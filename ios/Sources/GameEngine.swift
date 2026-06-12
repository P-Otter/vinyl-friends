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
        phase = .reveal
    }

    func nextPlayer() {
        let won: Bool
        switch settings.winCondition {
        case .cards(let n):
            won = players.contains { $0.cards.count >= n }
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
        }
    }
}
