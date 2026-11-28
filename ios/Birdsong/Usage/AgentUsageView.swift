import UIKit

/// One agent in the Usage sheet: its limits, notes and errors, or a link to its usage page.
final class AgentUsageView: UIStackView {
    init(name: String, usage: AgentUsage?, now: Date) {
        super.init(frame: .zero)
        axis = .vertical
        spacing = 10
        isLayoutMarginsRelativeArrangement = true
        directionalLayoutMargins = NSDirectionalEdgeInsets(top: 14, leading: 16, bottom: 14, trailing: 16)
        backgroundColor = .secondarySystemGroupedBackground
        layer.cornerRadius = 10

        let title = UsageMeterView.label(name, style: .headline, color: .label)
        let header = UIStackView(arrangedSubviews: [title])
        header.spacing = 8
        if let plan = usage?.plan {
            let planLabel = UsageMeterView.label(plan, style: .subheadline, color: .secondaryLabel)
            planLabel.setContentHuggingPriority(.required, for: .horizontal)
            header.addArrangedSubview(planLabel)
        }
        addArrangedSubview(header)

        guard let usage else {
            addArrangedSubview(UsageMeterView.label("Reading…", style: .subheadline, color: .secondaryLabel))
            return
        }
        if let error = usage.error {
            addArrangedSubview(UsageMeterView.label(error, style: .subheadline, color: .systemRed))
        }
        for meter in usage.meters {
            addArrangedSubview(UsageMeterView(meter: meter, now: now))
        }
        for note in usage.notes {
            addArrangedSubview(UsageMeterView.label(note, style: .footnote, color: .secondaryLabel))
        }
        if let page = usage.page {
            addArrangedSubview(Self.linkButton(page.url))
            if let hint = page.hint {
                addArrangedSubview(UsageMeterView.label(hint, style: .footnote, color: .secondaryLabel))
            }
        }
    }

    @available(*, unavailable)
    required init(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    private static func linkButton(_ url: URL) -> UIButton {
        var config = UIButton.Configuration.plain()
        config.title = url.absoluteString.replacingOccurrences(of: "https://", with: "")
        config.image = UIImage(systemName: "arrow.up.right.square")
        config.imagePlacement = .trailing
        config.imagePadding = 4
        config.contentInsets = .zero
        let button = UIButton(configuration: config, primaryAction: UIAction { _ in UIApplication.shared.open(url) })
        button.contentHorizontalAlignment = .leading
        return button
    }
}
