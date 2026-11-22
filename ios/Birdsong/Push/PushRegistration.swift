import UIKit
import UserNotifications

/// Asks for alerts, registers this phone with the desktop, and opens the session a tap names.
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
                try await client.registerDevice(token: token, sandbox: true)
            } catch {
                postedToken = nil
            }
        }
    }

    func open(_ notification: UNNotification) {
        guard let id = notification.request.content.userInfo["sessionId"] as? String, !id.isEmpty else { return }
        onSession?(id)
    }

    /// The event stream is already updating the screen, so a foreground push stays quiet.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([])
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

    private func request() async {
        let center = UNUserNotificationCenter.current()
        var settings = await center.notificationSettings()
        if settings.authorizationStatus == .notDetermined {
            let granted = (try? await center.requestAuthorization(options: [.alert, .sound])) ?? false
            guard granted else { return }
            settings = await center.notificationSettings()
        }
        guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }
        UIApplication.shared.registerForRemoteNotifications()
    }
}
