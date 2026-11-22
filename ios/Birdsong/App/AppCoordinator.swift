import UIKit
import UserNotifications

/// Chooses the root screen: pairing until a link works, then the session list.
@MainActor
final class AppCoordinator {
    private let window: UIWindow
    private let store = PairingStore()
    private let push = PushRegistration()
    /// One per pairing: voice is global, so every screen's mic shares it.
    private var voice: VoiceController?

    init(window: UIWindow) {
        self.window = window
    }

    func start() {
        push.onSession = { [weak self] id in self?.openSession(id) }
        if let config = store.load() { showSessions(config) } else { showPairing(prefill: nil) }
    }

    /// A tapped turn alert. Ignored until the phone is paired.
    func openNotification(_ notification: UNNotification) {
        push.open(notification)
    }

    private func openSession(_ id: String) {
        guard store.load() != nil, let list = sessionList() else { return }
        list.dismiss(animated: false)
        list.reveal(sessionId: id)
    }

    private func sessionList() -> SessionListViewController? {
        let navigation = window.rootViewController as? UINavigationController
        return navigation?.viewControllers.first as? SessionListViewController
    }

    /// A tapped `birdsong://` link fills in the pairing form; the user still confirms it.
    func openPairingLink(_ url: URL) {
        window.rootViewController?.dismiss(animated: false)
        guard store.load() != nil else { return showPairing(prefill: url.absoluteString) }
        presentPairing(prefill: url.absoluteString)
    }

    private func showSessions(_ config: ServerConfig) {
        voice?.stop()
        let voice = VoiceController(client: VoiceClient(config: config))
        self.voice = voice
        let client = BirdsongClient(config: config)
        push.start(client: client)
        let list = SessionListViewController(client: client, voice: voice) { [weak self] in
            self?.presentPairing(prefill: nil)
        }
        window.rootViewController = UINavigationController(rootViewController: list)
    }

    private func showPairing(prefill: String?) {
        let pair = PairViewController(prefill: prefill) { [weak self] config in self?.didPair(config) }
        window.rootViewController = UINavigationController(rootViewController: pair)
    }

    private func presentPairing(prefill: String?) {
        let pair = PairViewController(prefill: prefill ?? store.load()?.link) { [weak self] config in
            self?.didPair(config)
        }
        pair.navigationItem.leftBarButtonItem = UIBarButtonItem(
            systemItem: .cancel,
            primaryAction: UIAction { [weak pair] _ in pair?.dismiss(animated: true) }
        )
        window.rootViewController?.present(UINavigationController(rootViewController: pair), animated: true)
    }

    private func didPair(_ config: ServerConfig) {
        store.save(config)
        window.rootViewController?.dismiss(animated: false)
        showSessions(config)
    }
}
