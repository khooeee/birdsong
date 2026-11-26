import UIKit

/// Opens Turn Details: "Turn Details ›" under a reply, just the chevron beside a prompt.
final class TurnDetailsButton: UIButton {
    init(showsTitle: Bool, onTap: @escaping () -> Void) {
        super.init(frame: .zero)
        var config = UIButton.Configuration.plain()
        config.title = showsTitle ? "Turn Details" : nil
        config.image = UIImage(systemName: "chevron.right")
        config.imagePlacement = .trailing
        config.imagePadding = 4
        config.preferredSymbolConfigurationForImage = UIImage.SymbolConfiguration(textStyle: showsTitle ? .caption2 : .footnote)
            .applying(UIImage.SymbolConfiguration(weight: .semibold))
        config.baseForegroundColor = .secondaryLabel
        config.contentInsets = NSDirectionalEdgeInsets(top: 10, leading: showsTitle ? 0 : 10, bottom: 10, trailing: 10)
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { attributes in
            var attributes = attributes
            attributes.font = .preferredFont(forTextStyle: .footnote)
            return attributes
        }
        configuration = config
        contentHorizontalAlignment = showsTitle ? .leading : .center
        accessibilityLabel = "Turn Details"
        addAction(UIAction { _ in onTap() }, for: .primaryActionTriggered)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }
}
