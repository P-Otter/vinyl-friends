import SwiftUI

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
        .navigationBarBackButtonHidden(true)
        .overlay(alignment: .topLeading) {
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
                Button(action: togglePlay) {
                    Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 22, weight: .black))
                        .foregroundStyle(t.onAccent)
                        .frame(width: 60, height: 60)
                        .background(
                            Circle()
                                .fill(t.ctaStyle)
                                .themedShadow(t)
                        )
                }
                .buttonStyle(.plain)

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

            if let playbackError {
                Text(playbackError)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(t.bad)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 18)
        .themedCard(cornerRadius: 26)
    }

    // MARK: Timeline

    private var timelineSection: some View {
        VStack(spacing: 10) {
            Text(sortedCards.isEmpty
                 ? "Zieh die Karte auf das Feld — die erste ist geschenkt!"
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
            .frame(width: isTargeted ? 88 : 46, height: 112)
            .overlay(
                Image(systemName: "arrow.down")
                    .font(.headline.bold())
                    .foregroundStyle(isTargeted ? t.highlight : t.text.opacity(0.4))
            )
            .dropDestination(for: String.self) { _, _ in
                place(at: index)
                return true
            } isTargeted: { over in
                withAnimation(.spring(duration: 0.3)) {
                    if over {
                        targetedGap = index
                    } else if targetedGap == index {
                        targetedGap = nil
                    }
                }
            }
            .onTapGesture { place(at: index) }
            .animation(.spring(duration: 0.3), value: targetedGap)
    }

    private func yearCard(_ card: Track) -> some View {
        VStack(spacing: 6) {
            Text(String(card.releaseYear))
                .font(.system(size: 24, weight: t.titleWeight == .light ? .regular : t.titleWeight, design: t.fontDesign))
                .foregroundStyle(t.text)
            Rectangle()
                .fill(playerColor)
                .frame(width: 34, height: 3)
            Text(card.name)
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(t.textMuted)
                .lineLimit(2)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 6)
        .frame(width: 92, height: 112)
        .themedCard(cornerRadius: 14, shadow: playerColor)
    }

    // MARK: Mystery-Karte

    private var mysteryCard: some View {
        VStack(spacing: 2) {
            Image(systemName: "crown.fill")
                .font(.system(size: 13, weight: .black))
                .foregroundStyle(t.highlight)
            Text("?")
                .font(.system(size: 40, weight: t.titleWeight == .light ? .regular : t.titleWeight, design: t.fontDesign))
                .foregroundStyle(t.onAccent)
            Text("Dieser Song")
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(t.onAccent.opacity(0.85))
        }
        .frame(width: 96, height: 116)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(t.ctaStyle)
                .themedShadow(t, color: t.shadow == .hard ? t.bad : nil)
        )
        .draggable("mystery-track")
        .padding(.bottom, 4)
    }

    // MARK: Aktionen

    private func place(at index: Int) {
        targetedGap = nil
        withAnimation(.spring(duration: 0.4)) {
            engine.placeCard(insertIndex: index)
        }
    }

    private func togglePlay() {
        guard let provider = music.provider, let track = engine.currentTrack else { return }
        playbackError = nil
        if isPlaying {
            provider.pause()
            isPlaying = false
        } else if loadedTrackId == track.id {
            provider.resume()
            isPlaying = true
        } else {
            Task {
                do {
                    try await provider.play(track)
                    loadedTrackId = track.id
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
    }
}
