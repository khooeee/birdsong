import UIKit

/// A turn's prompt, in a rounded box, with the Turn Details chevron at the bottom right.
final class TranscriptPromptCell: UICollectionViewListCell {
    var onDetails: (() -> Void)?

    private let promptLabel = UILabel()
    private let queuedLabel = UILabel()
    private lazy var detailsButton = TurnDetailsButton { [weak self] in self?.onDetails?() }

    override init(frame: CGRect) {
        super.init(frame: frame)

        promptLabel.numberOfLines = 0
        promptLabel.font = .preferredFont(forTextStyle: .body)
        promptLabel.adjustsFontForContentSizeCategory = true

        queuedLabel.font = .preferredFont(forTextStyle: .subheadline)
        queuedLabel.textColor = .secondaryLabel
        queuedLabel.adjustsFontForContentSizeCategory = true
        queuedLabel.text = "Queued"

        let actions = UIStackView(arrangedSubviews: [UIView(), detailsButton])
        // In from the edge, clear of the scroll indicator, and lined up with the reply.
        actions.isLayoutMarginsRelativeArrangement = true
        actions.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 4)
        let stack = UIStackView(arrangedSubviews: [promptLabel, queuedLabel, actions])
        stack.axis = .vertical
        stack.spacing = 3
        stack.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(stack)
        contentView.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 16, leading: 24, bottom: 8, trailing: 24)
        let margins = contentView.layoutMarginsGuide
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: margins.topAnchor),
            stack.leadingAnchor.constraint(equalTo: margins.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: margins.trailingAnchor),
            stack.bottomAnchor.constraint(equalTo: margins.bottomAnchor),
        ])

        var background = UIBackgroundConfiguration.listCell()
        background.backgroundColor = UIColor(resource: .userMessage)
        background.cornerRadius = 16
        background.backgroundInsets = NSDirectionalEdgeInsets(top: 6, leading: 12, bottom: 6, trailing: 12)
        backgroundConfiguration = background
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    func configure(with turn: RemoteTurn) {
        promptLabel.text = turn.user
        queuedLabel.isHidden = turn.queued != true
    }
}
