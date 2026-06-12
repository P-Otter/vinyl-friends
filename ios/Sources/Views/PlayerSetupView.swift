import SwiftUI

struct PlayerSetupView: View {
    @EnvironmentObject private var engine: GameEngine
    @EnvironmentObject private var music: MusicSession
    @EnvironmentObject private var themeStore: ThemeStore

    @State private var names: [String] = ["", ""]
    @State private var targetCards = 5
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var gameStarted = false

    private var t: AppTheme { themeStore.theme }

    private var validNames: [String] {
        names
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
    }

    var body: some View {
        ZStack {
            ThemedBackground()

            ScrollView {
                VStack(spacing: 20) {
                    playersCard
                    goalCard
                    startButton
                    if let errorMessage {
                        Text(errorMessage)
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(t.bad)
                    }
                }
                .padding(20)
            }
        }
        .navigationTitle("Neues Spiel")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
        .navigationDestination(isPresented: $gameStarted) { GameView() }
        .onAppear {
            if music.provider == nil { music.provider = DemoProvider() }
        }
    }

    private var playersCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("SPIELER (2–8)")
                .font(.caption.weight(.black))
                .tracking(2)
                .foregroundStyle(t.textMuted)

            ForEach(names.indices, id: \.self) { i in
                HStack(spacing: 10) {
                    Circle()
                        .fill(Color(hex: t.playerColors[i % t.playerColors.count]))
                        .frame(width: 14, height: 14)
                        .overlay(Circle().stroke(t.surfaceStroke, lineWidth: min(t.strokeWidth, 1.5)))
                    TextField("Spieler \(i + 1)", text: $names[i])
                        .foregroundStyle(t.text)
                        .font(.body.weight(.semibold))
                    if names.count > 2 {
                        Button {
                            names.remove(at: i)
                        } label: {
                            Image(systemName: "minus.circle.fill")
                                .foregroundStyle(t.textMuted)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 11)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(t.background.opacity(0.6))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(t.surfaceStroke.opacity(0.7), lineWidth: max(t.strokeWidth * 0.6, 1))
                        )
                )
            }

            if names.count < 8 {
                Button {
                    withAnimation(.spring(duration: 0.3)) { names.append("") }
                } label: {
                    Label("Spieler hinzufügen", systemImage: "plus.circle.fill")
                        .font(.subheadline.weight(.black))
                        .foregroundStyle(t.accent == t.text ? t.text : t.accent)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(18)
        .themedCard()
    }

    private var goalCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("SPIELZIEL")
                .font(.caption.weight(.black))
                .tracking(2)
                .foregroundStyle(t.textMuted)
            HStack {
                Text("\(targetCards) Karten zum Sieg")
                    .font(.body.weight(.bold))
                    .foregroundStyle(t.text)
                Spacer()
                Stepper("", value: $targetCards, in: 3...15)
                    .labelsHidden()
            }
        }
        .padding(18)
        .themedCard()
    }

    private var startButton: some View {
        Button {
            Task { await start() }
        } label: {
            Group {
                if isLoading {
                    ProgressView().tint(t.onAccent)
                } else {
                    Label("Spiel starten", systemImage: "play.fill")
                        .font(.title3.weight(.black))
                }
            }
            .foregroundStyle(t.onAccent)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                Capsule()
                    .fill(t.ctaStyle)
                    .opacity(validNames.count < 2 ? 0.4 : 1)
                    .themedShadow(t)
            )
        }
        .buttonStyle(.plain)
        .disabled(validNames.count < 2 || isLoading)
    }

    private func start() async {
        guard let provider = music.provider else { return }
        isLoading = true
        defer { isLoading = false }

        engine.players = validNames.enumerated().map { i, name in
            Player(name: name, colorHex: t.playerColors[i % t.playerColors.count])
        }
        engine.settings.winCondition = .cards(targetCards)

        do {
            let queue = try await provider.loadTracks(settings: engine.settings)
            engine.startGame(queue: queue)
            gameStarted = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
