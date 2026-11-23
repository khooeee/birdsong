import Foundation

/// The agent's current model and reasoning effort, as display names.
struct SessionModelConfig: Decodable, Sendable, Hashable {
    let model: String?
    let effort: String?

    var isEmpty: Bool { model == nil && effort == nil }
}
