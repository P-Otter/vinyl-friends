import SwiftUI
import UIKit

/// Sammelt die Bildschirm-Rahmen der Timeline-Lücken, damit der Drag erkennt,
/// über welcher Lücke der Finger gerade ist.
private struct GapFramePreference: PreferenceKey {
    static let defaultValue: [Int: CGRect] = [:]
    static func reduce(value: inout [Int: CGRect], nextValue: () -> [Int: CGRect]) {
        value.merge(nextValue()) { _, new in new }
    }
}

/// Heimatrahmen der Mystery-Karte, damit sie beim Loslassen in die Lücke fliegen kann.
private struct MysteryFramePreference: PreferenceKey {
    static let defaultValue: CGRect = .zero
    static func reduce(value: inout CGRect, nextValue: () -> CGRect) { value = nextValue() }
}

struct GameView: View {
    @EnvironmentObject private var engine: GameEngine
    @EnvironmentObject private var music: MusicSession
    @EnvironmentObject private var themeStore: ThemeStore
    @Environment(\.dismiss) private var dismiss

    @State private var showQuitConfirm = false
    @State private var targetedGap: Int?
    @State private var isPlaying = false
    @State private var loadedTrackId: String?
    @State private var playbackError: String?

    // Countdown
    @State private var remaining = 0
    private let ticker = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    // Drag der Mystery-Karte
    @State private var dragOffset: CGSize = .zero
    @State private var isDragging = false
    @State private var isLanding = false
    @State private var gapFrames: [Int: CGRect] = [:]
    @State private var mysteryHome: CGRect = .zero

    private let boardSpace = "board"

    private var t: AppTheme { themeStore.theme }

    private var sortedCards: [Track] {
        Scoring.sortByYear(engine.currentPlayer?.cards ?? [])
    }

    private var playerColor: Color {
        Color(hex: engine.currentPlayer?.colorHex ?? "#888888")
    }

    var body: some View {
        ZStack {
            ThemedBackground()

            if engine.phase == .finished {
                EndView()
            } else {
                gameBody
            }

            if engine.phase == .bonus {
                BonusGuessView()
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
            }

            if engine.phase == .reveal, let result = engine.lastResult {
                RevealOverlay(result: result) {
                    stopPlayback()
                    withAnimation(.spring(duration: 0.4)) {
                        engine.nextPlayer()
                    }
                }
                .transition(.opacity.combined(with: .scale(scale: 0.92)))
            }
        }
        .coordinateSpace(name: boardSpace)
        .onPreferenceChange(GapFramePreference.self) { gapFrames = $0 }
        .onPreferenceChange(MysteryFramePreference.self) { mysteryHome = $0 }
        .onReceive(ticker) { _ in tick() }
        .navigationBarBackButtonHidden(true)
        .overlay(alignment: .topLeading) { quitButton }
        .confirmationDialog("Spiel beenden?", isPresented: $showQuitConfirm, titleVisibility: .visible) {
            Button("Spiel beenden", role: .destructive) {
                stopPlayback()
                engine.resetGame()
                dismiss()
            }
            Button("Weiterspielen", role: .cancel) {}
        } message: {
            Text("Der Spielstand geht verloren.")
        }
        .onDisappear { stopPlayback() }
    }

