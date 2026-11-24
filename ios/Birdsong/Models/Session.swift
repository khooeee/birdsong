import Foundation

/// One desktop session as the rail lists it.
struct Session: Decodable, Sendable, Hashable, Identifiable {
    enum Status: String, Decodable, Sendable {
        case idle, connecting, ready, running, error

        /// A turn is in flight: the rail shows a spinner instead of the unread dot.
        var isRunning: Bool { self == .running || self == .connecting }
        /// A finished turn: newly finished while unseen earns the unread dot.
        var isComplete: Bool { self == .idle || self == .ready }
    }

    let id: String
    let title: String
    let agent: String
    let cwd: String
    let status: Status
    let error: String?
    let createdAt: Double
    let resumeAt: Double?
    let modelConfig: SessionModelConfig?

    var continuationNotice: String? {
        guard let resumeAt else { return nil }
        let date = Date(timeIntervalSince1970: resumeAt / 1000)
        return "Continues automatically \(date.formatted(date: .abbreviated, time: .shortened)) after quota resets"
    }
}
