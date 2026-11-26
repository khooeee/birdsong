import UIKit

/// The long-press menu's Continue with submenu: the Mac's installed agents, alphabetically. Picking one starts a
/// session with that agent in the same folders and asks it to take over.
@MainActor
final class ContinueWithMenu {
    private let client: BirdsongClient
    private let onStarted: (Session) -> Void
    private let onFailed: (_ title: String, _ message: String) -> Void
    /// The Mac's last answer, so reopening the submenu doesn't wait on it.
    private var agents: [SessionAgent]?

    init(
        client: BirdsongClient,
        onStarted: @escaping (Session) -> Void,
        onFailed: @escaping (_ title: String, _ message: String) -> Void
    ) {
        self.client = client
        self.onStarted = onStarted
        self.onFailed = onFailed
    }

    func element(for session: Session, pinned: Bool) -> UIMenuElement {
        let image = UIImage(systemName: "arrow.turn.up.right")
        guard !session.cwd.trimmingCharacters(in: .whitespaces).isEmpty else {
            return UIAction(title: "Continue with", image: image, attributes: .disabled) { _ in }
        }
        let agents = UIDeferredMenuElement.uncached { [weak self] completion in
            guard let self else { return completion([]) }
            if let agents {
                completion(actions(agents, session: session, pinned: pinned))
                Task { self.agents = try? await self.client.availableAgents() }
                return
            }
            Task {
                do {
                    let agents = try await self.client.availableAgents()
                    self.agents = agents
                    completion(self.actions(agents, session: session, pinned: pinned))
                } catch {
                    completion([UIAction(title: "Couldn't reach your Mac", attributes: .disabled) { _ in }])
                }
            }
        }
        return UIMenu(title: "Continue with", image: image, children: [agents])
    }

    private func actions(_ agents: [SessionAgent], session: Session, pinned: Bool) -> [UIMenuElement] {
        guard !agents.isEmpty else { return [UIAction(title: "No agents installed", attributes: .disabled) { _ in }] }
        return agents.sorted { $0.label.localizedCompare($1.label) == .orderedAscending }.map { agent in
            UIAction(title: agent.label) { [weak self] _ in self?.start(agent, from: session, pin: pinned) }
        }
    }

    private func start(_ agent: SessionAgent, from source: Session, pin: Bool) {
        Task {
            let title = "Couldn't continue with \(agent.label)"
            do {
                let session = try await client.continueSession(source.id, with: agent, pin: pin)
                if session.status == .error {
                    onFailed(title, session.error ?? "The session failed to start.")
                } else {
                    onStarted(session)
                }
            } catch {
                onFailed(title, error.localizedDescription)
            }
        }
    }
}
