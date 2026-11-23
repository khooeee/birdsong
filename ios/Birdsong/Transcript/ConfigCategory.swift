/// Which picker a composer pill opens: the model or its reasoning effort.
enum ConfigCategory: String, Sendable {
    case model
    case effort = "thought_level"

    var label: String {
        switch self {
        case .model: "Model"
        case .effort: "Reasoning effort"
        }
    }
}
