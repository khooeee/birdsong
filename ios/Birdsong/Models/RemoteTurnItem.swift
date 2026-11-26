import Foundation

/// One step of a turn: a message, thought, tool call or subagent, trimmed by the desktop to its text.
struct RemoteTurnItem: Decodable, Sendable, Hashable, Identifiable {
    let id: String
    /// `user`, `assistant`, `thought`, `tool`, …; a string so a newer Mac's roles still show.
    let role: String
    let at: Double
    let text: String
    let queued: Bool?
    /// A tool's or subagent's state, e.g. `completed`.
    let status: String?
    /// What a subagent was asked to do.
    let task: String?
    /// How many images a tool returned; they stay on the Mac.
    let images: Int?
}
