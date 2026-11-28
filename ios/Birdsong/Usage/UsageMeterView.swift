import UIKit

/// One limit: its label and percent, a bar filled to the used share, then its reset or detail.
final class UsageMeterView: UIStackView {
    init(meter: UsageMeter, now: Date) {
        super.init(frame: .zero)
        axis = .vertical
        spacing = 4

        let label = Self.label(meter.label, style: .subheadline, color: .label)
        let header = UIStackView(arrangedSubviews: [label])
        header.spacing = 8
        if let used = meter.usedPercent {
            let percent = Self.label("\(Int(used.rounded()))%", style: .subheadline, color: .label)
            percent.setContentHuggingPriority(.required, for: .horizontal)
            header.addArrangedSubview(percent)
        }
        addArrangedSubview(header)

        if let used = meter.usedPercent {
            let bar = UIProgressView(progressViewStyle: .default)
            bar.progress = Float(min(100, max(0, used)) / 100)
            bar.progressTintColor = used >= 90 ? .systemRed : .tintColor
            bar.accessibilityLabel = meter.label
            bar.accessibilityValue = "\(Int(used.rounded())) percent used"
            addArrangedSubview(bar)
        }

        let extra = [meter.detail, UsageResetText.text(resetsAt: meter.resetsAt, now: now)].compactMap { $0 }
        if !extra.isEmpty {
            addArrangedSubview(Self.label(extra.joined(separator: " · "), style: .footnote, color: .secondaryLabel))
        }
    }

    @available(*, unavailable)
    required init(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    static func label(_ text: String, style: UIFont.TextStyle, color: UIColor) -> UILabel {
        let label = UILabel()
        label.text = text
        label.numberOfLines = 0
        label.font = .preferredFont(forTextStyle: style)
        label.adjustsFontForContentSizeCategory = true
        label.textColor = color
        return label
    }
}
