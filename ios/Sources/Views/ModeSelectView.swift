import SwiftUI

/// Startauswahl: Lokal (privat) vs. App Store (öffentlich).
struct ModeSelectView: View {
    @EnvironmentObject private var modeStore: AppModeStore
    @EnvironmentObject private var themeStore: ThemeStore

    private var t: AppTheme { themeStore.theme }

    var body: some View {
        ZStack {
            ThemedBackground()
            VStack(spacing: 16) {
                Spacer()
                VinylView(spinning: true, size: 110)
                Text(t.uppercaseTitles ? "VINYL FRIENDS" : "Vinyl Friends")
                    .font(.system(size: 34, weight: t.titleWeight, design: t.fontDesign))
                    .foregroundStyle(t.gradient.isEmpty ? AnyShapeStyle(t.text) : t.ctaStyle)
                Text("Wie willst du spielen?")
                    .font(.callout.weight(.semibold))
                    .foregroundStyle(t.textMuted)

                Spacer()

                modeCard(.local)
                modeCard(.appStore)

                Spacer()
                Text("Kannst du jederzeit wechseln.")
                    .font(.caption).foregroundStyle(t.textMuted)
                    .padding(.bottom, 8)
            }
            .padding(22)
        }
    }

    private func modeCard(_ mode: AppMode) -> some View {
        Button {
            withAnimation(.spring(duration: 0.35)) { modeStore.mode = mode }
        } label: {
            HStack(spacing: 14) {
                Image(systemName: mode.icon)
                    .font(.title2.weight(.bold))
                    .foregroundStyle(t.onAccent)
                    .frame(width: 52, height: 52)
                    .background(Circle().fill(t.ctaStyle))
                VStack(alignment: .leading, spacing: 4) {
                    Text(mode.title)
                        .font(.headline.weight(.black))
                        .foregroundStyle(t.text)
                    Text(mode.subtitle)
                        .font(.caption)
                        .foregroundStyle(t.textMuted)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right").foregroundStyle(t.textMuted)
            }
            .padding(16)
            .frame(maxWidth: .infinity)
            .themedCard()
        }
        .buttonStyle(.plain)
    }
}
