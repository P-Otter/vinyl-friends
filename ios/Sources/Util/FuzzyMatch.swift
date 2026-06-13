// Toleranter Text-Vergleich für Titel-/Artist-Rateeingaben.
// Soll erkennen: Tippfehler (James Blunt mit vertauschtem d/t), Zahl vs. Wort
// (Jackson 5 = Jackson Five), Akzente, Groß/Klein, „feat."-Zusätze, & = und.
import Foundation

enum FuzzyMatch {
    /// Zahlwörter → Ziffern, damit „five" und „5" gleich behandelt werden.
    private static let numberWords: [String: String] = [
        "zero": "0", "null": "0",
        "one": "1", "eins": "1",
        "two": "2", "zwei": "2",
        "three": "3", "drei": "3",
        "four": "4", "vier": "4",
        "five": "5", "fuenf": "5",
        "six": "6", "sechs": "6",
        "seven": "7", "sieben": "7",
        "eight": "8", "acht": "8",
        "nine": "9", "neun": "9",
        "ten": "10", "zehn": "10",
    ]

    /// Vereinheitlicht einen Titel/Namen für den Vergleich.
    static func normalize(_ raw: String) -> String {
        var s = raw.lowercased()

        // Klammer-Zusätze und alles nach " - " (Remaster, Live, …) entfernen.
        if let range = s.range(of: " - ") { s = String(s[..<range.lowerBound]) }
        s = s.replacingOccurrences(of: "\\([^)]*\\)", with: " ", options: .regularExpression)
        // „feat."/„featuring"-Zusätze raus.
        s = s.replacingOccurrences(of: "\\b(feat|ft|featuring)\\b.*", with: " ", options: .regularExpression)

        // Akzente entfernen.
        s = s.folding(options: .diacriticInsensitive, locale: .current)

        s = s.replacingOccurrences(of: "&", with: " and ")
        s = s.replacingOccurrences(of: "ß", with: "ss")

        // In Tokens zerlegen, Satzzeichen weg, Zahlwörter → Ziffern.
        let tokens = s
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { !$0.isEmpty }
            .map { numberWords[$0] ?? $0 }
            // Füllwörter, die das Matching nicht tragen sollen.
            .filter { !["the", "a", "an", "der", "die", "das", "and", "und"].contains($0) }

        return tokens.joined(separator: " ")
    }

    /// Levenshtein-Distanz (Anzahl Einzeländerungen).
    static func levenshtein(_ a: String, _ b: String) -> Int {
        let s = Array(a), t = Array(b)
        if s.isEmpty { return t.count }
        if t.isEmpty { return s.count }
        var prev = Array(0...t.count)
        var curr = [Int](repeating: 0, count: t.count + 1)
        for i in 1...s.count {
            curr[0] = i
            for j in 1...t.count {
                let cost = s[i - 1] == t[j - 1] ? 0 : 1
                curr[j] = min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
            }
            swap(&prev, &curr)
        }
        return prev[t.count]
    }

    /// Ist `guess` nah genug an `target`? `tolerance` = erlaubter Anteil an
    /// Änderungen (0.25 ≈ ein Viertel der Zeichen dürfen abweichen).
    static func matches(_ guess: String, _ target: String, tolerance: Double = 0.25) -> Bool {
        let g = normalize(guess)
        let t = normalize(target)
        if g.isEmpty { return false }
        if g == t { return true }
        let dist = levenshtein(g, t)
        let allowed = max(1, Int((Double(max(g.count, t.count)) * tolerance).rounded()))
        return dist <= allowed
    }

    /// Für Artists mit mehreren Namen: Treffer, wenn `guess` zum Ganzen ODER
    /// zu einem der einzelnen Künstler passt (z. B. nur den Haupt-Act nennen).
    static func matchesArtist(_ guess: String, _ artistField: String, tolerance: Double = 0.25) -> Bool {
        if matches(guess, artistField, tolerance: tolerance) { return true }
        let parts = artistField
            .components(separatedBy: CharacterSet(charactersIn: ",&"))
            .flatMap { $0.components(separatedBy: " and ") }
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
        return parts.contains { matches(guess, $0, tolerance: tolerance) }
    }
}
