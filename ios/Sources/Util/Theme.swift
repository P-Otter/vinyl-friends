// Wiederverwendbare, Theme-getriebene UI-Bausteine.
// Die Design-Tokens kommen aus AppTheme / ThemeStore.
import SwiftUI

extension View {
    /// Harter Offset-Schatten, Soft-Glow oder gar keiner — je nach Theme.
    @ViewBuilder
    func themedShadow(_ theme: AppTheme, color: Color? = nil) -> some View {
        switch theme.shadow {
        case .hard:
            shadow(color: color ?? theme.text, radius: 0, x: 4, y: 4)
        case .glow:
            shadow(color: (color ?? theme.accent).opacity(0.55), radius: 14, y: 5)
        case .none:
            self
        }
    }
}

/// Panel/Karte im aktiven Theme-Stil.
struct ThemedCard: ViewModifier {
    @EnvironmentObject private var themeStore: ThemeStore
    var cornerRadius: CGFloat = 22
    var shadowColor: Color?

    func body(content: Content) -> some View {
        let t = themeStore.theme
        content.background(cardBackground(t))
    }

    @ViewBuilder
    private func cardBackground(_ t: AppTheme) -> some View {
        switch t.cardStyle {
        case .standard:
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .fill(t.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .stroke(t.surfaceStroke, lineWidth: t.strokeWidth)
                )
                .themedShadow(t, color: shadowColor)
        case .comicPanel:
            ComicPanelBackground(t: t, cornerRadius: cornerRadius)
        }
    }
}

extension View {
    func themedCard(cornerRadius: CGFloat = 22, shadow: Color? = nil) -> some View {
        modifier(ThemedCard(cornerRadius: cornerRadius, shadowColor: shadow))
    }
}

/// App-Hintergrund mit Theme-Dekoration (Ringe, Farbnebel oder Bubbles).
struct ThemedBackground: View {
    @EnvironmentObject private var themeStore: ThemeStore

    var body: some View {
        let t = themeStore.theme
        // Dekoration als Overlay, damit feste Größen das Layout nicht aufblähen.
        t.background
            .overlay(decoration(t))
            .ignoresSafeArea()
    }

    @ViewBuilder
    private func decoration(_ t: AppTheme) -> some View {
        switch t.decoration {
        case .ripples:
            let ink = t.decorationColors.first ?? t.text
            ZStack {
                rippleCluster(ink, base: 220).offset(x: -160, y: -320)
                rippleCluster(ink, base: 280).offset(x: 180, y: 360)
            }
        case .aurora:
            let spots: [(x: CGFloat, y: CGFloat, size: CGFloat)] = [
                (-120, -280, 380), (160, -60, 320), (-40, 340, 380),
            ]
            ZStack {
                ForEach(0..<min(spots.count, t.decorationColors.count), id: \.self) { i in
                    Circle()
                        .fill(t.decorationColors[i].opacity(0.38))
                        .frame(width: spots[i].size, height: spots[i].size)
                        .blur(radius: 95)
                        .offset(x: spots[i].x, y: spots[i].y)
                }
            }
        case .bubbles:
            let spots: [(x: CGFloat, y: CGFloat, size: CGFloat)] = [
                (-150, -300, 220), (170, -180, 140), (-120, 250, 120),
                (150, 380, 200), (40, -380, 90),
            ]
            ZStack {
                ForEach(0..<spots.count, id: \.self) { i in
                    Circle()
                        .fill(t.decorationColors[i % t.decorationColors.count].opacity(0.6))
                        .frame(width: spots[i].size, height: spots[i].size)
                        .offset(x: spots[i].x, y: spots[i].y)
                }
            }
        case .splatter:
            let ink = t.decorationColors.first ?? t.text
            ZStack {
                splatterCluster(ink)
                    .offset(x: 145, y: -300)
                splatterCluster(ink)
                    .scaleEffect(0.7)
                    .rotationEffect(.degrees(150))
                    .offset(x: -150, y: 330)
                splatterDots(ink)
            }
        case .stipple:
            let ink = t.decorationColors.first ?? t.text
            ZStack {
                stippleCluster(ink)
                    .offset(x: 130, y: -290)
                stippleCluster(ink)
                    .scaleEffect(0.8)
                    .rotationEffect(.degrees(130))
                    .offset(x: -140, y: 320)
                splatterDots(ink)
                    .opacity(0.6)
            }
        case .comicNotes:
            ComicNotesDecoration(t: t)
        }
    }

