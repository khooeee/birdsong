import UIKit

/// A rail row's long-press menu: Pin or Unpin, Rename, and Continue with.
@MainActor
final class SessionContextMenu {
    private let client: BirdsongClient
    private weak var presenter: UIViewController?
    private var pendingPinUpdates = Set<String>()
    private lazy var continueWith = ContinueWithMenu(
        client: client,
        onStarted: onContinued,
        onFailed: { [weak self] title, message in self?.showError(title: title, message: message) }
    )
    private let onContinued: (Session) -> Void

    /// `onContinued` gets the session Continue with started.
    init(client: BirdsongClient, presenter: UIViewController, onContinued: @escaping (Session) -> Void) {
        self.client = client
        self.presenter = presenter
        self.onContinued = onContinued
    }

    func configuration(for session: Session, pinned: Bool) -> UIContextMenuConfiguration {
        var actions: [UIMenuElement] = [renameAction(session), continueWith.element(for: session, pinned: pinned)]
        if session.home != true, !pendingPinUpdates.contains(session.id) {
            actions.insert(pinAction(session.id, pin: !pinned), at: 0)
        }
        return UIContextMenuConfiguration(actionProvider: { _ in UIMenu(children: actions) })
    }

    private func pinAction(_ id: String, pin: Bool) -> UIAction {
        UIAction(title: pin ? "Pin" : "Unpin", image: UIImage(systemName: pin ? "pin" : "pin.slash")) { [weak self] _ in
            guard let self, pendingPinUpdates.insert(id).inserted else { return }
            Task {
                defer { self.pendingPinUpdates.remove(id) }
                do {
                    try await self.client.setPinned(pin, sessionId: id)
                } catch {
                    self.showError(
                        title: pin ? "Couldn't pin session" : "Couldn't unpin session",
                        message: error.localizedDescription
                    )
                }
            }
        }
    }

    private func renameAction(_ session: Session) -> UIAction {
        UIAction(title: "Rename", image: UIImage(systemName: "pencil")) { [weak self] _ in
            guard let self, let presenter = availablePresenter() else { return }
            let form = RenameSessionViewController(client: client, session: session)
            presenter.present(UINavigationController(rootViewController: form), animated: true)
        }
    }

    private func showError(title: String, message: String) {
        guard let presenter = availablePresenter() else { return }
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
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
