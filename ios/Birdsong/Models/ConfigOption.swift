import Foundation

/// One of the agent's select settings: the model, its effort, or a per-model setting.
struct ConfigOption: Decodable, Sendable {
    struct Choice: Decodable, Sendable {
        let value: String
        let name: String
        let description: String?
    }

    /// Choices under one heading; `name` is nil for choices the agent did not group.
    struct Group: Sendable {
        let name: String?
        let choices: [Choice]
    }

    let id: String
    let name: String
    let category: String?
    let currentValue: String
    let groups: [Group]

    private enum CodingKeys: String, CodingKey {
        case id, name, category, currentValue, options
    }

    /// The desktop sends either plain choices or `{ group, name, options }` groups.
    private struct Entry: Decodable {
        let value: String?
        let name: String
        let description: String?
        let options: [Choice]?
    }

    init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        category = try container.decodeIfPresent(String.self, forKey: .category)
        currentValue = try container.decode(String.self, forKey: .currentValue)
        var groups: [Group] = []
        for entry in try container.decode([Entry].self, forKey: .options) {
            if let options = entry.options {
                groups.append(Group(name: entry.name, choices: options))
            } else if let value = entry.value {
                let choice = Choice(value: value, name: entry.name, description: entry.description)
                if let last = groups.last, last.name == nil {
                    groups[groups.count - 1] = Group(name: nil, choices: last.choices + [choice])
                } else {
                    groups.append(Group(name: nil, choices: [choice]))
                }
            }
        }
        self.groups = groups
    }
}
