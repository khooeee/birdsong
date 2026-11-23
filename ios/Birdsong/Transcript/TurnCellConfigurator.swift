import UIKit

/// Each turn is two rows: the prompt in a rounded box, then the reply (or what the agent is doing).
@MainActor
enum TurnCellConfigurator {
    static func configurePrompt(_ cell: UICollectionViewListCell, with turn: RemoteTurn) {
        var content = UIListContentConfiguration.cell()
        content.text = turn.user
        content.secondaryText = turn.queued == true ? "Queued" : nil
        content.secondaryTextProperties.color = .secondaryLabel
        content.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 16, leading: 24, bottom: 16, trailing: 24)
        cell.contentConfiguration = content

        var background = UIBackgroundConfiguration.listCell()
        background.backgroundColor = UIColor(resource: .userMessage)
        background.cornerRadius = 16
        background.backgroundInsets = NSDirectionalEdgeInsets(top: 6, leading: 12, bottom: 6, trailing: 12)
        cell.backgroundConfiguration = background
    }

    /// What Copy puts on the pasteboard.
    static func copyText(_ turn: RemoteTurn, isReply: Bool) -> String? {
        isReply ? turn.assistant : turn.user
    }
}
