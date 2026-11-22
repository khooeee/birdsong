import UIKit

/// A rail row's trailing swipe: Pin or Unpin, and Rename.
@MainActor
final class SessionSwipeActions {
    private let client: BirdsongClient
    private weak var presenter: UIViewController?
    private var pendingPinUpdates = Set<String>()

    init(client: BirdsongClient, presenter: UIViewController) {
        self.client = client
        self.presenter = presenter
    }

    func configuration(for session: Session, pinned: Bool) -> UISwipeActionsConfiguration {
        var actions = [renameAction(session)]
        if !pendingPinUpdates.contains(session.id) {
            actions.insert(pinAction(session.id, pin: !pinned), at: 0)
        }
        let config = UISwipeActionsConfiguration(actions: actions)
        config.performsFirstActionWithFullSwipe = false
        return config
    }

    private func pinAction(_ id: String, pin: Bool) -> UIContextualAction {
        let action = UIContextualAction(style: .normal, title: pin ? "Pin" : "Unpin") { [weak self] _, _, finish in
            guard let self, pendingPinUpdates.insert(id).inserted else {
                finish(false)
                return
            }
            Task {
                defer { self.pendingPinUpdates.remove(id) }
                do {
                    try await self.client.setPinned(pin, sessionId: id)
                    finish(true)
                } catch {
                    finish(false)
                    self.showPinError(error, pin: pin)
                }
            }
        }
        action.backgroundColor = .systemBlue
        return action
    }

    private func renameAction(_ session: Session) -> UIContextualAction {
        let action = UIContextualAction(style: .normal, title: "Rename") { [weak self] _, _, finish in
            finish(true)
            guard let self, let presenter = availablePresenter() else { return }
            let form = RenameSessionViewController(client: client, session: session)
            presenter.present(UINavigationController(rootViewController: form), animated: true)
        }
        action.backgroundColor = .systemGray
        return action
    }

    private func showPinError(_ error: any Error, pin: Bool) {
        guard let presenter = availablePresenter() else { return }
        let alert = UIAlertController(
            title: pin ? "Couldn't pin session" : "Couldn't unpin session",
            message: error.localizedDescription,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        presenter.present(alert, animated: true)
    }

    /// The rail, or its active search, when on screen and not already presenting something.
    private func availablePresenter() -> UIViewController? {
        guard let presenter, presenter.viewIfLoaded?.window != nil else { return nil }
        let top = presenter.presentedViewController as? UISearchController ?? presenter
        return top.presentedViewController == nil ? top : nil
    }
}
