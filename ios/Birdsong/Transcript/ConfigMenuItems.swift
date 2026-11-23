import UIKit

/// Menu items for a model or effort picker: a checked current choice, headed groups, and per-model settings.
@MainActor
enum ConfigMenuItems {
    typealias Pick = (_ configId: String, _ value: String) -> Void

    static func items(_ category: ConfigCategory, in pickers: ConfigPickers, onPick: @escaping Pick) -> [UIMenuElement] {
        var items = pickers.options
            .filter { $0.category == category.rawValue }
            .flatMap { choiceItems($0, onPick: onPick) }
        if category == .model {
            // Like the desktop: settings that belong to the chosen model sit under it as submenus.
            let settings = pickers.options.filter { $0.category == "model_config" }.map { option in
                UIMenu(title: option.name, children: choiceItems(option, onPick: onPick))
            }
            if !settings.isEmpty, !items.isEmpty { items.append(UIMenu(options: .displayInline, children: settings)) }
        }
        return items
    }

    private static func choiceItems(_ option: ConfigOption, onPick: @escaping Pick) -> [UIMenuElement] {
        option.groups.map { group in
            UIMenu(title: group.name ?? "", options: .displayInline, children: group.choices.map { choice in
                let current = choice.value == option.currentValue
                return UIAction(title: choice.name, subtitle: choice.description, state: current ? .on : .off) { _ in
                    if !current { onPick(option.id, choice.value) }
                }
            })
        }
    }
}
