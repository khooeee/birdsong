import Foundation

/// One server-sent event from `/events`, `/sessions/:id/events` or `/sessions/:id/turns/:turnId/events`.
enum RemoteEvent: Sendable {
    case sessions(SessionList)
    case reset([RemoteTurn])
    case turn(RemoteTurn)
    case turnDetail(RemoteTurnDetail)
    /// The turn was removed, so there is nothing to reconnect to.
    case turnGone

    private struct Reset: Decodable { let turns: [RemoteTurn] }
    private struct Turn: Decodable { let turn: RemoteTurn }

    /// nil for event names this app does not know yet.
    static func decode(name: String, data: String) throws -> RemoteEvent? {
        let decoder = JSONDecoder()
        let bytes = Data(data.utf8)
        switch name {
        case "sessions": return .sessions(try decoder.decode(SessionList.self, from: bytes))
        case "reset": return .reset(try decoder.decode(Reset.self, from: bytes).turns)
        case "turn": return .turn(try decoder.decode(Turn.self, from: bytes).turn)
        case "turnDetail": return .turnDetail(try decoder.decode(RemoteTurnDetail.self, from: bytes))
        case "turnGone": return .turnGone
        default: return nil
        }
    }
}
