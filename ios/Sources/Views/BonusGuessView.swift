import SwiftUI

/// Blind raten nach korrektem Platzieren: Titel, Artist, Jahr.
/// Der Song bleibt verdeckt — die Auflösung kommt erst danach.
struct BonusGuessView: View {
    @EnvironmentObject private var engine: GameEngine
    @EnvironmentObject private var themeStore: ThemeStore

    @State private var title = ""
    @State private var artist = ""
    @State private var yearText = ""
    @FocusState private var focused: Field?

    private enum Field { case title, artist, year }
    private var t: AppTheme { themeStore.theme }

    /// Mindestens ein Feld gefüllt — sonst wäre „Auflösen" ein stiller Fehlversuch.
    private var hasAnyGuess: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty
            || !artist.trimmingCharacters(in: .whitespaces).isEmpty
            || !yearText.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        ZStack {
            Color.black.opacity(0.6).ignoresSafeArea()
                .onTapGesture { focused = nil }

            VStack(spacing: 14) {
                VStack(spacing: 4) {
                    Text("BONUS")
                        .font(.system(size: 24, weight: .black, design: t.fontDesign))
                        .tracking(2)
                        .foregroundStyle(t.highlight)
                    Text("Mindestens \(engine.settings.masteryThreshold) von 3 richtig = Karte gemeistert ★")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(t.textMuted)
                        .multilineTextAlignment(.center)
                }

                field("Titel", text: $title, field: .title, submit: .next)
                field("Artist", text: $artist, field: .artist, submit: .next)
                field("Jahr (z. B. 1987)", text: $yearText, field: .year, submit: .done, number: true)

                HStack(spacing: 12) {
                    Button {
                        engine.skipBonus()
                    } label: {
                        Text("Weiß nicht")
                            .font(.headline.weight(.bold))
                            .foregroundStyle(t.text)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 13)
                            .background(
                                Capsule().fill(t.surface)
                                    .overlay(Capsule().stroke(t.surfaceStroke, lineWidth: max(t.strokeWidth, 1)))
                            )
                    }
                    .buttonStyle(.plain)

                    Button {
                        focused = nil
                        engine.submitBonus(title: title, artist: artist, year: Int(yearText) ?? 0)
                    } label: {
                        Text("Auflösen")
                            .font(.headline.weight(.black))
                            .foregroundStyle(t.onAccent)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 13)
                            .background(Capsule().fill(t.ctaStyle).opacity(hasAnyGuess ? 1 : 0.4).themedShadow(t))
                    }
                    .buttonStyle(.plain)
                    .disabled(!hasAnyGuess)
                }

                if !hasAnyGuess {
                    Text("Mindestens ein Feld ausfüllen — sonst tippe auf Weiß nicht.")
                        .font(.caption2).foregroundStyle(t.textMuted)
                }
            }
            .padding(24)
            .background(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .fill(t.colorScheme == .dark ? AnyShapeStyle(.regularMaterial) : AnyShapeStyle(t.background))
                    .overlay(
                        RoundedRectangle(cornerRadius: 24, style: .continuous)
                            .stroke(t.surfaceStroke, lineWidth: t.strokeWidth)
                    )
            )
            .padding(20)
        }
    }

    private func field(_ placeholder: String, text: Binding<String>, field: Field, submit: SubmitLabel, number: Bool = false) -> some View {
        TextField("", text: text, prompt: Text(placeholder).foregroundColor(t.textMuted))
            .focused($focused, equals: field)
            .submitLabel(submit)
            .keyboardType(number ? .numberPad : .default)
            .autocorrectionDisabled()
            .foregroundStyle(t.text)
            .font(.body.weight(.semibold))
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(t.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(focused == field ? t.highlight : t.surfaceStroke.opacity(0.6),
                                    lineWidth: focused == field ? 2 : max(t.strokeWidth * 0.6, 1))
                    )
            )
            .onSubmit {
                switch field {
                case .title: focused = .artist
                case .artist: focused = .year
                case .year: focused = nil
                }
            }
    }
}
