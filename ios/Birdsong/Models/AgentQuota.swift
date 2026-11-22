import Foundation

/// One agent's binding subscription limit, as the desktop reads it.
struct AgentQuota: Decodable, Sendable, Hashable {
    let agent: String
    /// 0–100 of the binding window.
    let usedPercent: Double
    /// Epoch ms; nil until the window starts.
    let resetsAt: Double?
    /// "5-hour", "weekly" or "monthly".
    let window: String
    /// Why the latest refresh failed; the numbers are from the last good one.
    let error: String?

    var name: String {
        switch agent {
        case "claude": "Claude"
        case "codex": "Codex"
        case "cursor": "Cursor"
        default: agent.capitalized
        }
    }

    var percentText: String { "\(Int(usedPercent.rounded()))%" }

    /// "Resets Sun 9:01 PM", with the date once it is more than a week out.
    var resetText: String? {
        guard let resetsAt else { return nil }
        let date = Date(timeIntervalSince1970: resetsAt / 1000)
        let withinWeek = date.timeIntervalSinceNow < 6 * 86_400
        let style: Date.FormatStyle = withinWeek
            ? .dateTime.weekday(.abbreviated).hour().minute()
            : .dateTime.month(.abbreviated).day().hour().minute()
        return "Resets \(date.formatted(style))"
    }
}
