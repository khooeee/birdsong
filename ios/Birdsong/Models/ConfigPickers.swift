import Foundation

/// What the model and effort pickers offer, from `GET /sessions/:id/config`.
struct ConfigPickers: Decodable, Sendable {
    let options: [ConfigOption]
    let modelConfig: SessionModelConfig?
}
