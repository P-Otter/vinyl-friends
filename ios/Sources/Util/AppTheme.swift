// Umschaltbare Design-Themes. Jedes Theme ist ein Satz Design-Tokens;
// die Auswahl wird in UserDefaults gespeichert und überlebt App-Neustarts.
import SwiftUI

struct AppTheme: Identifiable, Equatable {
    enum Decoration { case ripples, aurora, bubbles, splatter, stipple, comicNotes }
    enum ShadowStyle { case hard, glow, none }
    enum VinylStyle { case classic, whiteLabel, comic }
    enum CardStyle { case standard, comicPanel }

    let id: String
    let name: String
    let colorScheme: ColorScheme
    let background: Color
    let decoration: Decoration
    let decorationColors: [Color]
    let surface: Color
    let surfaceStroke: Color
    let strokeWidth: CGFloat // 0 = keine Konturen (Glow-Look)
    let text: Color
    let textMuted: Color
    let accent: Color
    let onAccent: Color
    let highlight: Color // Drop-Ziel, Auswahl, Krone
    let good: Color
    let bad: Color
    let shadow: ShadowStyle
    let gradient: [Color] // leer = flache Akzentfarbe
    let fontDesign: Font.Design
    let titleWeight: Font.Weight
    let uppercaseTitles: Bool
    let vinylStyle: VinylStyle
    let cardStyle: CardStyle
    let playerColors: [String]

    var ctaStyle: AnyShapeStyle {
        gradient.isEmpty
            ? AnyShapeStyle(accent)
            : AnyShapeStyle(
                LinearGradient(colors: gradient, startPoint: .topLeading, endPoint: .bottomTrailing)
            )
    }

    static func == (a: AppTheme, b: AppTheme) -> Bool { a.id == b.id }

    // MARK: Die gespeicherten Styles

    static let ink = AppTheme(
        id: "ink",
        name: "Tinte & Papier",
        colorScheme: .light,
        background: Color(hex: "#F3ECDC"),
        decoration: .ripples,
        decorationColors: [Color(hex: "#1A1820")],
        surface: Color(hex: "#F3ECDC"),
        surfaceStroke: Color(hex: "#1A1820"),
        strokeWidth: 2.5,
        text: Color(hex: "#1A1820"),
        textMuted: Color(hex: "#1A1820").opacity(0.5),
        accent: Color(hex: "#1A1820"),
        onAccent: Color(hex: "#F3ECDC"),
        highlight: Color(hex: "#C9912C"),
        good: Color(hex: "#4C7A4C"),
        bad: Color(hex: "#B23A33"),
        shadow: .hard,
        gradient: [],
        fontDesign: .rounded,
        titleWeight: .black,
        uppercaseTitles: false,
        vinylStyle: .classic,
        cardStyle: .standard,
        playerColors: [
            "#B23A33", "#2F5D8A", "#4C7A4C", "#C9912C",
            "#7A4C7A", "#C26B3F", "#A8455E", "#3E7C7B",
        ]
    )

    static let retro = AppTheme(
        id: "retro",
        name: "Retro Funk",
        colorScheme: .light,
        background: Color(hex: "#F4E3C1"),
        decoration: .ripples,
        decorationColors: [Color(hex: "#4A2C1A")],
        surface: Color(hex: "#FBF2DE"),
        surfaceStroke: Color(hex: "#4A2C1A"),
        strokeWidth: 2,
        text: Color(hex: "#4A2C1A"),
        textMuted: Color(hex: "#4A2C1A").opacity(0.55),
        accent: Color(hex: "#D96E30"),
        onAccent: Color(hex: "#FBF2DE"),
        highlight: Color(hex: "#C9912C"),
        good: Color(hex: "#6B7F3A"),
        bad: Color(hex: "#B23A33"),
        shadow: .hard,
        gradient: [],
        fontDesign: .rounded,
        titleWeight: .black,
        uppercaseTitles: false,
        vinylStyle: .classic,
        cardStyle: .standard,
        playerColors: [
            "#D96E30", "#6B7F3A", "#B23A33", "#C9912C",
            "#5E4B8B", "#3E7C7B", "#A8455E", "#8A6642",
        ]
    )

