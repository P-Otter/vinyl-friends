import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var engine: GameEngine
    @EnvironmentObject private var music: MusicSession
    @EnvironmentObject private var themeStore: ThemeStore
    @EnvironmentObject private var modeStore: AppModeStore

    @State private var goToSetup = false
    @State private var spotifyBusy = false
    @State private var spotifyError: String?

    private var t: AppTheme { themeStore.theme }

    var body: some View {
        NavigationStack {
            ZStack {
                ThemedBackground()

                VStack(spacing: 16) {
                    HStack {
                        Spacer()
                        Button {
                            withAnimation { modeStore.reset() }
                        } label: {
                            Label((modeStore.mode ?? .local).title, systemImage: "arrow.triangle.2.circlepath")
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(t.textMuted)
                                .padding(.horizontal, 10).padding(.vertical, 6)
                                .background(Capsule().fill(t.surface).overlay(Capsule().stroke(t.surfaceStroke.opacity(0.5), lineWidth: 1)))
                        }
                        .buttonStyle(.plain)
                    }
                    Spacer()

                    Image(systemName: "crown.fill")
                        .font(.system(size: 22, weight: .black))
                        .foregroundStyle(t.highlight)

                    if t.vinylStyle == .comic {
                        ComicHeroIllustration(t: t)
                            .frame(height: 220)
                    } else {
                        VinylView(spinning: true, size: 160)
                            .padding(.bottom, 6)
                    }

                    Text(t.uppercaseTitles ? "VINYL FRIENDS" : "Vinyl Friends")
                        .font(.system(size: t.uppercaseTitles ? 32 : 40, weight: t.titleWeight, design: t.fontDesign))
                        .tracking(t.uppercaseTitles ? 1.5 : 0)
                        .foregroundStyle(t.gradient.isEmpty ? AnyShapeStyle(t.text) : t.ctaStyle)

                    Text("Hör den Song. Schätze das Jahr.\nBau deine Zeitleiste!")
                        .font(.callout.weight(.semibold))
                        .multilineTextAlignment(.center)
                        .foregroundStyle(t.textMuted)

                    Spacer()

                    themePicker

                    NavigationLink {
                        PoolBuilderView()
                    } label: {
                        Label("Eigenen Pool bauen", systemImage: "music.note.list")
                            .font(.title3.weight(.black))
                            .foregroundStyle(t.onAccent)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Capsule().fill(t.ctaStyle).themedShadow(t))
                    }
                    .buttonStyle(.plain)

                    HStack(spacing: 10) {
                        if modeStore.spotifyEnabled {
                            Button {
                                startSpotify()
                            } label: {
                                Group {
                                    if spotifyBusy {
                                        ProgressView().tint(t.text)
                                    } else {
                                        Label("Spotify", systemImage: "music.note")
                                            .font(.subheadline.weight(.bold))
                                    }
                                }
                                .foregroundStyle(t.text)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Capsule().fill(t.surface).overlay(Capsule().stroke(t.surfaceStroke, lineWidth: max(t.strokeWidth, 1))))
                            }
                            .buttonStyle(.plain)
                            .disabled(spotifyBusy)
                        }

                        Button {
                            music.provider = DemoProvider()
                            goToSetup = true
                        } label: {
                            Label("Demo", systemImage: "sparkles")
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(t.text)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Capsule().fill(t.surface).overlay(Capsule().stroke(t.surfaceStroke, lineWidth: max(t.strokeWidth, 1))))
                        }
                        .buttonStyle(.plain)
                    }

                    if let spotifyError {
                        Text(spotifyError)
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(t.bad)
                            .multilineTextAlignment(.center)
                    }
                }
                .padding(24)
            }
            .navigationDestination(isPresented: $goToSetup) { PlayerSetupView() }
        }
    }

    private func startSpotify() {
        spotifyError = nil
        spotifyBusy = true
        Task {
            defer { spotifyBusy = false }
            let provider = (music.provider as? SpotifyProvider) ?? SpotifyProvider()
            do {
                if !provider.isAuthorized {
                    try await provider.authorize()
                }
                music.provider = provider
                goToSetup = true
            } catch {
                spotifyError = error.localizedDescription
            }
        }
    }

    /// Style-Wähler — die Auswahl wird dauerhaft gespeichert.
    private var themePicker: some View {
        VStack(spacing: 8) {
            Text("STIL")
                .font(.caption2.weight(.black))
                .tracking(2)
                .foregroundStyle(t.textMuted)
            HStack(spacing: 14) {
                ForEach(AppTheme.all) { theme in
                    Button {
                        withAnimation(.spring(duration: 0.35)) {
                            themeStore.theme = theme
                        }
                    } label: {
                        VStack(spacing: 5) {
                            ZStack {
                                Circle().fill(theme.background)
                                Circle().fill(theme.ctaStyle).frame(width: 15, height: 15)
                            }
                            .frame(width: 36, height: 36)
                            .overlay(
                                Circle().stroke(
                                    theme == t ? t.highlight : t.text.opacity(0.3),
                                    lineWidth: theme == t ? 3 : 1.5
                                )
                            )
                            Text(theme.name)
                                .font(.system(size: 9, weight: .bold))
                                .foregroundStyle(theme == t ? t.text : t.textMuted)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.bottom, 10)
    }
}