    /// Gepunkteter Klecks wie die Stipple-Grafik auf dem Plattenlabel der Referenz:
    /// organische Formen nur aus gepunkteten Konturen und Sprenkeln.
    private func stippleCluster(_ color: Color) -> some View {
        let dotted = StrokeStyle(lineWidth: 1.6, lineCap: .round, dash: [0.1, 5])
        return ZStack {
            Ellipse()
                .stroke(color.opacity(0.85), style: dotted)
                .frame(width: 110, height: 72)
                .rotationEffect(.degrees(18))
            Ellipse()
                .stroke(color.opacity(0.85), style: dotted)
                .frame(width: 58, height: 80)
                .offset(x: 44, y: 30)
                .rotationEffect(.degrees(-12))
            Circle()
                .stroke(color.opacity(0.85), style: dotted)
                .frame(width: 30, height: 30)
                .offset(x: -52, y: 32)
            Ellipse().fill(color).frame(width: 13, height: 9).offset(x: -28, y: -10)
            Circle().fill(color).frame(width: 5, height: 5).offset(x: 58, y: -22)
            Circle().fill(color).frame(width: 3, height: 3).offset(x: -64, y: 0)
            Circle().fill(color).frame(width: 4, height: 4).offset(x: 18, y: 52)
            Circle().fill(color).frame(width: 3, height: 3).offset(x: 70, y: 14)
        }
    }

    /// Tusche-Klecks: überlappende, gedrehte Ellipsen plus Sprenkel.
    private func splatterCluster(_ color: Color) -> some View {
        ZStack {
            Ellipse().fill(color).frame(width: 95, height: 62).rotationEffect(.degrees(22))
            Ellipse().fill(color).frame(width: 52, height: 74)
                .offset(x: 42, y: 26).rotationEffect(.degrees(-14))
            Ellipse().fill(color).frame(width: 38, height: 30).offset(x: -48, y: 32)
            Circle().fill(color).frame(width: 14, height: 14).offset(x: -62, y: -18)
            Circle().fill(color).frame(width: 8, height: 8).offset(x: 64, y: -32)
            Circle().fill(color).frame(width: 5, height: 5).offset(x: -28, y: 64)
            Circle().fill(color).frame(width: 10, height: 10).offset(x: 22, y: 58)
            Circle().fill(color).frame(width: 4, height: 4).offset(x: 78, y: 12)
        }
    }

    /// Verstreute Tropfen entlang der Ränder.
    private func splatterDots(_ color: Color) -> some View {
        let dots: [(x: CGFloat, y: CGFloat, size: CGFloat)] = [
            (-170, -180, 6), (-150, -120, 3), (-178, -60, 9), (-140, 30, 4),
            (175, 80, 7), (155, 150, 3), (180, 210, 5), (120, 280, 3),
            (60, -350, 4), (-40, 380, 6), (20, 360, 3), (185, -120, 4),
        ]
        return ZStack {
            ForEach(0..<dots.count, id: \.self) { i in
                Circle()
                    .fill(color.opacity(0.85))
                    .frame(width: dots[i].size, height: dots[i].size)
                    .offset(x: dots[i].x, y: dots[i].y)
            }
        }
    }

    private func rippleCluster(_ color: Color, base: CGFloat) -> some View {
        ZStack {
            ForEach(0..<4, id: \.self) { i in
                Circle()
                    .stroke(color.opacity(0.06), lineWidth: 2)
                    .frame(width: base + CGFloat(i) * 80, height: base + CGFloat(i) * 80)
            }
        }
    }
}

/// Schallplatte im Theme-Stil.
struct VinylView: View {
    @EnvironmentObject private var themeStore: ThemeStore
    var spinning: Bool
    var size: CGFloat = 140
    @State private var angle: Double = 0

