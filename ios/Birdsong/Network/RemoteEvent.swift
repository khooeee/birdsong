import Foundation

/// One server-sent event from `/events` or `/sessions/:id/events`.
enum RemoteEvent: Sendable {
    case sessions(SessionList)
    case reset([RemoteTurn])
    case turn(RemoteTurn)
    case quotas([AgentQuota])

    private struct Reset: Decodable { let turns: [RemoteTurn] }
    private struct Turn: Decodable { let turn: RemoteTurn }
    private struct Quotas: Decodable { let quotas: [AgentQuota] }

    /// nil for event names this app does not know yet.
    static func decode(name: String, data: String) throws -> RemoteEvent? {
        let decoder = JSONDecoder()
        let bytes = Data(data.utf8)
        switch name {
        case "sessions": return .sessions(try decoder.decode(SessionList.self, from: bytes))
        case "reset": return .reset(try decoder.decode(Reset.self, from: bytes).turns)
        case "turn": return .turn(try decoder.decode(Turn.self, from: bytes).turn)
        case "quotas": return .quotas(try decoder.decode(Quotas.self, from: bytes).quotas)
        default: return nil
        }
    }
}
