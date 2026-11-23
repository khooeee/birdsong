import UIKit

/// Model and effort pills above the composer; each opens the agent's current choices and applies a pick.
final class ModelConfigBar: UIView {
    var onError: ((String) -> Void)?
    var modelConfig: SessionModelConfig? {
        didSet { update() }
    }

    private let client: BirdsongClient
    private let sessionId: String
    private lazy var modelButton = pill(.model)
    private lazy var effortButton = pill(.effort)

    init(client: BirdsongClient, sessionId: String) {
        self.client = client
        self.sessionId = sessionId
        super.init(frame: .zero)
        let spacer = UIView()
        spacer.setContentHuggingPriority(.init(1), for: .horizontal)
        spacer.setContentCompressionResistancePriority(.init(1), for: .horizontal)
        // A long model name truncates before the effort does.
        modelButton.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        let row = UIStackView(arrangedSubviews: [modelButton, effortButton, spacer])
        row.alignment = .center
        row.spacing = 8
        row.translatesAutoresizingMaskIntoConstraints = false
        addSubview(row)
        NSLayoutConstraint.activate([
            row.topAnchor.constraint(equalTo: topAnchor),
            row.leadingAnchor.constraint(equalTo: leadingAnchor),
            row.trailingAnchor.constraint(equalTo: trailingAnchor),
            row.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])
        update()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    private func update() {
        for (button, title) in [(modelButton, modelConfig?.model), (effortButton, modelConfig?.effort)] {
            button.configuration?.title = title
            button.accessibilityValue = title
            button.isHidden = title == nil
        }
        isHidden = modelConfig?.isEmpty ?? true
    }

    private func button(_ category: ConfigCategory) -> UIButton {
        category == .model ? modelButton : effortButton
    }

    private func pill(_ category: ConfigCategory) -> UIButton {
        var config = UIButton.Configuration.gray()
        config.cornerStyle = .capsule
        config.buttonSize = .small
        config.titleLineBreakMode = .byTruncatingTail
        config.image = UIImage(systemName: "chevron.up.chevron.down", withConfiguration: UIImage.SymbolConfiguration(scale: .small))
        config.imagePlacement = .trailing
        config.imagePadding = 4
        let button = UIButton(configuration: config)
        button.accessibilityLabel = category.label
        button.showsMenuAsPrimaryAction = true
        button.preferredMenuElementOrder = .fixed
        // Uncached: every open asks the agent again, so the choices follow a model change on the Mac.
        button.menu = UIMenu(children: [UIDeferredMenuElement.uncached { [weak self] completion in
            guard let self else { return completion([]) }
            Task { completion(await self.loadItems(category)) }
        }])
        return button
    }

    private func loadItems(_ category: ConfigCategory) async -> [UIMenuElement] {
        do {
            let pickers = try await client.configPickers(sessionId: sessionId)
            if let current = pickers.modelConfig { modelConfig = current }
            let items = ConfigMenuItems.items(category, in: pickers) { [weak self] configId, value in
                self?.pick(category, configId: configId, value: value)
            }
            return items.isEmpty ? [UIAction(title: "No choices from the agent", attributes: .disabled) { _ in }] : items
        } catch {
            return [UIAction(title: "Couldn't load choices", subtitle: Self.describe(error), attributes: .disabled) { _ in }]
        }
    }

    private func pick(_ category: ConfigCategory, configId: String, value: String) {
        let button = button(category)
        button.configuration?.showsActivityIndicator = true
        button.isEnabled = false
        Task {
            do {
                let pickers = try await client.setConfigOption(configId: configId, value: value, sessionId: sessionId)
                if let current = pickers.modelConfig { modelConfig = current }
            } catch {
                onError?(Self.describe(error))
            }
            button.configuration?.showsActivityIndicator = false
            button.isEnabled = true
        }
    }

    /// A Mac app from before these routes answers 404 "Not found" (an unknown session says "Session not found").
    private static func describe(_ error: any Error) -> String {
        if let error = error as? ServerError, error.status == 404, error.message == "Not found" {
            return "Update Birdsong on your Mac to change the model from your phone."
        }
        return error.localizedDescription
    }
}
