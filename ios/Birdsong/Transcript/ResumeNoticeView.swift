import UIKit

/// A pending quota retry, with an action to cancel it before it runs.
final class ResumeNoticeView: UIView {
    var onCancel: (() -> Void)?
    var message: String? {
        didSet {
            label.text = message
            isHidden = message == nil
        }
    }

    private let label = UILabel()

    override init(frame: CGRect) {
        super.init(frame: frame)
        isHidden = true
        label.font = .preferredFont(forTextStyle: .footnote)
        label.adjustsFontForContentSizeCategory = true
        label.textColor = .secondaryLabel
        label.numberOfLines = 0

        var config = UIButton.Configuration.plain()
        config.title = "Cancel"
        let cancel = UIButton(configuration: config, primaryAction: UIAction { [weak self] _ in self?.onCancel?() })
        cancel.accessibilityLabel = "Cancel automatic continuation"
        cancel.setContentHuggingPriority(.required, for: .horizontal)
        cancel.setContentCompressionResistancePriority(.required, for: .horizontal)
        let row = UIStackView(arrangedSubviews: [label, cancel])
        row.alignment = .center
        row.spacing = 8
        row.translatesAutoresizingMaskIntoConstraints = false
        addSubview(row)
        NSLayoutConstraint.activate([
            row.topAnchor.constraint(equalTo: topAnchor),
            row.leadingAnchor.constraint(equalTo: leadingAnchor),
            row.trailingAnchor.constraint(equalTo: trailingAnchor),
            row.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }
}
