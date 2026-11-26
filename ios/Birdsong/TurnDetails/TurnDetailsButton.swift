import UIKit

/// Opens Turn Details: a chevron at the bottom right of a prompt and of a reply, as on the desktop.
final class TurnDetailsButton: UIButton {
    init(onTap: @escaping () -> Void) {
        super.init(frame: .zero)
        var config = UIButton.Configuration.plain()
        config.image = UIImage(systemName: "chevron.right")
        config.preferredSymbolConfigurationForImage = UIImage.SymbolConfiguration(textStyle: .footnote)
            .applying(UIImage.SymbolConfiguration(weight: .semibold))
        config.baseForegroundColor = .secondaryLabel
        config.contentInsets = NSDirectionalEdgeInsets(top: 10, leading: 10, bottom: 10, trailing: 10)
        configuration = config
        setContentHuggingPriority(.required, for: .horizontal)
        accessibilityLabel = "Turn Details"
        addAction(UIAction { _ in onTap() }, for: .primaryActionTriggered)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }
}