    /// Nach 1979er-Jazz-Vinyl-Referenz: gealtertes Papier, schwarze Tusche-Spritzer,
    /// präzise Grotesk-Typo in Versalien, kleiner roter Stempel-Akzent.
    static let vinyl1979 = AppTheme(
        id: "vinyl1979",
        name: "Vinyl 1979",
        colorScheme: .light,
        background: Color(hex: "#EDE6D6"),
        decoration: .splatter,
        decorationColors: [Color(hex: "#0D0C0A")],
        surface: Color(hex: "#EDE6D6"),
        surfaceStroke: Color(hex: "#0D0C0A"),
        strokeWidth: 1.5,
        text: Color(hex: "#0D0C0A"),
        textMuted: Color(hex: "#0D0C0A").opacity(0.55),
        accent: Color(hex: "#0D0C0A"),
        onAccent: Color(hex: "#EDE6D6"),
        highlight: Color(hex: "#8B2F25"),
        good: Color(hex: "#5B6B4A"),
        bad: Color(hex: "#8B2F25"),
        shadow: .hard,
        gradient: [],
        fontDesign: .default,
        titleWeight: .black,
        uppercaseTitles: true,
        vinylStyle: .whiteLabel,
        cardStyle: .standard,
        playerColors: [
            "#8B2F25", "#2E4057", "#5B6B4A", "#8A6D3B",
            "#55485E", "#73524C", "#3E5C5A", "#6E6A45",
        ]
    )

    /// Die Nachtseite der Platte: Schwarz mit Papierweiß invertiert.
    static let vinylNight = AppTheme(
        id: "vinylNight",
        name: "Vinyl Nacht",
        colorScheme: .dark,
        background: Color(hex: "#0D0C0A"),
        decoration: .splatter,
        decorationColors: [Color(hex: "#EDE6D6")],
        surface: Color(hex: "#14120F"),
        surfaceStroke: Color(hex: "#EDE6D6"),
        strokeWidth: 1.5,
        text: Color(hex: "#EDE6D6"),
        textMuted: Color(hex: "#EDE6D6").opacity(0.6),
        accent: Color(hex: "#EDE6D6"),
        onAccent: Color(hex: "#0D0C0A"),
        highlight: Color(hex: "#C2604F"),
        good: Color(hex: "#9FB57A"),
        bad: Color(hex: "#C2604F"),
        shadow: .hard,
        gradient: [],
        fontDesign: .default,
        titleWeight: .black,
        uppercaseTitles: true,
        vinylStyle: .whiteLabel,
        cardStyle: .standard,
        playerColors: [
            "#C2604F", "#7FA0BF", "#9FB57A", "#C9A86A",
            "#A491C9", "#C98FA6", "#7FBFB4", "#B5B083",
        ]
    )

    /// Nach Tusche-Comic-Referenz: reines Schwarz-Weiß, Pinselstrich-Platte mit
    /// Glanzbändern und Palmen-Insel, Panel-Rahmen, verstreute Noten. Keine
    /// Schatten — Tiefe entsteht nur über Kontrast.
    static let comic = AppTheme(
        id: "comic",
        name: "Comic",
        colorScheme: .light,
        background: Color(hex: "#FFFFFF"),
        decoration: .comicNotes,
        decorationColors: [Color(hex: "#0A0A0A")],
        surface: Color(hex: "#FFFFFF"),
        surfaceStroke: Color(hex: "#0A0A0A"),
        strokeWidth: 2.2,
        text: Color(hex: "#0A0A0A"),
        textMuted: Color(hex: "#0A0A0A").opacity(0.55),
        accent: Color(hex: "#0A0A0A"),
        onAccent: Color(hex: "#FFFFFF"),
        highlight: Color(hex: "#5A5A5A"),
        good: Color(hex: "#0A0A0A"),
        bad: Color(hex: "#5A5A5A"),
        shadow: .none,
        gradient: [],
        fontDesign: .default,
        titleWeight: .heavy,
        uppercaseTitles: true,
        vinylStyle: .comic,
        cardStyle: .comicPanel,
        playerColors: [
            "#111111", "#4D4D4D", "#33424E", "#4E3333",
            "#33473A", "#46402E", "#3D3349", "#6B6B6B",
        ]
    )

