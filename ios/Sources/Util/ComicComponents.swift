// Eigenständige Bausteine für die Comic-Themes (Tusche-Comic-Referenz).
// Bewusst komplett getrennt von den übrigen Theme-Komponenten:
// Pinselstrich-Platte, Panel-Rahmen, Noten-Himmel, doppelt gezogene Linien.
import SwiftUI

/// Gewelltes Reflex-Band entlang einer (ggf. perspektivischen) Ellipse —
/// die Pinsel-Lichtkeile der Referenz. Enden laufen spitz zu.
private func wavyBand(
    center: CGPoint, rx: CGFloat, ry: CGFloat,
    from a0: Double, to a1: Double,
    rMid: Double, thickness: Double,
    waves: Double, amp: Double, phase: Double
) -> Path {
    var p = Path()
    let steps = 30

    func point(_ i: Int, outer: Bool) -> CGPoint {
        let tt = Double(i) / Double(steps)
        let theta = a0 + (a1 - a0) * tt
        let taper = 0.25 + 0.75 * sin(.pi * tt)
        let edgePhase = outer ? phase : phase + 1.3
        let half = thickness * taper / 2
        let r = rMid + amp * sin(waves * theta + edgePhase) + (outer ? half : -half)
        return CGPoint(
            x: center.x + rx * CGFloat(r * cos(theta)),
            y: center.y + ry * CGFloat(r * sin(theta))
        )
    }

    p.move(to: point(0, outer: true))
    for i in 1...steps { p.addLine(to: point(i, outer: true)) }
    for i in (0...steps).reversed() { p.addLine(to: point(i, outer: false)) }
    p.closeSubpath()
    return p
}

/// Die Comic-Platte: schwarze Scheibe mit weißen Glanzbändern, unterbrochenen
/// Pinsel-Rillen und der Palmen-Insel als Label. Invertiert sich im Nacht-Theme
/// automatisch über die Theme-Farben (Tusche = text, Papier = background).
struct ComicDisc: View {
    let t: AppTheme
    let size: CGFloat

    var body: some View {
        let ink = t.text
        let paper = t.background
        ZStack {
            // Scheibe mit gebrochenen Pinsel-Reflexbögen, per Canvas gezeichnet
            Canvas { ctx, sz in
                let c = CGPoint(x: sz.width / 2, y: sz.height / 2)
                let R = min(sz.width, sz.height) / 2

                // schwarze Scheibe (leicht kleiner, damit die doppelte
                // Außenkontur mit weißem Spalt Platz hat)
                let discR = R * 0.95
                ctx.fill(
                    Path(ellipseIn: CGRect(x: c.x - discR, y: c.y - discR, width: discR * 2, height: discR * 2)),
                    with: .color(ink)
                )

                // Lichtreflexe: vier Sektoren (X-Muster) aus gewellten,
                // gefüllten Keilflächen — wie Pinselstriche
                let sectorMids: [Double] = [0.70, 2.30, 3.85, 5.45]
                for (si, mid) in sectorMids.enumerated() {
                    let spread = 0.60 + 0.12 * sin(Double(si) * 2.1)
                    for (bi, rMid) in [0.52, 0.67, 0.82].enumerated() {
                        let band = wavyBand(
                            center: c, rx: discR, ry: discR,
                            from: mid - spread, to: mid + spread,
                            rMid: rMid, thickness: 0.105,
                            waves: 10 + Double(bi) * 2, amp: 0.022,
                            phase: Double(si) * 1.7 + Double(bi) * 0.9
                        )
                        ctx.fill(band, with: .color(paper))
                    }
                }

                // doppelte Außenkontur mit weißem Spalt
                let outer = Path(ellipseIn: CGRect(x: c.x - R + 1, y: c.y - R + 1, width: (R - 1) * 2, height: (R - 1) * 2))
                ctx.stroke(outer, with: .color(ink), style: StrokeStyle(lineWidth: 1.6))
            }

            // Label-Insel mit Palme
            Circle()
                .fill(paper)
                .frame(width: size * 0.40, height: size * 0.40)
                .overlay(Circle().stroke(ink, lineWidth: 1.8))
            PalmShape()
                .fill(ink)
                .frame(width: size * 0.30, height: size * 0.30)
                .offset(y: -size * 0.015)
        }
    }
}

