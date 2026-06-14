import SwiftUI

struct RevealOverlay: View {
    @EnvironmentObject private var themeStore: ThemeStore
    @Environment(\.openURL) private var openURL
    let result: PlacementResult
    let onContinue: () -> Void

    private var t: AppTheme { themeStore.theme }
    private var stampColor: Color { result.correct ? t.good : t.bad }

    /// Öffnet den Song in Spotify — exakte URI (importierte Tracks) oder Suche.
    private var spotifyURL: URL? {
        if result.track.uri.hasPrefix("spotify:") { return URL(string: result.track.uri) }
        let q = "\(result.track.artist) \(result.track.name)"
            .addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? ""
        return URL(string: "https://open.spotify.com/search/\(q)")
    }

    var body: some View {
        ZStack {
            Color.black.opacity(0.45).ignoresSafeArea()

            VStack(spacing: 16) {
                Text(result.correct ? "RICHTIG!" : "DANEBEN!")
                    .font(.system(size: 26, weight: t.titleWeight == .light ? .regular : t.titleWeight, design: t.fontDesign))
                    .tracking(t.uppercaseTitles ? 2 : 0)
                    .foregroundStyle(stampColor)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(stampColor, lineWidth: 3)
                    )
                    .rotationEffect(.degrees(-5))
                    .padding(.top, 4)

                Text(String(result.track.releaseYear))
                    .font(.system(size: 68, weight: t.titleWeight, design: t.fontDesign))
                    .foregroundStyle(t.gradient.isEmpty ? AnyShapeStyle(t.text) : t.ctaStyle)

                VStack(spacing: 4) {
                    Text(result.track.name)
                        .font(.headline)
                        .foregroundStyle(t.text)
                    Text(result.track.artist)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(t.textMuted)
                }
                .multilineTextAlignment(.center)

                if let bonus = result.bonus {
                    bonusBlock(bonus)
                }

                HStack(spacing: 10) {
                    if let url = spotifyURL {
                        Button {
                            openURL(url)
                        } label: {
                            Label("Auf Spotify", systemImage: "play.circle.fill")
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(t.text)
                                .padding(.horizontal, 18)
                                .padding(.vertical, 13)
                                .background(Capsule().fill(t.surface).overlay(Capsule().stroke(t.surfaceStroke, lineWidth: max(t.strokeWidth, 1))))
                        }
                        .buttonStyle(.plain)
                    }

                    Button(action: onContinue) {
                        Text("Weiter")
                            .font(.headline.weight(.black))
                            .foregroundStyle(t.onAccent)
                            .padding(.horizontal, 36)
                            .padding(.vertical, 13)
                            .background(Capsule().fill(t.ctaStyle).themedShadow(t))
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 6)
            }
            .padding(30)
            .background(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .fill(t.colorScheme == .dark ? AnyShapeStyle(.regularMaterial) : AnyShapeStyle(t.background))
                    .overlay(
                        RoundedRectangle(cornerRadius: 24, style: .continuous)
                            .stroke(t.surfaceStroke, lineWidth: t.strokeWidth)
                    )
                    .themedShadow(t)
            )
            .padding(26)

            if result.correct {
                ConfettiView()
            }
        }
    }

    @ViewBuilder
    private func bonusBlock(_ bonus: BonusResult) -> some View {
        VStack(spacing: 6) {
            bonusRow("Titel", guess: bonus.titleGuess, ok: bonus.titleCorrect)
            bonusRow("Artist", guess: bonus.artistGuess, ok: bonus.artistCorrect)
            bonusRow("Jahr", guess: bonus.yearGuess > 0 ? String(bonus.yearGuess) : "—", ok: bonus.yearCorrect)

            Text(bonus.mastered ? "GEMEISTERT ★" : "\(bonus.correctCount)/3 — nicht gemeistert")
                .font(.system(size: 14, weight: .black, design: t.fontDesign))
                .foregroundStyle(bonus.mastered ? t.good : t.textMuted)
                .padding(.top, 2)
        }
        .padding(12)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(t.surface.opacity(0.6))
                .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(t.surfaceStroke.opacity(0.5), lineWidth: 1))
        )
    }

    private func bonusRow(_ label: String, guess: String, ok: Bool) -> some View {
        HStack(spacing: 8) {
            Image(systemName: ok ? "checkmark.circle.fill" : "xmark.circle.fill")
                .foregroundStyle(ok ? t.good : t.bad)
            Text(label)
                .font(.caption.weight(.bold))
                .foregroundStyle(t.textMuted)
                .frame(width: 44, alignment: .leading)
            Text(guess.isEmpty ? "—" : guess)
                .font(.caption.weight(.semibold))
                .foregroundStyle(t.text)
                .lineLimit(1)
            Spacer(minLength: 0)
        }
    }
}
