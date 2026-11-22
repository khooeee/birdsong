import UIKit

/// Edits a session's title, which may span several lines.
final class RenameSessionViewController: UIViewController, UITextViewDelegate {
    private let client: BirdsongClient
    private let session: Session
    private let textView = UITextView()
    private let errorLabel = UILabel()
    private var isSaving = false
    private lazy var saveButton = UIBarButtonItem(
        title: "Save",
        primaryAction: UIAction { [weak self] _ in self?.save() }
    )

    init(client: BirdsongClient, session: Session) {
        self.client = client
        self.session = session
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Rename Session"
        view.backgroundColor = .systemGroupedBackground
        navigationItem.leftBarButtonItem = UIBarButtonItem(
            systemItem: .cancel,
            primaryAction: UIAction { [weak self] _ in self?.dismiss(animated: true) }
        )
        saveButton.style = .prominent
        navigationItem.rightBarButtonItem = saveButton

        textView.text = session.title
        textView.accessibilityLabel = "Session title"
        textView.font = .preferredFont(forTextStyle: .body)
        textView.adjustsFontForContentSizeCategory = true
        textView.backgroundColor = .secondarySystemGroupedBackground
        textView.layer.cornerRadius = 10
        textView.textContainerInset = UIEdgeInsets(top: 10, left: 8, bottom: 10, right: 8)
        textView.delegate = self

        errorLabel.numberOfLines = 0
        errorLabel.font = .preferredFont(forTextStyle: .footnote)
        errorLabel.adjustsFontForContentSizeCategory = true
        errorLabel.textColor = .systemRed
        errorLabel.isHidden = true

        let stack = UIStackView(arrangedSubviews: [textView, errorLabel])
        stack.axis = .vertical
        stack.spacing = 8
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
            stack.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor, constant: -20),
            stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -20),
        ])
        updateSaveButton()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        textView.becomeFirstResponder()
    }

    func textViewDidChange(_ textView: UITextView) {
        errorLabel.isHidden = true
        updateSaveButton()
    }

    /// The server trims too; an unchanged title would needlessly stop the agent naming the session.
    private var newTitle: String {
        textView.text.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func updateSaveButton() {
        saveButton.isEnabled = !isSaving && !newTitle.isEmpty && newTitle != session.title
    }

    private func save() {
        let title = newTitle
        guard !isSaving, !title.isEmpty else { return }
        setSaving(true)
        Task {
            do {
                try await client.rename(sessionId: session.id, title: title)
                dismiss(animated: true)
            } catch {
                setSaving(false)
                errorLabel.text = error.localizedDescription
                errorLabel.isHidden = false
                UIAccessibility.post(notification: .announcement, argument: error.localizedDescription)
            }
        }
    }

    private func setSaving(_ saving: Bool) {
        isSaving = saving
        navigationController?.isModalInPresentation = saving
        navigationItem.leftBarButtonItem?.isEnabled = !saving
        textView.isEditable = !saving
        saveButton.title = saving ? "Saving…" : "Save"
        updateSaveButton()
    }
}
