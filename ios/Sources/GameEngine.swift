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
    @Published private(set) var winnerId: UUID?
    @Published private(set) var finishReason: FinishReason?
    @Published private(set) var stealerIdx: Int?
    private var startedAt: Date?

    /// Spieler, der gerade klauen darf (oder nil).
    var stealPlayer: Player? {
        stealerIdx.flatMap { players.indices.contains($0) ? players[$0] : nil }
    }

    enum FinishReason { case won, exhausted }

    var currentTrack: Track? {
        queue.indices.contains(currentTrackIndex) ? queue[currentTrackIndex] : nil
    }

    var currentPlayer: Player? {
        players.indices.contains(currentPlayerIdx) ? players[currentPlayerIdx] : nil
    }

    /// Der tatsächliche Gewinner — der Spieler, der die Bedingung erfüllt hat.
    /// Bei Spielende durch leere Queue (niemand hat gewonnen) ist das nil.
    var winner: Player? {
        guard phase == .finished, let winnerId else { return nil }
        return players.first { $0.id == winnerId }
    }

    func startGame(queue: [Track]) {
        self.queue = queue
        currentTrackIndex = 0
        currentPlayerIdx = 0
        round = 1
        lastResult = nil
        winnerId = nil
        finishReason = nil
        stealerIdx = nil
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
        if correct { player.hits += 1 }
        players[currentPlayerIdx] = player
        lastResult = PlacementResult(track: track, playerId: player.id, insertIndex: insertIndex, correct: correct)
        // Karte NICHT sofort einsortieren — sonst verriete sie Jahr/Titel in der
        // Timeline, bevor man geraten hat. Erst nach Bonus bzw. Auflösung.
        if correct && settings.bonusEnabled {
            phase = .bonus
        } else if correct {
            insertPlacedCard()
            phase = .reveal
        } else if settings.stealEnabled && players.count > 1 {
            // Falsch platziert → nächster Spieler darf klauen.
            stealerIdx = (currentPlayerIdx + 1) % players.count
            phase = .steal
        } else {
            phase = .reveal
        }
    }

    /// Klau-Versuch des nächsten Spielers auf SEINER Timeline.
    func stealPlace(insertIndex: Int) {
        guard let sIdx = stealerIdx, players.indices.contains(sIdx),
              let track = currentTrack else { return }
        var stealer = players[sIdx]
        let sorted = Scoring.sortByYear(stealer.cards)
        let correct = Scoring.isPlacementCorrect(sorted: sorted, track: track, insertIndex: insertIndex)
        stealer.attempts += 1
        if correct {
            stealer.hits += 1
            stealer.cards = Scoring.insertCard(sorted: sorted, track: track)
        }
        players[sIdx] = stealer
        lastResult = PlacementResult(track: track, playerId: stealer.id, insertIndex: insertIndex, correct: correct, isSteal: true)
        phase = .reveal
    }

    /// Niemand klaut — Karte verfällt.
    func skipSteal() {
        phase = .reveal
    }

    /// Die zuletzt korrekt platzierte Karte jetzt sichtbar in die Timeline aufnehmen.
    private func insertPlacedCard() {
        guard let result = lastResult, result.correct,
              let idx = players.firstIndex(where: { $0.id == result.playerId }) else { return }
        let sorted = Scoring.sortByYear(players[idx].cards)
        players[idx].cards = Scoring.insertCard(sorted: sorted, track: result.track)
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
        insertPlacedCard()
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
        insertPlacedCard()
        phase = .reveal
    }

    func nextPlayer() {
        stealerIdx = nil
        // Wer (falls jemand) die Siegbedingung erfüllt — diesen Spieler krönen wir.
        var satisfier: Player?
        switch settings.winCondition {
        case .cards(let n):
            // Sieg = genug Karten UND (bei Bonus) genug gemeisterte Karten.
            let needMastered = settings.bonusEnabled ? settings.requiredMastered : 0
            satisfier = players.first { $0.cards.count >= n && $0.masteredCount >= needMastered }
        case .time(let minutes):
            let timeUp = startedAt.map { Date().timeIntervalSince($0) >= Double(minutes) * 60 } ?? false
            if timeUp {
                // Zeit-Modus: Spieler mit den meisten Karten gewinnt.
                satisfier = Scoring.ranking(players).first.flatMap { s in players.first { $0.id == s.playerId } }
            }
        }

        if let satisfier {
            winnerId = satisfier.id
            finishReason = .won
            phase = .finished
            lastResult = nil
            return
        }

        let nextIndex = currentTrackIndex + 1
        if nextIndex >= queue.count {
            finishByExhaustion()
            return
        }
        currentTrackIndex = nextIndex
        currentPlayerIdx = (currentPlayerIdx + 1) % max(1, players.count)
        round += 1
        lastResult = nil
        phase = .playing
    }

    /// Queue leer: Wer das Kartenziel erreicht hat, wird gekrönt (auch wenn die
    /// Meister-Quote knapp verfehlt wurde — sonst wäre der Sieg bei Bonus+Klauen
    /// faktisch unerreichbar). Hat niemand das Ziel erreicht, endet es unentschieden.
    private func finishByExhaustion() {
        let needN: Int
        if case .cards(let n) = settings.winCondition { needN = n } else { needN = .max }
        let champ = Scoring.ranking(players).first { $0.cards >= needN }
        winnerId = champ.flatMap { stats in players.first { $0.id == stats.playerId } }?.id
        finishReason = winnerId != nil ? .won : .exhausted
        phase = .finished
        lastResult = nil
    }

    func skipTrack() {
        let nextIndex = currentTrackIndex + 1
        if nextIndex >= queue.count {
            finishByExhaustion()
            return
        }
        // Gleicher Spieler, neuer Song — Phase/Reste sicher zurücksetzen.
        currentTrackIndex = nextIndex
        lastResult = nil
        stealerIdx = nil
        phase = .playing
    }

    func resetGame() {
        phase = .setup
        queue = []
        currentTrackIndex = 0
        currentPlayerIdx = 0
        round = 0
        lastResult = nil
        winnerId = nil
        finishReason = nil
        stealerIdx = nil
        startedAt = nil
        for i in players.indices {
            players[i].cards = []
            players[i].attempts = 0
            players[i].hits = 0
            players[i].masteredCount = 0
        }
    }
}