/// Tusche-Palme als gezeichneter Pfad: geschwungener Stamm, hängende Wedel,
/// kleine Insel-Basis.
struct PalmShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        let w = rect.width
        let h = rect.height
        let crown = CGPoint(x: rect.minX + w * 0.52, y: rect.minY + h * 0.24)

        // Stamm: lang, geschwungen, nach oben verjüngend
        p.move(to: CGPoint(x: rect.minX + w * 0.43, y: rect.minY + h * 0.97))
        p.addQuadCurve(
            to: CGPoint(x: crown.x - w * 0.02, y: crown.y),
            control: CGPoint(x: rect.minX + w * 0.37, y: rect.minY + h * 0.55)
        )
        p.addLine(to: CGPoint(x: crown.x + w * 0.02, y: crown.y))
        p.addQuadCurve(
            to: CGPoint(x: rect.minX + w * 0.53, y: rect.minY + h * 0.97),
            control: CGPoint(x: rect.minX + w * 0.46, y: rect.minY + h * 0.55)
        )
        p.closeSubpath()

        // Wedel: gebogene Blattzungen aus der Kronenspitze, leicht hängend
        let fronds: [(angle: Double, len: Double)] = [
            (-168, 0.40), (-128, 0.46), (-88, 0.44), (-48, 0.46), (-8, 0.40),
        ]
        for frond in fronds {
            let a = frond.angle * .pi / 180
            var tip = CGPoint(
                x: crown.x + cos(a) * w * frond.len,
                y: crown.y + sin(a) * w * frond.len
            )
            tip.y += h * 0.10 // Schwerkraft: Spitzen hängen
            let c1 = CGPoint(
                x: crown.x + cos(a - 0.45) * w * frond.len * 0.62,
                y: crown.y + sin(a - 0.45) * w * frond.len * 0.62
            )
            let c2 = CGPoint(
                x: crown.x + cos(a + 0.38) * w * frond.len * 0.62,
                y: crown.y + sin(a + 0.38) * w * frond.len * 0.62
            )
            p.move(to: crown)
            p.addQuadCurve(to: tip, control: c1)
            p.addQuadCurve(to: crown, control: c2)
            p.closeSubpath()
        }

        // Insel-Basis: zwei flache Kleckse am Stammfuß
        p.addEllipse(in: CGRect(
            x: rect.minX + w * 0.28, y: rect.minY + h * 0.93,
            width: w * 0.26, height: h * 0.055
        ))
        p.addEllipse(in: CGRect(
            x: rect.minX + w * 0.58, y: rect.minY + h * 0.945,
            width: w * 0.10, height: h * 0.04
        ))

        return p
    }
}

/// Sitzende Figur (Silhouette) — lehnt mit dem Rücken am Palmenstamm,
/// Beine nach rechts ausgestreckt.
struct SittingPersonShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        let w = rect.width
        let h = rect.height
        let x0 = rect.minX
        let y0 = rect.minY

        // Kopf
        p.addEllipse(in: CGRect(x: x0 + w * 0.18, y: y0, width: w * 0.34, height: h * 0.32))

        // Rumpf: leicht zurückgelehnt
        p.move(to: CGPoint(x: x0 + w * 0.16, y: y0 + h * 0.28))
        p.addQuadCurve(
            to: CGPoint(x: x0 + w * 0.06, y: y0 + h * 0.80),
            control: CGPoint(x: x0 + w * 0.00, y: y0 + h * 0.52)
        )
        p.addLine(to: CGPoint(x: x0 + w * 0.46, y: y0 + h * 0.84))
        p.addQuadCurve(
            to: CGPoint(x: x0 + w * 0.50, y: y0 + h * 0.30),
            control: CGPoint(x: x0 + w * 0.50, y: y0 + h * 0.55)
        )
        p.closeSubpath()

        // Beine: Oberschenkel nach rechts, Unterschenkel angewinkelt
        p.move(to: CGPoint(x: x0 + w * 0.30, y: y0 + h * 0.76))
        p.addLine(to: CGPoint(x: x0 + w * 0.92, y: y0 + h * 0.80))
        p.addLine(to: CGPoint(x: x0 + w * 1.00, y: y0 + h * 0.97))
        p.addLine(to: CGPoint(x: x0 + w * 0.86, y: y0 + h * 1.00))
        p.addLine(to: CGPoint(x: x0 + w * 0.78, y: y0 + h * 0.90))
        p.addLine(to: CGPoint(x: x0 + w * 0.24, y: y0 + h * 0.90))
        p.closeSubpath()

        return p
    }
}

