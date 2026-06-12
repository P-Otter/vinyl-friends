import SwiftUI

struct EndView: View {
    @EnvironmentObject private var engine: GameEngine
    @EnvironmentObject private var themeStore: ThemeStore
    @Environment(\.dismiss) private var dismiss

    private static let medals = ["🥇", "🥈", "🥉"]
    private var t: AppTheme { themeStore.theme }

    var body: some View {
        ZStack {
            VStack(spacing: 20) {
                Text(t.uppercaseTitles ? "SPIEL VORBEI!" : "Spiel vorbei!")
                    .font(.system(size: 34, weight: t.titleWeight, design: t.fontDesign))
                    .tracking(t.uppercaseTitles ? 1.5 : 0)
                    .foregroundStyle(t.text)

                if let winner = engine.winner {
                    VStack(spacing: 8) {
                        Image(systemName: "crown.fill")
                            .font(.system(size: 34, weight: .black))
                            .foregroundStyle(t.highlight)
                        Text(t.uppercaseTitles ? winner.name.uppercased() : winner.name)
                            .font(.system(size: 28, weight: t.titleWeight, design: t.fontDesign))
                            .tracking(t.uppercaseTitles ? 1.5 : 0)
                            .foregroundStyle(Color(hex: winner.colorHex))
                        Text("gewinnt mit \(winner.cards.count) Karten")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(t.textMuted)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 22)
                    .themedCard(cornerRadius: 24)
                }

                VStack(spacing: 10) {
                    ForEach(Array(Scoring.ranking(engine.players).enumerated()), id: \.element.id) { idx, stats in
                        HStack(spacing: 12) {
                            Text(idx < Self.medals.count ? Self.medals[idx] : "\(idx + 1).")
                                .frame(width: 32)
                            Circle()
                                .fill(Color(hex: stats.colorHex))
                                .frame(width: 11, height: 11)
                            Text(stats.name)
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(t.text)
                            Spacer()
                            Text("\(stats.cards) Karten")
                                .font(.subheadline.weight(.black).monospacedDigit())
                                .foregroundStyle(t.text)
                            Text("\(Int((stats.accuracy * 100).rounded())) %")
                                .font(.caption.weight(.semibold).monospacedDigit())
                                .foregroundStyle(t.textMuted)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(t.surface)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                                        .stroke(t.surfaceStroke.opacity(0.7), lineWidth: max(t.strokeWidth * 0.6, 1))
                                )
                        )
                    }
                }

                Spacer()

                Button {
                    engine.resetGame()
                    dismiss()
                } label: {
                    Label("Nochmal spielen", systemImage: "arrow.counterclockwise")
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
            }
            .padding(20)

            ConfettiView()
        }
    }
}