    /// Die invertierte Comic-Seite: weiße Tusche auf Schwarz.
    static let comicNight = AppTheme(
        id: "comicNight",
        name: "Comic Nacht",
        colorScheme: .dark,
        background: Color(hex: "#0A0A0A"),
        decoration: .comicNotes,
        decorationColors: [Color(hex: "#FFFFFF")],
        surface: Color(hex: "#0A0A0A"),
        surfaceStroke: Color(hex: "#FFFFFF"),
        strokeWidth: 2.2,
        text: Color(hex: "#FFFFFF"),
        textMuted: Color(hex: "#FFFFFF").opacity(0.6),
        accent: Color(hex: "#FFFFFF"),
        onAccent: Color(hex: "#0A0A0A"),
        highlight: Color(hex: "#9A9A9A"),
        good: Color(hex: "#FFFFFF"),
        bad: Color(hex: "#9A9A9A"),
        shadow: .none,
        gradient: [],
        fontDesign: .default,
        titleWeight: .heavy,
        uppercaseTitles: true,
        vinylStyle: .comic,
        cardStyle: .comicPanel,
        playerColors: [
            "#F2F2F2", "#ABABAB", "#9FB6C4", "#C49F9F",
            "#A3C4AC", "#C4BD9E", "#B3A6C9", "#7F7F7F",
        ]
    )

    // Aufgehoben, aber nicht im Wähler (auf Wunsch reaktivierbar):

    static let neon = AppTheme(
        id: "neon",
        name: "Neon-Disco",
        colorScheme: .dark,
        background: Color(hex: "#0B0B1E"),
        decoration: .aurora,
        decorationColors: [Color(hex: "#7C3AED"), Color(hex: "#FF2D78"), Color(hex: "#22D3EE")],
        surface: Color.white.opacity(0.06),
        surfaceStroke: Color.white.opacity(0.14),
        strokeWidth: 1,
        text: .white,
        textMuted: Color.white.opacity(0.55),
        accent: Color(hex: "#FF2D78"),
        onAccent: .white,
        highlight: Color(hex: "#22D3EE"),
        good: Color(hex: "#34D399"),
        bad: Color(hex: "#FF2D78"),
        shadow: .glow,
        gradient: [Color(hex: "#FF2D78"), Color(hex: "#7C3AED"), Color(hex: "#22D3EE")],
        fontDesign: .rounded,
        titleWeight: .black,
        uppercaseTitles: false,
        vinylStyle: .classic,
        cardStyle: .standard,
        playerColors: [
            "#ef4444", "#3b82f6", "#22c55e", "#eab308",
            "#a855f7", "#f97316", "#ec4899", "#14b8a6",
        ]
    )

    static let candy = AppTheme(
        id: "candy",
        name: "Candy Pop",
        colorScheme: .light,
        background: Color(hex: "#EAF2FF"),
        decoration: .bubbles,
        decorationColors: [Color(hex: "#FFD6E8"), Color(hex: "#D6F0FF"), Color(hex: "#FFF3C4")],
        surface: .white,
        surfaceStroke: Color(hex: "#2D2A4A"),
        strokeWidth: 2.5,
        text: Color(hex: "#2D2A4A"),
        textMuted: Color(hex: "#2D2A4A").opacity(0.55),
        accent: Color(hex: "#FF5CA8"),
        onAccent: .white,
        highlight: Color(hex: "#34C8C2"),
        good: Color(hex: "#3CC871"),
        bad: Color(hex: "#FF5C5C"),
        shadow: .hard,
        gradient: [Color(hex: "#FF5CA8"), Color(hex: "#FF8E53")],
        fontDesign: .rounded,
        titleWeight: .black,
        uppercaseTitles: false,
        vinylStyle: .classic,
        cardStyle: .standard,
        playerColors: [
            "#FF5CA8", "#34C8C2", "#FFB02E", "#8C6CFF",
            "#3CC871", "#FF8E53", "#FF5C5C", "#4AA8FF",
        ]
    )

    static let all: [AppTheme] = [.ink, .retro, .vinyl1979, .vinylNight, .comic, .comicNight]
}

/// Hält das aktive Theme und persistiert die Auswahl.
@MainActor
final class ThemeStore: ObservableObject {
    @Published var theme: AppTheme {
        didSet { UserDefaults.standard.set(theme.id, forKey: "themeId") }
    }

    init() {
        let saved = UserDefaults.standard.string(forKey: "themeId")
        theme = AppTheme.all.first { $0.id == saved } ?? .ink
    }
}
