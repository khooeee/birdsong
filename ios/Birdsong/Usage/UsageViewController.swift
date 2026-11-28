import UIKit

/// Usage and limits for every agent installed on the Mac, read fresh each time it opens or refreshes.
final class UsageViewController: UIViewController {
    private let client: BirdsongClient
    private let stack = UIStackView()
    private var agents: [UsageAgent]?
    private var usage: [String: AgentUsage] = [:]
    private var failure: String?
    private var readTask: Task<Void, Never>?
    private lazy var refreshButton = UIBarButtonItem(
        image: UIImage(systemName: "arrow.clockwise"),
        primaryAction: UIAction { [weak self] _ in self?.read() }
    )

    init(client: BirdsongClient) {
        self.client = client
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    deinit { readTask?.cancel() }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Usage"
        view.backgroundColor = .systemGroupedBackground
        navigationItem.leftBarButtonItem = UIBarButtonItem(
            systemItem: .close,
            primaryAction: UIAction { [weak self] _ in self?.dismiss(animated: true) }
        )
        refreshButton.accessibilityLabel = "Refresh"
        navigationItem.rightBarButtonItem = refreshButton

        let scroll = UIScrollView()
        scroll.alwaysBounceVertical = true
        scroll.translatesAutoresizingMaskIntoConstraints = false
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scroll)
        scroll.addSubview(stack)
        let content = scroll.contentLayoutGuide
        let frame = scroll.frameLayoutGuide
        NSLayoutConstraint.activate([
            scroll.topAnchor.constraint(equalTo: view.topAnchor),
            scroll.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            scroll.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            scroll.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
            stack.topAnchor.constraint(equalTo: content.topAnchor, constant: 16),
            stack.bottomAnchor.constraint(equalTo: content.bottomAnchor, constant: -16),
            stack.leadingAnchor.constraint(equalTo: frame.leadingAnchor, constant: 16),
            stack.trailingAnchor.constraint(equalTo: frame.trailingAnchor, constant: -16),
        ])
        read()
    }

    /// Asks the Mac for each agent at once, so every agent fills in as soon as its own CLI answers.
    private func read() {
        readTask?.cancel()
        agents = nil
        usage = [:]
        failure = nil
        render()
        readTask = Task { [weak self, client] in
            do {
                let list = try await client.usageAgents()
                guard let self, !Task.isCancelled else { return }
                agents = list
                render()
                await withTaskGroup(of: AgentUsage.self) { group in
                    for agent in list {
                        group.addTask {
                            do { return try await client.usage(agent: agent.agent) } catch {
                                return AgentUsage(agent: agent.agent, name: agent.name, error: error.localizedDescription)
                            }
                        }
                    }
                    for await result in group where !Task.isCancelled {
                        usage[result.agent] = result
                        render()
                    }
                }
            } catch {
                guard let self, !Task.isCancelled else { return }
                failure = error.localizedDescription
                render()
            }
        }
    }

    private func render() {
        refreshButton.isEnabled = failure != nil || agents.map { $0.count == usage.count } ?? false
        stack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let now = Date.now
        if let failure {
            stack.addArrangedSubview(UsageMeterView.label(failure, style: .body, color: .systemRed))
        } else if let agents {
            if agents.isEmpty {
                stack.addArrangedSubview(UsageMeterView.label("No agents with usage are installed on the Mac.", style: .body, color: .secondaryLabel))
            }
            for agent in agents {
                stack.addArrangedSubview(AgentUsageView(name: agent.name, usage: usage[agent.agent], now: now))
            }
        } else {
            let spinner = UIActivityIndicatorView(style: .medium)
            spinner.startAnimating()
            stack.addArrangedSubview(spinner)
        }
    }
}