    var body: some View {
        let t = themeStore.theme
        Group {
            switch t.vinylStyle {
            case .classic:
                // Volle dunkle Scheibe: Offset-Schatten erzeugt hier nur die
                // sichtbare Sichel, keine Geisterbilder.
                classicDisc(t)
                    .frame(width: size, height: size)
                    .rotationEffect(.degrees(angle))
                    .themedShadow(t, color: t.shadow == .hard ? t.text : t.gradient.first)
            case .whiteLabel:
                // Nacht behält die ursprüngliche Fassung; das Redesign mit
                // Sichel-Schatten gilt nur für die hellen Vinyl-Themes.
                if t.colorScheme == .dark {
                    nightLabelDisc(t)
                } else {
                    whiteLabelDisc(t)
                }
            case .comic:
                ComicDisc(t: t, size: size)
                    .frame(width: size, height: size)
                    .rotationEffect(.degrees(angle))
            }
        }
        .onChange(of: spinning) { _, isOn in
            if isOn {
                withAnimation(.linear(duration: 2.4).repeatForever(autoreverses: false)) {
                    angle += 360
                }
            } else {
                withAnimation(.easeOut(duration: 0.6)) {
                    angle = 0
                }
            }
        }
    }

    /// Klassische dunkle Scheibe mit Papier-Label (Tinte & Papier, Retro Funk).
    private func classicDisc(_ t: AppTheme) -> some View {
        ZStack {
            Circle()
                .fill(t.colorScheme == .light ? t.text : Color(hex: "#1B1916"))
            ForEach(1..<4) { ring in
                Circle()
                    .stroke(t.background.opacity(0.22), lineWidth: 2)
                    .padding(CGFloat(ring) * size * 0.09)
            }
            Circle()
                .fill(t.gradient.isEmpty ? AnyShapeStyle(t.background) : t.ctaStyle)
                .frame(width: size * 0.34, height: size * 0.34)
                .overlay(
                    Circle().stroke(t.surfaceStroke, lineWidth: t.strokeWidth > 0 ? 2 : 0)
                )
            Image(systemName: "music.note")
                .font(.system(size: size * 0.13, weight: .black))
                .foregroundStyle(t.gradient.isEmpty ? t.text : t.onAccent)
        }
    }

    /// Vinyl Nacht: weiße Platte auf Schwarz — unverändert die erste Fassung.
    private func nightLabelDisc(_ t: AppTheme) -> some View {
        let disc = t.text
        let line = t.background
        return ZStack {
            Circle().fill(disc)
            ForEach(0..<4, id: \.self) { ring in
                Circle()
                    .stroke(line.opacity(0.45), lineWidth: 0.8)
                    .padding(size * (0.045 + CGFloat(ring) * 0.045))
            }
            Ellipse().fill(line).frame(width: size * 0.10, height: size * 0.065)
                .offset(x: size * 0.20, y: size * 0.16)
                .rotationEffect(.degrees(25))
            Circle().fill(line).frame(width: size * 0.030, height: size * 0.030)
                .offset(x: -size * 0.24, y: size * 0.10)
            Circle().fill(line).frame(width: size * 0.020, height: size * 0.020)
                .offset(x: -size * 0.16, y: -size * 0.24)
            Circle().fill(line).frame(width: size * 0.016, height: size * 0.016)
                .offset(x: size * 0.27, y: -size * 0.12)
            Circle()
                .stroke(line, lineWidth: 1.2)
                .frame(width: size * 0.42, height: size * 0.42)
            Text("HITSTER")
                .font(.system(size: size * 0.052, weight: .semibold))
                .tracking(size * 0.012)
                .foregroundStyle(line)
                .offset(y: -size * 0.10)
            Text("FRIENDS")
                .font(.system(size: size * 0.052, weight: .semibold))
                .tracking(size * 0.012)
                .foregroundStyle(line)
                .offset(y: size * 0.10)
            Circle().fill(line).frame(width: size * 0.055, height: size * 0.055)
        }
        .overlay(
            Circle().stroke(line, lineWidth: max(t.strokeWidth, 1.2))
        )
        .frame(width: size, height: size)
        .rotationEffect(.degrees(angle))
        .themedShadow(t, color: t.shadow == .hard ? t.text : t.gradient.first)
    }

