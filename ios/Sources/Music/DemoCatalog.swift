// Eingebauter Demo-Songkatalog: bekannte Hits quer durch die Jahrzehnte,
// damit das Spiel ohne Streaming-Account ausprobierbar ist.
import Foundation

enum DemoCatalog {
    static let tracks: [Track] = [
        demo("Johnny B. Goode", "Chuck Berry", 1958),
        demo("Surfin' U.S.A.", "The Beach Boys", 1963),
        demo("(I Can't Get No) Satisfaction", "The Rolling Stones", 1965),
        demo("Respect", "Aretha Franklin", 1967),
        demo("Space Oddity", "David Bowie", 1969),
        demo("Imagine", "John Lennon", 1971),
        demo("Bohemian Rhapsody", "Queen", 1975),
        demo("Stayin' Alive", "Bee Gees", 1977),
        demo("I Will Survive", "Gloria Gaynor", 1978),
        demo("Super Trouper", "ABBA", 1980),
        demo("Billie Jean", "Michael Jackson", 1982),
        demo("99 Luftballons", "Nena", 1983),
        demo("Take on Me", "a-ha", 1985),
        demo("Never Gonna Give You Up", "Rick Astley", 1987),
        demo("Ice Ice Baby", "Vanilla Ice", 1990),
        demo("Smells Like Teen Spirit", "Nirvana", 1991),
        demo("What Is Love", "Haddaway", 1993),
        demo("Wonderwall", "Oasis", 1995),
        demo("Wannabe", "Spice Girls", 1996),
        demo("...Baby One More Time", "Britney Spears", 1998),
        demo("Yellow", "Coldplay", 2000),
        demo("Can't Get You Out of My Head", "Kylie Minogue", 2001),
        demo("Crazy in Love", "Beyoncé", 2003),
        demo("Mr. Brightside", "The Killers", 2004),
        demo("Crazy", "Gnarls Barkley", 2006),
        demo("I Kissed a Girl", "Katy Perry", 2008),
        demo("Bad Romance", "Lady Gaga", 2009),
        demo("Somebody That I Used to Know", "Gotye", 2011),
        demo("Get Lucky", "Daft Punk", 2013),
        demo("Shake It Off", "Taylor Swift", 2014),
        demo("Hello", "Adele", 2015),
        demo("Shape of You", "Ed Sheeran", 2017),
        demo("Blinding Lights", "The Weeknd", 2019),
        demo("drivers license", "Olivia Rodrigo", 2021),
        demo("As It Was", "Harry Styles", 2022),
        demo("Flowers", "Miley Cyrus", 2023),
        demo("Espresso", "Sabrina Carpenter", 2024),
    ]

    private static func demo(_ name: String, _ artist: String, _ year: Int) -> Track {
        Track(
            id: "demo-\(artist)-\(name)",
            uri: "",
            name: name,
            artist: artist,
            albumName: "",
            albumArt: "",
            releaseYear: year,
            durationMs: 30_000,
            explicit: false,
            source: .demo
        )
    }
}
