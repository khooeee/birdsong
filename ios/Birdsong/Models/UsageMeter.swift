import Foundation

/// One limit an agent enforces: how much of it is used and when it resets.
struct UsageMeter: Decodable, Sendable, Hashable {
    let label: String
    /// 0–100, or nil when the agent reports no percentage.
    let usedPercent: Double?
    /// Epoch ms of the next reset.
    let resetsAt: Double?
    /// Extra context, e.g. "$4.20 left".
    let detail: String?
}