    /// White-Label-Platte nach der Vinyl-Referenz: helle Scheibe mit kräftigem
    /// Rand, feine Rillen, Label mit Schrift, Klecks und Mittelloch. Der Schatten
    /// ist eine eigene Sichel-Scheibe dahinter — KEIN Offset-Schatten auf der
    /// Grafik, der würde alle Linien und die Schrift doppelt zeichnen.
    private func whiteLabelDisc(_ t: AppTheme) -> some View {
        let disc = t.colorScheme == .light ? t.background : t.text
        let line = t.colorScheme == .light ? t.text : t.background
        return ZStack {
            Circle().fill(disc)
            // feine Rillen zwischen Rand und Label
            ForEach(0..<6, id: \.self) { ring in
                Circle()
                    .stroke(line.opacity(0.5), lineWidth: 0.7)
                    .padding(size * (0.05 + CGFloat(ring) * 0.03))
            }
            // Sprenkel auf der Plattenfläche
            Circle().fill(line).frame(width: size * 0.024, height: size * 0.024)
                .offset(x: -size * 0.30, y: -size * 0.14)
            Circle().fill(line).frame(width: size * 0.015, height: size * 0.015)
                .offset(x: -size * 0.26, y: -size * 0.20)
            Circle().fill(line).frame(width: size * 0.018, height: size * 0.018)
                .offset(x: size * 0.33, y: size * 0.05)
            // Label deckt die Rillen ab
            Circle()
                .fill(disc)
                .frame(width: size * 0.46, height: size * 0.46)
                .overlay(Circle().stroke(line, lineWidth: 1.3))
            Text("HITSTER")
                .font(.system(size: size * 0.045, weight: .semibold))
                .tracking(size * 0.010)
                .foregroundStyle(line)
                .offset(y: -size * 0.115)
            Text("FRIENDS")
                .font(.system(size: size * 0.045, weight: .semibold))
                .tracking(size * 0.010)
                .foregroundStyle(line)
                .offset(y: size * 0.115)
            // kleiner Tusche-Klecks auf dem Label wie in der Referenz
            Ellipse().fill(line)
                .frame(width: size * 0.055, height: size * 0.038)
                .rotationEffect(.degrees(30))
                .offset(x: size * 0.10, y: size * 0.045)
            Circle().fill(line)
                .frame(width: size * 0.016, height: size * 0.016)
                .offset(x: size * 0.055, y: size * 0.085)
            // Mittelloch
            Circle().fill(line).frame(width: size * 0.045, height: size * 0.045)
        }
        // kräftiger Außenrand wie auf dem Cover
        .overlay(Circle().stroke(line, lineWidth: 2.5))
        .frame(width: size, height: size)
        .rotationEffect(.degrees(angle))
        .background {
            // Sichel-Schatten unten rechts (nur im hellen Theme sichtbar/sinnvoll)
            if t.colorScheme == .light && t.shadow == .hard {
                Circle()
                    .fill(line)
                    .offset(x: size * 0.03, y: size * 0.045)
            }
        }
    }
}

/// Tanzende Equalizer-Balken.
struct WaveformView: View {
    @EnvironmentObject private var themeStore: ThemeStore
    var playing: Bool
    private let heights: [CGFloat] = [16, 30, 22, 40, 26, 36, 14]

    var body: some View {
        let t = themeStore.theme
        HStack(spacing: 5) {
            ForEach(heights.indices, id: \.self) { i in
                Capsule()
                    .fill(t.ctaStyle)
                    .frame(width: 5, height: playing ? heights[i] : 8)
                    .animation(
                        playing
                            ? .easeInOut(duration: 0.45).repeatForever().delay(Double(i) * 0.07)
                            : .easeOut(duration: 0.3),
                        value: playing
                    )
            }
        }
        .frame(height: 44)
    }
}

/// Konfetti in Theme-Farben.
struct ConfettiView: View {
    @EnvironmentObject private var themeStore: ThemeStore
    @State private var start: Date = .now

    var body: some View {
        let t = themeStore.theme
        let colors = [t.accent, t.highlight, t.good, t.text]
        TimelineView(.animation) { timeline in
            Canvas { ctx, size in
                let time = timeline.date.timeIntervalSince(start)
                for i in 0..<80 {
                    let fi = Double(i)
                    let x = (fi * 47.3).truncatingRemainder(dividingBy: size.width)
                    let speed = 130.0 + (fi * 17).truncatingRemainder(dividingBy: 160)
                    let y = (time * speed + fi * 61).truncatingRemainder(dividingBy: size.height + 40) - 20
                    let rotation = Angle.degrees(time * 200 + fi * 40)
                    let color = colors[i % colors.count]
                    ctx.drawLayer { layer in
                        layer.translateBy(x: x, y: y)
                        layer.rotate(by: rotation)
                        layer.fill(
                            Path(CGRect(x: -4, y: -2.5, width: 8, height: 5)),
                            with: .color(color)
                        )
                    }
                }
            }
        }
        .allowsHitTesting(false)
        .ignoresSafeArea()
    }
}