/// Die große Comic-Illustration für den Startbildschirm: Schallplatte in
/// Perspektive als Insel im Weiß, Palme mit sitzender Person auf dem Label,
/// gewellte Reflex-Keile, gepunktete Spur — das untere Panel der Referenz.
struct ComicHeroIllustration: View {
    let t: AppTheme

    var body: some View {
        let ink = t.text
        let paper = t.background
        Canvas { ctx, sz in
            let cx = sz.width / 2
            let cy = sz.height * 0.66
            let rx = sz.width * 0.46
            let ry = rx * 0.36
            let center = CGPoint(x: cx, y: cy)

            // Platte (perspektivische Ellipse)
            ctx.fill(
                Path(ellipseIn: CGRect(x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2)),
                with: .color(ink)
            )

            // Reflex-Keile in vier Sektoren
            let mids: [Double] = [0.65, 2.30, 3.85, 5.50]
            for (si, mid) in mids.enumerated() {
                let spread = 0.58 + 0.13 * sin(Double(si) * 2.1)
                for (bi, rMid) in [0.50, 0.66, 0.82].enumerated() {
                    let band = wavyBand(
                        center: center, rx: rx, ry: ry,
                        from: mid - spread, to: mid + spread,
                        rMid: rMid, thickness: 0.11,
                        waves: 10 + Double(bi) * 2, amp: 0.026,
                        phase: Double(si) * 1.7 + Double(bi) * 0.9
                    )
                    ctx.fill(band, with: .color(paper))
                }
            }

            // Rand: feiner heller Spalt + doppelte Außenkontur
            let rimRect = CGRect(x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2)
            ctx.stroke(
                Path(ellipseIn: rimRect.insetBy(dx: 3.5, dy: 1.6)),
                with: .color(paper), style: StrokeStyle(lineWidth: 1.5)
            )
            ctx.stroke(
                Path(ellipseIn: rimRect),
                with: .color(ink), style: StrokeStyle(lineWidth: 1.8)
            )
            ctx.stroke(
                Path(ellipseIn: rimRect.insetBy(dx: -2.5, dy: -1.2)),
                with: .color(ink.opacity(0.5)), style: StrokeStyle(lineWidth: 1)
            )

            // Label-Insel — großzügig, damit Palme und Person Platz haben
            let lrx = rx * 0.44
            let lry = ry * 0.44
            let labelRect = CGRect(x: cx - lrx, y: cy - lry, width: lrx * 2, height: lry * 2)
            ctx.fill(Path(ellipseIn: labelRect), with: .color(paper))
            ctx.stroke(Path(ellipseIn: labelRect), with: .color(ink), style: StrokeStyle(lineWidth: 1.4))

            // gepunktete Spur über das Label (wie Fußspuren zur Palme)
            for i in 0..<5 {
                let fi = CGFloat(i)
                let dot = CGRect(
                    x: cx - lrx * 0.85 + fi * lrx * 0.26,
                    y: cy + lry * 0.55 - fi * lry * 0.26,
                    width: 2.8, height: 2.0
                )
                ctx.fill(Path(ellipseIn: dot), with: .color(ink))
            }

            // Palme: steht links auf dem Label, ragt über die Platte hinaus
            let palmH = sz.height * 0.44
            let palmBaseX = cx - lrx * 0.22
            let palmRect = CGRect(
                x: palmBaseX - palmH * 0.48,
                y: cy - palmH * 0.95,
                width: palmH, height: palmH
            )
            ctx.fill(PalmShape().path(in: palmRect), with: .color(ink))

            // sitzende Person rechts vom Stamm, klar abgesetzt
            let ph = palmH * 0.26
            let personRect = CGRect(
                x: palmBaseX + palmH * 0.10,
                y: cy + lry * 0.05 - ph,
                width: ph, height: ph
            )
            ctx.fill(SittingPersonShape().path(in: personRect), with: .color(ink))
        }
        .overlay(alignment: .topTrailing) {
            // Noten im Himmel über der Insel
            HStack(spacing: 7) {
                Image(systemName: "music.note")
                    .font(.system(size: 11, weight: .bold))
                    .rotationEffect(.degrees(-8))
                Image(systemName: "music.note")
                    .font(.system(size: 14, weight: .bold))
                    .offset(y: -7)
                    .rotationEffect(.degrees(6))
            }
            .foregroundStyle(ink)
            .padding(.trailing, 36)
            .padding(.top, 2)
        }
    }
}