    @ViewBuilder
    private var quitButton: some View {
        if engine.phase != .finished {
            Button {
                showQuitConfirm = true
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .black))
                    .foregroundStyle(t.text)
                    .frame(width: 34, height: 34)
                    .background(
                        Circle()
                            .fill(t.surface)
                            .overlay(Circle().stroke(t.surfaceStroke, lineWidth: max(t.strokeWidth * 0.6, 1)))
                    )
            }
            .buttonStyle(.plain)
            .padding(.leading, 18)
        }
    }

    private var gameBody: some View {
        VStack(spacing: 18) {
            header
            scoreRow
            heroCard
            Spacer(minLength: 0)
            timelineSection
            mysteryCard
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 10)
    }

    // MARK: Kopfbereich

    private var header: some View {
        VStack(spacing: 4) {
            Text("RUNDE \(engine.round)")
                .font(.caption2.weight(.bold))
                .tracking(2)
                .foregroundStyle(t.textMuted)
            if let player = engine.currentPlayer {
                Text(t.uppercaseTitles ? player.name.uppercased() : player.name)
                    .font(.system(size: 32, weight: t.titleWeight, design: t.fontDesign))
                    .tracking(t.uppercaseTitles ? 1.5 : 0)
                    .foregroundStyle(playerColor)
            }
        }
    }

    private var scoreRow: some View {
        HStack(spacing: 8) {
            ForEach(engine.players) { player in
                let isActive = player.id == engine.currentPlayer?.id
                let color = Color(hex: player.colorHex)
                HStack(spacing: 6) {
                    Text(player.name)
                        .font(.caption2.weight(.bold))
                        .lineLimit(1)
                    Text(String(player.cards.count))
                        .font(.caption.weight(.black).monospacedDigit())
                    if engine.settings.bonusEnabled {
                        Text("★\(player.masteredCount)")
                            .font(.system(size: 9, weight: .black).monospacedDigit())
                            .foregroundStyle(isActive ? t.onAccent.opacity(0.8) : t.highlight)
                    }
                }
                .foregroundStyle(isActive ? t.onAccent : t.text)
                .padding(.horizontal, 11)
                .padding(.vertical, 6)
                .background(
                    Capsule()
                        .fill(isActive ? AnyShapeStyle(color) : AnyShapeStyle(t.surface))
                        .overlay(
                            Capsule().stroke(
                                t.strokeWidth > 0 ? t.surfaceStroke : color.opacity(0.6),
                                lineWidth: max(t.strokeWidth, 1)
                            )
                        )
                )
            }
        }
    }

    // MARK: Song-Panel

    private var heroCard: some View {
        VStack(spacing: 14) {
            VinylView(spinning: isPlaying, size: 112)
            WaveformView(playing: isPlaying)

            HStack(spacing: 28) {
                playButton
                    .opacity(AppConfig.iTunesPreviewEnabled ? 1 : 0.35)
                Button {
                    stopPlayback()
                    engine.skipTrack()
                } label: {
                    Image(systemName: "forward.fill")
                        .font(.system(size: 16, weight: .black))
                        .foregroundStyle(t.text)
                        .frame(width: 46, height: 46)
                        .background(
                            Circle()
                                .fill(t.surface)
                                .overlay(Circle().stroke(t.surfaceStroke, lineWidth: max(t.strokeWidth, 1)))
                        )
                }
                .buttonStyle(.plain)
            }

            if !AppConfig.iTunesPreviewEnabled {
                Label("Vorschau aus (Killswitch)", systemImage: "speaker.slash.fill")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(t.textMuted)
            } else if let playbackError {
                Text(playbackError)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(t.bad)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 18)
        .themedCard(cornerRadius: 26)
    }

    /// Play/Pause mit umlaufendem Countdown-Ring + Sekundenanzeige.
    private var playButton: some View {
        let total = max(1, engine.settings.snippetSeconds)
        return Button(action: togglePlay) {
            ZStack {
                Circle()
                    .stroke(t.text.opacity(0.15), lineWidth: 4)
                Circle()
                    .trim(from: 0, to: CGFloat(remaining) / CGFloat(total))
                    .stroke(t.highlight, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.linear(duration: 0.5), value: remaining)
                Circle()
                    .fill(t.ctaStyle)
                    .padding(7)
                    .themedShadow(t)
                if isPlaying && remaining > 0 {
                    Text("\(remaining)")
                        .font(.system(size: 22, weight: .black, design: .rounded).monospacedDigit())
                        .foregroundStyle(t.onAccent)
                } else {
                    Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 22, weight: .black))
                        .foregroundStyle(t.onAccent)
                }
            }
            .frame(width: 72, height: 72)
        }
        .buttonStyle(.plain)
    }

    // MARK: Timeline

    private var timelineSection: some View {
        VStack(spacing: 10) {
            Text(sortedCards.isEmpty
                 ? "Zieh die Karte aufs Feld — die erste ist geschenkt!"
                 : "Wann kam der Song raus? Zieh die Karte an ihren Platz!")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(t.textMuted)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    gapSlot(0)
                    ForEach(Array(sortedCards.enumerated()), id: \.element.id) { idx, card in
                        yearCard(card)
                        gapSlot(idx + 1)
                    }
                }
                .padding(.horizontal, 6)
                .padding(.vertical, 8)
            }
        }
    }

    private func gapSlot(_ index: Int) -> some View {
        let isTargeted = targetedGap == index
        return RoundedRectangle(cornerRadius: 14, style: .continuous)
            .strokeBorder(
                isTargeted ? t.highlight : t.text.opacity(0.4),
                style: StrokeStyle(lineWidth: 2.5, dash: [7, 6])
            )
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(t.highlight.opacity(isTargeted ? 0.3 : 0.0))
            )
            .frame(width: isTargeted ? 96 : 44, height: 112)
            .shadow(color: isTargeted ? t.highlight.opacity(0.6) : .clear, radius: 14)
            .overlay(
                Image(systemName: isTargeted ? "arrow.down.circle.fill" : "arrow.down")
                    .font(.title3.bold())
                    .foregroundStyle(isTargeted ? t.highlight : t.text.opacity(0.4))
                    .scaleEffect(isTargeted ? 1.15 : 1)
            )
            .background(
                GeometryReader { geo in
                    Color.clear.preference(
                        key: GapFramePreference.self,
                        value: [index: geo.frame(in: .named(boardSpace))]
                    )
                }
            )
            .onTapGesture { place(at: index) }
            .animation(.spring(duration: 0.3), value: targetedGap)
    }

    private func yearCard(_ card: Track) -> some View {
        CardFace(
            style: engine.settings.cardLook,
            t: t,
            yearText: String(card.releaseYear),
            name: card.name,
            accent: playerColor
        )
    }

    // MARK: Mystery-Karte (ziehbar)

    private var mysteryCard: some View {
        CardFace(
            style: engine.settings.cardLook,
            t: t,
            yearText: "?",
            name: isDragging ? "loslassen" : "ziehen ↑",
            accent: t.accent,
            isMystery: true,
            size: CGSize(width: 96, height: 116)
        )
        .background(
            GeometryReader { geo in
                Color.clear.preference(
                    key: MysteryFramePreference.self,
                    value: geo.frame(in: .named(boardSpace))
                )
            }
        )
        .scaleEffect(isLanding ? 0.42 : (isDragging ? 1.12 : 1))
        .rotationEffect(.degrees(isDragging ? -4 : 0))
        .opacity(isLanding ? 0 : 1)
        .shadow(color: isDragging ? .black.opacity(0.3) : .clear, radius: 16, y: 8)
        .offset(dragOffset)
        .zIndex(isDragging || isLanding ? 20 : 0)
        .gesture(dragGesture)
        .animation(.spring(duration: 0.3), value: isDragging)
        .padding(.bottom, 4)
    }

    private var dragGesture: some Gesture {
        DragGesture(coordinateSpace: .named(boardSpace))
            .onChanged { value in
                if !isDragging { isDragging = true }
                dragOffset = value.translation
                let hit = gapFrames.first {
                    $0.value.insetBy(dx: -6, dy: -60).contains(value.location)
                }?.key
                if hit != targetedGap {
                    if hit != nil { haptic(.light) }
                    withAnimation(.spring(duration: 0.25)) { targetedGap = hit }
                }
            }
            .onEnded { _ in
                let gap = targetedGap
                isDragging = false
                guard let gap else {
                    // daneben losgelassen → zurückfedern
                    withAnimation(.spring(duration: 0.45, bounce: 0.4)) { dragOffset = .zero }
                    return
                }
                haptic(.medium)
                // Wenn der Lücken-Rahmen bekannt ist, fliegt die Karte hinein —
                // sonst direkt platzieren (Platzieren darf NIE ausfallen).
                if let gf = gapFrames[gap], mysteryHome != .zero {
                    let target = CGSize(
                        width: gf.midX - mysteryHome.midX,
                        height: gf.midY - mysteryHome.midY
                    )
                    withAnimation(.spring(duration: 0.4, bounce: 0.2)) {
                        dragOffset = target
                        isLanding = true
                    }
                    Task { @MainActor in
                        try? await Task.sleep(for: .seconds(0.34))
                        place(at: gap)
                        dragOffset = .zero
                        isLanding = false
                    }
                } else {
                    dragOffset = .zero
                    place(at: gap)
                }
            }
    }

    private func haptic(_ style: UIImpactFeedbackGenerator.FeedbackStyle) {
        UIImpactFeedbackGenerator(style: style).impactOccurred()
    }

    // MARK: Aktionen

    private func place(at index: Int) {
        targetedGap = nil
        stopPlayback() // Song + Timer stoppen, Button zurücksetzen
        withAnimation(.spring(duration: 0.4)) {
            engine.placeCard(insertIndex: index)
        }
    }

    private func tick() {
        guard isPlaying, remaining > 0 else { return }
        remaining -= 1
        if remaining == 0 {
            music.provider?.pause()
            isPlaying = false
        }
    }

    private func togglePlay() {
        guard AppConfig.iTunesPreviewEnabled else { return } // Killswitch
        guard let provider = music.provider, let track = engine.currentTrack else { return }
        playbackError = nil
        if isPlaying {
            provider.pause()
            isPlaying = false
        } else if loadedTrackId == track.id && remaining > 0 {
            provider.resume()
            isPlaying = true
        } else {
            Task {
                do {
                    try await provider.play(track)
                    loadedTrackId = track.id
                    remaining = engine.settings.snippetSeconds
                    isPlaying = true
                } catch {
                    playbackError = error.localizedDescription
                }
            }
        }
    }

    private func stopPlayback() {
        music.provider?.stop()
        isPlaying = false
        loadedTrackId = nil
        remaining = 0
    }
}
