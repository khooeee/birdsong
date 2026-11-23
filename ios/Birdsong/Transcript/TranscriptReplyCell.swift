import UIKit

final class TranscriptReplyCell: UICollectionViewListCell {
    private let replyView = UITextView()
    private let statusLabel = UILabel()

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundConfiguration = .clear()

        replyView.backgroundColor = .clear
        replyView.isEditable = false
        replyView.isSelectable = true
        replyView.isScrollEnabled = false
        replyView.textContainerInset = .zero
        replyView.textContainer.lineFragmentPadding = 0
        replyView.linkTextAttributes = [
            .foregroundColor: UIColor.link,
            .underlineStyle: NSUnderlineStyle.single.rawValue,
        ]

        statusLabel.numberOfLines = 0
        statusLabel.textColor = .secondaryLabel
        statusLabel.adjustsFontForContentSizeCategory = true

        let stack = UIStackView(arrangedSubviews: [replyView, statusLabel])
        stack.axis = .vertical
        stack.spacing = 3
        stack.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(stack)
        contentView.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 8, leading: 24, bottom: 16, trailing: 24)
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
