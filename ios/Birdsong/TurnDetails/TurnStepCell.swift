import UIKit

/// One step in Turn Details: what it is, its state and time, then its text.
final class TurnStepCell: UICollectionViewListCell {
    private let roleLabel = UILabel()
    private let statusLabel = UILabel()
    private let timeLabel = UILabel()
    private let textView = SelectableTextView()
    private let noteLabel = UILabel()

    override init(frame: CGRect) {
        super.init(frame: frame)
        for label in [roleLabel, statusLabel, timeLabel, noteLabel] {
            label.font = .preferredFont(forTextStyle: .caption1)
            label.adjustsFontForContentSizeCategory = true
            label.textColor = .secondaryLabel
        }
        roleLabel.font = UIFontMetrics(forTextStyle: .caption1).scaledFont(for: .systemFont(ofSize: 12, weight: .semibold))
        noteLabel.font = .preferredFont(forTextStyle: .footnote)
        noteLabel.numberOfLines = 0
        timeLabel.setContentCompressionResistancePriority(.required, for: .horizontal)

        let header = UIStackView(arrangedSubviews: [roleLabel, statusLabel, UIView(), timeLabel])
        header.spacing = 8
        header.alignment = .firstBaseline
        let stack = UIStackView(arrangedSubviews: [header, textView, noteLabel])
        stack.axis = .vertical
        stack.spacing = 4
        stack.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(stack)
        contentView.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 12, leading: 24, bottom: 12, trailing: 24)
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

    func configure(with item: RemoteTurnItem) {
        roleLabel.text = item.role.capitalized
        statusLabel.text = item.queued == true ? "Queued" : item.status?.replacingOccurrences(of: "_", with: " ")
        statusLabel.textColor = item.status == "failed" ? .systemRed : .secondaryLabel
        let date = Date(timeIntervalSince1970: item.at / 1000)
        let isToday = Calendar.current.isDateInToday(date)
        timeLabel.text = date.formatted(date: isToday ? .omitted : .abbreviated, time: .shortened)

        textView.attributedText = TurnStepText.attributed(item)
        textView.isHidden = item.text.isEmpty
        let images = item.images.map { $0 == 1 ? "1 image, on your Mac" : "\($0) images, on your Mac" }
        noteLabel.text = [item.task, images].compactMap { $0 }.joined(separator: "\n")
        noteLabel.isHidden = noteLabel.text?.isEmpty != false

        var background = UIBackgroundConfiguration.listCell()
        background.backgroundColor = item.role == "user" ? UIColor(resource: .userMessage) : .clear
        background.cornerRadius = 16
        background.backgroundInsets = NSDirectionalEdgeInsets(top: 4, leading: 12, bottom: 4, trailing: 12)
        backgroundConfiguration = background
    }
}
