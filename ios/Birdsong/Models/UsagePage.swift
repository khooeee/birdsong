import Foundation

/// Where an agent shows its own usage, for agents the Mac does not read.
struct UsagePage: Decodable, Sendable, Hashable {
    let url: URL
    /// How to reach the numbers once the page is open.
    let hint: String?
}
