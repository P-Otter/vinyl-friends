import SwiftUI

struct PlayerSetupView: View {
    @EnvironmentObject private var engine: GameEngine
    @EnvironmentObject private var music: MusicSession
    @EnvironmentObject private var themeStore: ThemeStore

    @State private var names: [String] = ["", ""]
    @State private var targetCards = 5
    @State private var snippetSeconds = 20
    @State private var cardLook: TimelineCardStyle = .classic
    @State private var bonusEnabled = true
    @State private var masteryThreshold = 2
    @State private var requiredMastered = 3
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var gameStarted = false

    // Spotify: Playlist-Auswahl
    @State private var playlists: [SpotifyPlaylist] = []
    @State private var playlistsLoading = false
    @State private var selectedPlaylist: SpotifyPlaylist?

    private var t: AppTheme { themeStore.theme }

    private var spotify: SpotifyProvider? { music.provider as? SpotifyProvider }

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
                    if spotify != nil {
                        playlistCard
                    }
                    playersCard
                    winCard
                    audioCard
                    cardLookCard
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
        .task {
            await loadPlaylistsIfNeeded()
        }
    }

    private var playlistCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("SPOTIFY-PLAYLIST")
                .font(.caption.weight(.black))
                .tracking(2)
                .foregroundStyle(t.textMuted)

            if playlistsLoading {
                ProgressView().frame(maxWidth: .infinity)
            } else if playlists.isEmpty {
                Text("Keine Playlists gefunden.")
                    .font(.subheadline)
                    .foregroundStyle(t.textMuted)
            } else {
                Menu {
                    ForEach(playlists) { playlist in
                        Button("\(playlist.name) (\(playlist.trackCount))") {
                            selectedPlaylist = playlist
                        }
                    }
                } label: {
                    HStack {
                        Image(systemName: "music.note.list")
                        Text(selectedPlaylist?.name ?? "Playlist wählen …")
                            .font(.body.weight(.bold))
                            .lineLimit(1)
                        Spacer()
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.caption.weight(.bold))
                    }
                    .foregroundStyle(t.text)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(t.background.opacity(0.6))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .stroke(t.surfaceStroke.opacity(0.7), lineWidth: max(t.strokeWidth * 0.6, 1))
                            )
                    )
                }
            }
        }
        .padding(18)
        .themedCard()
    }

    private func loadPlaylistsIfNeeded() async {
        guard let spotify, playlists.isEmpty else { return }
        playlistsLoading = true
        defer { playlistsLoading = false }
        do {
            playlists = try await spotify.myPlaylists()
        } catch {
            errorMessage = error.localizedDescription
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

    /// Klartext-Satz, der die aktuelle Gewinn-Regel ausspricht.
    private var ruleSentence: Text {
        let cards = Text("\(targetCards) Karten").bold().foregroundStyle(t.highlight)
        if bonusEnabled {
            let m = Text("\(requiredMastered)").bold().foregroundStyle(t.highlight)
            return Text("Sammle ") + cards + Text(" — und errate bei ") + m
                + Text(" davon den Song (Titel, Künstler & Jahr). Wer das zuerst schafft, gewinnt.")
        } else {
            return Text("Sortiere zuerst ") + cards + Text(" richtig in deine Zeitleiste ein und gewinne.")
        }
    }

    private var winCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("SO GEWINNT MAN")
                .font(.caption.weight(.black))
                .tracking(2)
                .foregroundStyle(t.textMuted)

            ruleSentence
                .font(.callout.weight(.semibold))
                .foregroundStyle(t.text)
                .fixedSize(horizontal: false, vertical: true)
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(t.highlight.opacity(0.12))
                )

            stepperRow(title: "Karten zum Gewinnen", value: $targetCards, range: 3...15)

            Divider().overlay(t.surfaceStroke.opacity(0.3))

            Toggle(isOn: $bonusEnabled.animation(.spring(duration: 0.3))) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Songs erraten")
                        .font(.body.weight(.bold))
                        .foregroundStyle(t.text)
                    Text("Nach jedem Treffer Titel, Künstler & Jahr raten")
                        .font(.caption2)
                        .foregroundStyle(t.textMuted)
                }
            }
            .tint(t.highlight)

            if bonusEnabled {
                stepperRow(
                    title: "Davon richtig erraten",
                    subtitle: "So viele Songs musst du knacken",
                    value: $requiredMastered, range: 1...targetCards
                )
                VStack(alignment: .leading, spacing: 6) {
                    Text("Wann zählt ein Song als erraten?")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(t.text)
                    Picker("", selection: $masteryThreshold) {
                        Text("2 von 3 reichen").tag(2)
                        Text("alle 3 nötig").tag(3)
                    }
                    .pickerStyle(.segmented)
                    Text("von Titel · Künstler · Jahr")
                        .font(.caption2)
                        .foregroundStyle(t.textMuted)
                }
            }
        }
        .padding(18)
        .themedCard()
        .onChange(of: targetCards) { _, newValue in
            if requiredMastered > newValue { requiredMastered = newValue }
        }
    }

    private func stepperRow(title: String, subtitle: String? = nil, value: Binding<Int>, range: ClosedRange<Int>, step: Int = 1) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.body.weight(.bold))
                    .foregroundStyle(t.text)
                if let subtitle {
                    Text(subtitle)
                        .font(.caption2)
                        .foregroundStyle(t.textMuted)
                }
            }
            Spacer()
            Text("\(value.wrappedValue)")
                .font(.headline.weight(.black).monospacedDigit())
                .foregroundStyle(t.highlight)
                .frame(minWidth: 24)
            Stepper("", value: value, in: range, step: step)
                .labelsHidden()
        }
    }

    private var audioCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("SPIELDAUER")
                .font(.caption.weight(.black))
                .tracking(2)
                .foregroundStyle(t.textMuted)
            stepperRow(
                title: "Sekunden pro Song",
                subtitle: "So lange läuft der Schnipsel (Vorschau max. 30s)",
                value: $snippetSeconds, range: 5...30, step: 5
            )
        }
        .padding(18)
        .themedCard()
    }

    private var cardLookCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("KARTEN-STIL")
                .font(.caption.weight(.black))
                .tracking(2)
                .foregroundStyle(t.textMuted)
            HStack(spacing: 10) {
                ForEach(TimelineCardStyle.allCases) { style in
                    let selected = cardLook == style
                    Button {
                        withAnimation(.spring(duration: 0.3)) { cardLook = style }
                    } label: {
                        VStack(spacing: 6) {
                            CardFace(
                                style: style, t: t,
                                yearText: "1991", name: "Song",
                                accent: Color(hex: t.playerColors[0]),
                                size: CGSize(width: 58, height: 70)
                            )
                            .scaleEffect(0.92)
                            Text(style.label)
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(selected ? t.text : t.textMuted)
                        }
                        .padding(8)
                        .background(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(selected ? t.highlight : .clear, lineWidth: 2)
                        )
                    }
                    .buttonStyle(.plain)
                    .frame(maxWidth: .infinity)
                }
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
        .disabled(validNames.count < 2 || isLoading || (spotify != nil && selectedPlaylist == nil))
    }

    private func start() async {
        guard let provider = music.provider else { return }
        if let spotify { spotify.selectedPlaylist = selectedPlaylist }
        isLoading = true
        defer { isLoading = false }

        engine.players = validNames.enumerated().map { i, name in
            Player(name: name, colorHex: t.playerColors[i % t.playerColors.count])
        }
        engine.settings.winCondition = .cards(targetCards)
        engine.settings.snippetSeconds = snippetSeconds
        engine.settings.cardLook = cardLook
        engine.settings.bonusEnabled = bonusEnabled
        engine.settings.masteryThreshold = masteryThreshold
        engine.settings.requiredMastered = bonusEnabled ? requiredMastered : 0

        do {
            let queue = try await provider.loadTracks(settings: engine.settings)
            engine.startGame(queue: queue)
            gameStarted = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
