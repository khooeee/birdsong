import UIKit

/// A turn's reply (or what the agent is doing), with the Turn Details chevron at the bottom right, as on the desktop.
final class TranscriptReplyCell: UICollectionViewListCell {
    var onDetails: (() -> Void)?

    private let replyView = SelectableTextView()
    private let statusLabel = UILabel()
    private lazy var detailsButton = TurnDetailsButton { [weak self] in self?.onDetails?() }

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundConfiguration = .clear()

        statusLabel.numberOfLines = 0
        statusLabel.textColor = .secondaryLabel
        statusLabel.adjustsFontForContentSizeCategory = true

        let actions = UIStackView(arrangedSubviews: [UIView(), detailsButton])
        // In from the edge, clear of the scroll indicator, and lined up with the prompt.
        actions.isLayoutMarginsRelativeArrangement = true
        actions.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 12)
        let stack = UIStackView(arrangedSubviews: [replyView, statusLabel, actions])
        stack.axis = .vertical
        stack.spacing = 3
        stack.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(stack)
        contentView.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 8, leading: 24, bottom: 8, trailing: 24)
        let margins = contentView.layoutMarginsGuide
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: margins.topAnchor),
            stack.leadingAnchor.constraint(equalTo: margins.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: margins.trailingAnchor),
            stack.bottomAnchor.constraint(equalTo: margins.bottomAnchor),
        ])
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    func configure(with turn: RemoteTurn) {
        let reply = turn.assistant.flatMap { $0.isEmpty ? nil : MarkdownText.attributed($0) }
        replyView.attributedText = reply
        replyView.isHidden = reply == nil

        let running = turn.status == .running
        statusLabel.font = .preferredFont(forTextStyle: reply == nil ? .body : .subheadline)
        if reply != nil {
            statusLabel.text = running ? turn.activity : nil
        } else {
            statusLabel.text = running ? turn.activity ?? "Working…" : turn.status == .stopped ? "Stopped" : "No reply"
        }
        statusLabel.isHidden = statusLabel.text == nil
    }
}
