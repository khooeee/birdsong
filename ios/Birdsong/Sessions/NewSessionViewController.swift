import UIKit

/// Starts a session in a folder on the paired Mac.
final class NewSessionViewController: UIViewController {
    private let client: BirdsongClient
    private let onCreated: (Session) -> Void
    private var agent: SessionAgent
    private let recentFolders: [String]
    private let agentButton = UIButton(configuration: .gray())
    private let folderField = UITextField()
    private let recentButton = UIButton(configuration: .gray())
    private let errorLabel = UILabel()
    private var isCreating = false
    private lazy var createButton = UIBarButtonItem(
        title: "Create",
        primaryAction: UIAction { [weak self] _ in self?.create() }
    )

    init(client: BirdsongClient, recent: [Session], onCreated: @escaping (Session) -> Void) {
        self.client = client
        self.onCreated = onCreated
        agent = recent.first.flatMap { SessionAgent(rawValue: $0.agent) } ?? .claude
        var seen = Set<String>()
        let folders = recent.map(\.cwd).filter { $0.hasPrefix("/") && seen.insert($0).inserted }
        recentFolders = Array(folders.prefix(8))
        super.init(nibName: nil, bundle: nil)
        folderField.text = recentFolders.first
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "New Session"
        view.backgroundColor = .systemGroupedBackground
        navigationItem.leftBarButtonItem = UIBarButtonItem(
            systemItem: .cancel,
            primaryAction: UIAction { [weak self] _ in self?.dismiss(animated: true) }
        )
        createButton.style = .prominent
        navigationItem.rightBarButtonItem = createButton

        agentButton.accessibilityLabel = "Agent"
        agentButton.contentHorizontalAlignment = .leading
        agentButton.showsMenuAsPrimaryAction = true
        updateAgentMenu()

        folderField.accessibilityLabel = "Session folder on Mac"
        folderField.placeholder = "/path/to/project"
        folderField.borderStyle = .roundedRect
        folderField.font = .preferredFont(forTextStyle: .body)
        folderField.adjustsFontForContentSizeCategory = true
        folderField.autocapitalizationType = .none
        folderField.autocorrectionType = .no
        folderField.spellCheckingType = .no
        folderField.smartDashesType = .no
        folderField.clearButtonMode = .whileEditing
        folderField.returnKeyType = .go
        folderField.addAction(UIAction { [weak self] _ in self?.clearError() }, for: .editingChanged)
        folderField.addAction(UIAction { [weak self] _ in self?.create() }, for: .editingDidEndOnExit)

        recentButton.configuration?.image = UIImage(systemName: "clock")
        recentButton.accessibilityLabel = "Recent folders"
        recentButton.showsMenuAsPrimaryAction = true
        recentButton.menu = UIMenu(children: recentFolders.map { path in
            UIAction(title: path) { [weak self] _ in
                self?.folderField.text = path
                self?.clearError()
            }
        })
        recentButton.isHidden = recentFolders.isEmpty
        recentButton.setContentHuggingPriority(.required, for: .horizontal)
        recentButton.setContentCompressionResistancePriority(.required, for: .horizontal)
        let folderRow = UIStackView(arrangedSubviews: [folderField, recentButton])
        folderRow.spacing = 8

        errorLabel.numberOfLines = 0
        errorLabel.font = .preferredFont(forTextStyle: .footnote)
        errorLabel.adjustsFontForContentSizeCategory = true
        errorLabel.textColor = .systemRed
        errorLabel.isHidden = true

        let agentLabel = fieldLabel("Agent")
        let folderLabel = fieldLabel("Session Folder on Mac")
        let stack = UIStackView(arrangedSubviews: [agentLabel, agentButton, folderLabel, folderRow, errorLabel])
        stack.axis = .vertical
        stack.spacing = 8
        stack.setCustomSpacing(20, after: agentButton)
        let scrollView = UIScrollView()
        scrollView.keyboardDismissMode = .interactive
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scrollView)
        scrollView.addSubview(stack)
        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
            stack.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor, constant: 20),
            stack.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor, constant: -20),
            stack.leadingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.trailingAnchor, constant: -20),
            stack.widthAnchor.constraint(equalTo: scrollView.frameLayoutGuide.widthAnchor, constant: -40),
            agentButton.heightAnchor.constraint(greaterThanOrEqualToConstant: 44),
            folderRow.heightAnchor.constraint(greaterThanOrEqualToConstant: 44),
        ])
        clearError()
    }

    private var cwd: String {
        folderField.text ?? ""
    }

    private func fieldLabel(_ text: String) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = .preferredFont(forTextStyle: .headline)
        label.adjustsFontForContentSizeCategory = true
        label.numberOfLines = 0
        label.isAccessibilityElement = false
        return label
    }

    private func updateAgentMenu() {
        agentButton.configuration?.title = agent.label
        agentButton.configuration?.image = UIImage(systemName: "chevron.up.chevron.down")
        agentButton.configuration?.imagePlacement = .trailing
        agentButton.configuration?.imagePadding = 8
        agentButton.accessibilityValue = agent.label
        agentButton.menu = UIMenu(children: SessionAgent.allCases.map { choice in
            UIAction(title: choice.label, state: choice == agent ? .on : .off) { [weak self] _ in
                self?.agent = choice
                self?.updateAgentMenu()
                self?.clearError()
            }
        })
    }

    private func clearError() {
        errorLabel.isHidden = true
        createButton.isEnabled = !isCreating && !cwd.isEmpty
    }

    private func showError(_ message: String) {
        errorLabel.text = message
        errorLabel.isHidden = false
        UIAccessibility.post(notification: .announcement, argument: message)
    }

    private func create() {
        let cwd = cwd
        guard !isCreating, !cwd.isEmpty else { return }
        guard cwd.hasPrefix("/") else {
            showError("Enter the full folder path on your Mac, starting with /.")
            return
        }
        view.endEditing(true)
        clearError()
        setCreating(true)
        Task {
            do {
                let session = try await client.createSession(agent: agent, cwd: cwd)
                if session.status == .error {
                    setCreating(false)
                    showError(session.error ?? "The session failed to start.")
                    return
                }
                dismiss(animated: true) { [onCreated] in onCreated(session) }
            } catch {
                setCreating(false)
                showError(error.localizedDescription)
            }
        }
    }

    private func setCreating(_ creating: Bool) {
        isCreating = creating
        navigationController?.isModalInPresentation = creating
        navigationItem.leftBarButtonItem?.isEnabled = !creating
        createButton.isEnabled = !creating && !cwd.isEmpty
        createButton.title = creating ? "Starting…" : "Create"
        agentButton.isEnabled = !creating
        folderField.isEnabled = !creating
        recentButton.isEnabled = !creating
    }
}
