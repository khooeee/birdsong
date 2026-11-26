import UserNotifications

/// The unread count on the home screen icon. Live lists set it here while the app runs; pushes do otherwise.
enum AppBadge {
    static func show(_ sessions: some Sequence<Session>) {
        let unread = sessions.count { $0.unread == true }
        UNUserNotificationCenter.current().setBadgeCount(unread)
    }
}
