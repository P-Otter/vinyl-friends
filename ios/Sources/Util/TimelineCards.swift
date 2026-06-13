// Drei wählbare Karten-Optiken für die Timeline (und die Mystery-Karte):
// klassisch, Mini-Platte, Plattenregal-Sleeve. Rein theme-getrieben.
import SwiftUI

struct CardFace: View {
    let style: TimelineCardStyle
    let t: AppTheme
    let yearText: String     // "1991" oder "?"
    let name: String         // Songname bzw. „Dieser Song"
    let accent: Color
    var isMystery: Bool = false
    var size: CGSize = CGSize(width: 92, height: 112)

    var body: some View {
        Group {
            switch style {
            case .classic: classic
            case .vinyl: vinyl
            case .shelf: shelf
            }
        }
        .frame(width: size.width, height: size.height)
    }

    private var titleFont: Font {
        .system(size: 24, weight: t.titleWeight == .light ? .regular : t.titleWeight, design: t.fontDesign)
    }

    // MARK: Klassisch

    private var classic: some View {
        VStack(spacing: 6) {
            if isMystery {
                Image(systemName: "crown.fill")
                    .font(.system(size: 13, weight: .black))
                    .foregroundStyle(t.highlight)
            }
            Text(yearText)
                .font(titleFont)
                .foregroundStyle(isMystery ? t.onAccent : t.text)
            if !isMystery {
                Rectangle().fill(accent).frame(width: 34, height: 3)
            }
            Text(name)
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(isMystery ? t.onAccent.opacity(0.85) : t.textMuted)
                .lineLimit(2)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 6)
        .background(classicBG)
    }

    @ViewBuilder
    private var classicBG: some View {
        if isMystery {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(t.ctaStyle)
                .themedShadow(t, color: t.shadow == .hard ? t.bad : nil)
        } else {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(t.surface)
                .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(t.surfaceStroke, lineWidth: t.strokeWidth))
                .themedShadow(t, color: accent)
        }
    }

    // MARK: Mini-Platte

    private var vinyl: some View {
        let disc = min(size.width, size.height) - 26
        return VStack(spacing: 4) {
            ZStack {
                Circle().fill(t.text)
                ForEach(0..<3, id: \.self) { i in
                    Circle().stroke(t.background.opacity(0.22), lineWidth: 1)
                        .padding(CGFloat(i) * disc * 0.09 + disc * 0.1)
                }
                Circle().fill(accent).frame(width: disc * 0.5, height: disc * 0.5)
                    .overlay(Circle().stroke(t.background.opacity(0.5), lineWidth: 1))
                Text(yearText)
                    .font(.system(size: isMystery ? 22 : 15, weight: .black, design: t.fontDesign))
                    .foregroundStyle(.white)
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
                Circle().fill(t.background).frame(width: 4, height: 4) // Loch
                    .offset(y: disc * 0.16)
            }
            .frame(width: disc, height: disc)
            Text(name)
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(t.textMuted)
                .lineLimit(1)
        }
        .themedShadow(t, color: t.shadow == .hard ? t.text : accent)
    }

    // MARK: Plattenregal-Sleeve

    private var shelf: some View {
        // Plattenrücken: nur das große Jahr, vertikal gelaufen wie auf einem Spine.
        Text(yearText)
            .font(.system(size: 30, weight: t.titleWeight == .light ? .regular : .black, design: t.fontDesign))
            .foregroundStyle(isMystery ? t.onAccent : t.text)
            .lineLimit(1)
            .minimumScaleFactor(0.5)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(.horizontal, 8)
        .background(
            RoundedRectangle(cornerRadius: 5, style: .continuous)
                .fill(isMystery ? AnyShapeStyle(t.ctaStyle) : AnyShapeStyle(t.surface))
                .overlay(
                    RoundedRectangle(cornerRadius: 5, style: .continuous)
                        .stroke(t.surfaceStroke, lineWidth: max(t.strokeWidth, 1.2))
                )
        )
        // Buchrücken links
        .overlay(alignment: .leading) {
            Rectangle().fill(accent).frame(width: 5).padding(.vertical, 4)
        }
        // Platten-Loch oben rechts (deutet die Hülle an)
        .overlay(alignment: .topTrailing) {
            Circle()
                .fill(isMystery ? t.onAccent.opacity(0.5) : accent)
                .frame(width: 8, height: 8)
                .padding(6)
        }
        .themedShadow(t, color: t.shadow == .hard ? t.text : accent)
    }
}
