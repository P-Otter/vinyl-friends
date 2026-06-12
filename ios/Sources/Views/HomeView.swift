import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var engine: GameEngine
    @EnvironmentObject private var music: MusicSession
    @EnvironmentObject private var themeStore: ThemeStore

    private var t: AppTheme { themeStore.theme }

    var body: some View {
        NavigationStack {
            ZStack {
                ThemedBackground()

                VStack(spacing: 16) {
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

                    Text(t.uppercaseTitles ? "HITSTER FRIENDS" : "Hitster Friends")
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
                        PlayerSetupView()
                    } label: {
                        Label("Los geht's!", systemImage: "play.fill")
                            .font(.title3.weight(.black))
                            .foregroundStyle(t.onAccent)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                Capsule()
                                    .fill(t.ctaStyle)
                                    .themedShadow(t)
                            )
                    }
                    .buttonStyle(.plain)

                    Label("Demo-Modus mit 30s-Hörproben — ohne Account", systemImage: "sparkles")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(t.textMuted.opacity(0.8))
                        .padding(.bottom, 6)
                }
                .padding(24)
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
