package com.khooeee.birdsong.notify

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.khooeee.birdsong.app.BirdsongApplication

/**
 * The Mac's data messages: `turn` shows a finished turn's alert; both kinds carry the sessions still unread, so
 * alerts read elsewhere come down.
 */
class BirdsongMessagingService : FirebaseMessagingService() {
    /** Deprecated with registration tokens; see `PushRegistration.token`. */
    @Suppress("OVERRIDE_DEPRECATION")
    override fun onNewToken(token: String) {
        (application as BirdsongApplication).push.tokenChanged(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        val notifications = TurnNotifications(this)
        val sessionId = data["sessionId"]?.takeIf { it.isNotEmpty() }
        if (data["kind"] == "turn" && sessionId != null) {
            notifications.show(sessionId, data["title"] ?: "Birdsong", data["body"] ?: "Finished")
        }
        val unreadIds = data["unreadIds"] ?: return
        notifications.keepOnly(unreadIds.split(",").filter { it.isNotEmpty() }.toSet(), keep = sessionId)
    }
}
