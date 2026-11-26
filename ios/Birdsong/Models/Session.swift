import Foundation

/// One desktop session as the rail lists it.
struct Session: Decodable, Sendable, Hashable, Identifiable {
    enum Status: String, Decodable, Sendable {
        case idle, connecting, ready, running, error
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
    /// A turn finished while the session was off screen; absent from an older Mac app.
    var unread: Bool?
    /// The Home session, pinned above the others. Absent from an older Mac app.
    let home: Bool?
    /// False when the agent can't fork; absent until one of its kind connects, or from an older Mac app.
    let supportsFork: Bool?

    var continuationNotice: String? {
        guard let resumeAt else { return nil }
        let date = Date(timeIntervalSince1970: resumeAt / 1000)
        return "Continues automatically \(date.formatted(date: .abbreviated, time: .shortened)) after quota resets"
    }
}
