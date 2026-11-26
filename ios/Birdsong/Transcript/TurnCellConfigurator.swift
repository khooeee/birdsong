import UIKit

/// Each turn is two rows: the prompt (see `TranscriptPromptCell`), then the reply (see `TranscriptReplyCell`).
@MainActor
enum TurnCellConfigurator {
    /// What Copy puts on the pasteboard.
    static func copyText(_ turn: RemoteTurn, isReply: Bool) -> String? {
        isReply ? turn.assistant : turn.user
    }
}
