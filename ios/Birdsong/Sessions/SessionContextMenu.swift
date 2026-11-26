import UIKit

/// A rail row's long-press menu: Rename, Mark as Unread or Read, Fork, Pin or Unpin, and Continue with.
@MainActor
final class SessionContextMenu {
    private let client: BirdsongClient
    private weak var presenter: UIViewController?
    private var pendingPinUpdates = Set<String>()
    private lazy var continueWith = ContinueWithMenu(
        client: client,
        onStarted: onStarted,
        onFailed: { [weak self] title, message in self?.showError(title: title, message: message) }
    )
    private let onStarted: (Session) -> Void

    /// `onStarted` gets the session Fork or Continue with started.
    init(client: BirdsongClient, presenter: UIViewController, onStarted: @escaping (Session) -> Void) {
        self.client = client
        self.presenter = presenter
        self.onStarted = onStarted
    }

    func configuration(for session: Session, pinned: Bool) -> UIContextMenuConfiguration {
        var actions: [UIMenuElement] = [renameAction(session), unreadAction(session), forkAction(session)]
        if session.home != true, !pendingPinUpdates.contains(session.id) {
            actions.append(pinAction(session.id, pin: !pinned))
        }
        actions.append(continueWith.element(for: session, pinned: pinned))
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
        UIAction(title: "Rename…", image: UIImage(systemName: "pencil")) { [weak self] _ in
            guard let self, let presenter = availablePresenter() else { return }
            let form = RenameSessionViewController(client: client, session: session)
            presenter.present(UINavigationController(rootViewController: form), animated: true)
        }
    }

    private func unreadAction(_ session: Session) -> UIAction {
        let unread = session.unread != true
        let title = unread ? "Mark as Unread" : "Mark as Read"
        return UIAction(title: title, image: UIImage(systemName: unread ? "envelope.badge" : "envelope.open")) { [weak self] _ in
            Task {
                do {
                    try await self?.client.setUnread(unread, sessionId: session.id)
                } catch {
                    self?.showError(title: "Couldn't \(title.lowercased())", message: error.localizedDescription)
                }
            }
        }
    }

    private func forkAction(_ session: Session) -> UIAction {
        let attributes: UIMenuElement.Attributes = session.supportsFork == false ? .disabled : []
        return UIAction(title: "Fork", image: UIImage(systemName: "arrow.triangle.branch"), attributes: attributes) { [weak self] _ in
            guard let self else { return }
            Task {
                let title = "Couldn't fork session"
                do {
                    let fork = try await self.client.forkSession(session.id)
                    if fork.status == .error {
                        self.showError(title: title, message: fork.error ?? "The fork failed to start.")
                    } else {
                        self.onStarted(fork)
                    }
                } catch {
                    self.showError(title: title, message: error.localizedDescription)
                }
            }
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