/// Hintergrund-Dekoration: Panel-Rahmen um den Screen, verstreute Musiknoten
/// und kleine Strich-Gruppen wie in der Referenz.
struct ComicNotesDecoration: View {
    let t: AppTheme

    var body: some View {
        let ink = t.decorationColors.first ?? t.text
        ZStack {
            // Panel-Rahmen
            RoundedRectangle(cornerRadius: 3)
                .stroke(ink, lineWidth: 2)
                .padding(12)

            // verstreute Noten im "Himmel"
            note(ink, size: 17).offset(x: -115, y: -310).rotationEffect(.degrees(-14))
            note(ink, size: 12).offset(x: -85, y: -280).rotationEffect(.degrees(10))
            note(ink, size: 15).offset(x: 120, y: -330).rotationEffect(.degrees(8))
            note(ink, size: 11).offset(x: 150, y: -290).rotationEffect(.degrees(-6))
            note(ink, size: 13).offset(x: 155, y: 150).rotationEffect(.degrees(12))
            note(ink, size: 12).offset(x: -150, y: 250).rotationEffect(.degrees(-10))
            note(ink, size: 14).offset(x: 90, y: 340).rotationEffect(.degrees(6))

            // Strich-Gruppen (Gras-Ticks)
            tickGroup(ink).offset(x: -150, y: -200)
            tickGroup(ink).offset(x: 140, y: -120).rotationEffect(.degrees(6))
            tickGroup(ink).offset(x: -120, y: 330).rotationEffect(.degrees(-8))
        }
    }

    private func note(_ ink: Color, size: CGFloat) -> some View {
        Image(systemName: "music.note")
            .font(.system(size: size, weight: .bold))
            .foregroundStyle(ink.opacity(0.85))
    }

    private func tickGroup(_ ink: Color) -> some View {
        HStack(spacing: 4) {
            ForEach(0..<3, id: \.self) { i in
                RoundedRectangle(cornerRadius: 1)
                    .fill(ink.opacity(0.8))
                    .frame(width: 2, height: 9)
                    .rotationEffect(.degrees(Double(i - 1) * 9))
            }
        }
    }
}

/// Karten als Comic-Panels: weiße Fläche, kräftige Kontur plus zweite,
/// leicht versetzte Linie — wie mit der Hand doppelt nachgezogen.
struct ComicPanelBackground: View {
    let t: AppTheme
    var cornerRadius: CGFloat

    var body: some View {
        let radius = min(cornerRadius, 8)
        RoundedRectangle(cornerRadius: radius, style: .continuous)
            .fill(t.background)
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .stroke(t.text, lineWidth: 2.2)
            )
            .overlay(
                RoundedRectangle(cornerRadius: radius + 3, style: .continuous)
                    .stroke(t.text.opacity(0.45), lineWidth: 1)
                    .padding(-3.5)
            )
    }
}
