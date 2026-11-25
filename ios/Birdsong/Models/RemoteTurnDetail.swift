import Foundation

/// A turn's steps: the ids of all of them in order, and the ones new or changed since the last event.
struct RemoteTurnDetail: Decodable, Sendable {
    let turnId: String
    let status: RemoteTurn.Status
    let order: [String]
    let items: [RemoteTurnItem]
}
