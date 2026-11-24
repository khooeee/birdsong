import UIKit

/// A rail row with activity, unread, pending continuation, or error details.
@MainActor
enum SessionCellConfigurator {
    static func configure(_ cell: UICollectionViewListCell, with session: Session) {
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
        let accessories = [unreadAccessory(session), statusAccessory(session.status), .disclosureIndicator()]
        cell.accessories = accessories.compactMap(\.self)
        cell.accessibilityValue = session.unread == true ? "Unread" : nil
    }

    /// The spinner takes the dot's place while the agent works.
    private static func unreadAccessory(_ session: Session) -> UICellAccessory? {
        guard session.unread == true, session.status != .running, session.status != .connecting else { return nil }
        return .customView(configuration: .init(customView: UnreadDotView(), placement: .trailing()))
    }

    private static func statusAccessory(_ status: Session.Status) -> UICellAccessory? {
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
            return nil
        }
    }
}
