import UIKit

/// A step's text: markdown for messages and thoughts, monospace for tool calls.
enum TurnStepText {
    static func attributed(_ item: RemoteTurnItem) -> NSAttributedString {
        switch item.role {
        case "user", "assistant":
            return MarkdownText.attributed(item.text)
        case "thought":
            let text = NSMutableAttributedString(attributedString: MarkdownText.attributed(item.text))
            let whole = NSRange(location: 0, length: text.length)
            text.addAttribute(.foregroundColor, value: UIColor.secondaryLabel, range: whole)
            return text
        case "tool":
            let size = UIFont.preferredFont(forTextStyle: .footnote).pointSize
            return NSAttributedString(string: item.text, attributes: [
                .font: UIFont.monospacedSystemFont(ofSize: size, weight: .regular),
                .foregroundColor: UIColor.label,
            ])
        default:
            return NSAttributedString(string: item.text, attributes: [
                .font: UIFont.preferredFont(forTextStyle: .body),
                .foregroundColor: UIColor.label,
            ])
        }
    }
}
