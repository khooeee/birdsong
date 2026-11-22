import UIKit

/// The Sessions toolbar's quota summary: each agent's percent, coloured by how close it is; tap for reset times.
final class QuotaBarButtonItem: UIBarButtonItem {
    private let button = UIButton(configuration: .plain())

    override init() {
        super.init()
        button.showsMenuAsPrimaryAction = true
        customView = button
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    func update(_ quotas: [AgentQuota]) {
        var title = AttributedString()
        for (index, quota) in quotas.enumerated() {
            if index > 0 {
                var separator = AttributedString(" · ")
                separator.foregroundColor = .secondaryLabel
                title += separator
            }
            var part = AttributedString("\(quota.name) \(quota.percentText)")
            part.foregroundColor = Self.color(for: quota)
            title += part
        }
        title.font = .preferredFont(forTextStyle: .footnote)
        button.configuration?.attributedTitle = title
        button.menu = UIMenu(title: "Usage limits", children: quotas.map { quota in
            let subtitle = [quota.resetText, quota.error].compactMap(\.self).joined(separator: "\n")
            return UIAction(
                title: "\(quota.name) · \(quota.percentText) of \(quota.window)",
                subtitle: subtitle.isEmpty ? nil : subtitle
            ) { _ in }
        })
    }

    /// Amber from 80%, red once used up, dimmed when the latest refresh failed.
    private static func color(for quota: AgentQuota) -> UIColor {
        if quota.error != nil { return .secondaryLabel }
        if quota.usedPercent >= 100 { return .systemRed }
        if quota.usedPercent >= 80 { return .systemOrange }
        return .label
    }
}
