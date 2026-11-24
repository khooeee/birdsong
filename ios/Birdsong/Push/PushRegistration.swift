import UIKit
import UserNotifications

/// Asks for alerts and the badge, registers this phone with the desktop, and opens the session a tap names.
@MainActor
final class PushRegistration: NSObject, UNUserNotificationCenterDelegate {
    static weak var current: PushRegistration?

    var onSession: ((String) -> Void)?

    private var client: BirdsongClient?
    private var postedToken: String?

    override init() {
        super.init()
        Self.current = self
    }

    func start(client: BirdsongClient) {
        self.client = client
        postedToken = nil
        UNUserNotificationCenter.current().delegate = self
        Task { await request() }
    }

    func tokenArrived(_ token: String) {
        guard let client, token != postedToken else { return }
        postedToken = token
        Task {
            do {
                // The entitlement is aps-environment development, so the token is only valid on the sandbox gateway.
                guard let topic = Bundle.main.bundleIdentifier else {
                    postedToken = nil
                    return
                }
                try await client.registerDevice(token: token, sandbox: true, topic: topic)
            } catch {
                postedToken = nil
            }
        }
    }

    func open(_ notification: UNNotification) {
        guard let id = notification.request.content.userInfo["sessionId"] as? String, !id.isEmpty else { return }
        onSession?(id)
    }

    /// The event stream is already updating the screen, so a foreground push only sets the badge.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.badge])
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let id = response.notification.request.content.userInfo["sessionId"] as? String
        MainActor.assumeIsolated {
            if let id, !id.isEmpty { self.onSession?(id) }
        }
        completionHandler()
    }

    /// Asks every launch, which prompts only once: an install that allowed alerts before badges existed gains the badge.
    private func request() async {
        let center = UNUserNotificationCenter.current()
        let granted = (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        guard granted else { return }
        UIApplication.shared.registerForRemoteNotifications()
    }
}
