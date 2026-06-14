import SwiftUI

/// Kurzer Erst-Start-Erklärer „So geht's".
struct OnboardingView: View {
    @EnvironmentObject private var themeStore: ThemeStore
    let onDone: () -> Void

    private var t: AppTheme { themeStore.theme }

    private struct Step: Identifiable {
        let id = UUID()
        let icon: String
        let title: String
        let text: String
    }

    private let steps: [Step] = [
        .init(icon: "play.circle.fill", title: "Hör den Song",
              text: "Ein kurzer Ausschnitt spielt — kein Cover sehen, nur hören."),
        .init(icon: "calendar", title: "Schätze das Jahr",
              text: "Zieh die Karte an die richtige Stelle deiner Zeitleiste — älter links, neuer rechts."),
        .init(icon: "star.fill", title: "Errate den Song",
              text: "Bonus: Titel, Künstler & Jahr erraten für Extrapunkte."),
        .init(icon: "crown.fill", title: "Gewinne",
              text: "Wer zuerst genug Karten sammelt (und errät), gewinnt."),
    ]

    var body: some View {
        ZStack {
            ThemedBackground()
            VStack(spacing: 18) {
                Spacer()
                Text(t.uppercaseTitles ? "SO GEHT'S" : "So geht's")
                    .font(.system(size: 30, weight: t.titleWeight, design: t.fontDesign))
                    .foregroundStyle(t.gradient.isEmpty ? AnyShapeStyle(t.text) : t.ctaStyle)

                VStack(spacing: 14) {
                    ForEach(steps) { step in
                        HStack(spacing: 14) {
                            Image(systemName: step.icon)
                                .font(.title3.weight(.bold))
                                .foregroundStyle(t.onAccent)
                                .frame(width: 46, height: 46)
                                .background(Circle().fill(t.ctaStyle))
                            VStack(alignment: .leading, spacing: 2) {
                                Text(step.title).font(.headline.weight(.black)).foregroundStyle(t.text)
                                Text(step.text).font(.caption).foregroundStyle(t.textMuted)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            Spacer(minLength: 0)
                        }
                    }
                }
                .padding(18)
                .frame(maxWidth: .infinity)
                .themedCard()

                Spacer()

                Button(action: onDone) {
                    Label("Los geht's!", systemImage: "play.fill")
                        .font(.title3.weight(.black))
                        .foregroundStyle(t.onAccent)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Capsule().fill(t.ctaStyle).themedShadow(t))
                }
                .buttonStyle(.plain)
            }
            .padding(22)
        }
    }
}
