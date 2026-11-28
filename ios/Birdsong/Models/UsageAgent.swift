import Foundation

/// An agent the Usage sheet shows, labelled before its read lands.
struct UsageAgent: Decodable, Sendable, Hashable {
    let agent: String
    let name: String
}
