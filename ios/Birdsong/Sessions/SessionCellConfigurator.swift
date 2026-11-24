import UIKit

/// A rail row with activity, pending continuation, or error details.
@MainActor
enum SessionCellConfigurator {
    static func configure(_ cell: UICollectionViewListCell, with session: Session, unread: Bool = false) {
        var content = cell.defaultContentConfiguration()
        content.text = session.title
        content.textProperties.numberOfLines = 3
        if let notice = session.continuationNotice {
            content.secondaryText = notice
            content.secondaryTextProperties.color = .secondaryLabel
            content.secondaryTextProperties.numberOfLines = 0
        } else if session.status == .error, let error = session.error {
            content.secondaryText = error
            content.secondaryTextProperties.color = .systemRed
            content.secondaryTextProperties.numberOfLines = 2
        }
        cell.contentConfiguration = content
        cell.accessories = [statusAccessory(session.status, unread: unread), .disclosureIndicator()].compactMap(\.self)
    }

    private static func statusAccessory(_ status: Session.Status, unread: Bool) -> UICellAccessory? {
        switch status {
        case .running, .connecting:
            let spinner = UIActivityIndicatorView(style: .medium)
            spinner.startAnimating()
            return .customView(configuration: .init(customView: spinner, placement: .trailing()))
        case .error:
            let icon = UIImageView(image: UIImage(systemName: "exclamationmark.triangle.fill"))
            icon.tintColor = .systemRed
            return .customView(configuration: .init(customView: icon, placement: .trailing()))
        case .idle, .ready:
            return unread ? unreadAccessory() : nil
        }
    }

    /// The desktop rail's green dot for a session with a new unread reply.
    private static func unreadAccessory() -> UICellAccessory {
        let dot = UIView()
        dot.backgroundColor = UIColor(red: 158.0 / 255.0, green: 212.0 / 255.0, blue: 176.0 / 255.0, alpha: 1)
        dot.layer.cornerRadius = 5
        dot.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            dot.widthAnchor.constraint(equalToConstant: 10),
            dot.heightAnchor.constraint(equalToConstant: 10),
        ])
        dot.isAccessibilityElement = true
        dot.accessibilityLabel = "Unread messages"
        return .customView(configuration: .init(customView: dot, placement: .trailing()))
    }
}
