import SwiftUI

struct RevealOverlay: View {
    @EnvironmentObject private var themeStore: ThemeStore
    let result: PlacementResult
    let onContinue: () -> Void

    private var t: AppTheme { themeStore.theme }
    private var stampColor: Color { result.correct ? t.good : t.bad }

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

                Button(action: onContinue) {
                    Text("Weiter")
                        .font(.headline.weight(.black))
                        .foregroundStyle(t.onAccent)
                        .padding(.horizontal, 44)
                        .padding(.vertical, 13)
                        .background(
                            Capsule()
                                .fill(t.ctaStyle)
                                .themedShadow(t)
                        )
                }
                .buttonStyle(.plain)
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
}
