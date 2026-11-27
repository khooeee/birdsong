package com.khooeee.birdsong.notify

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.app.NotificationCompat
import com.khooeee.birdsong.MainActivity
import com.khooeee.birdsong.R

/** Alerts for finished turns, one per session (tagged with its id), so reading a session can take its alert down. */
class TurnNotifications(private val context: Context) {
    private val manager = context.getSystemService(NotificationManager::class.java)

    fun createChannel() {
        val channel = NotificationChannel(CHANNEL, "Finished turns", NotificationManager.IMPORTANCE_HIGH)
        channel.description = "When an agent finishes a turn while Birdsong is in the background."
        manager.createNotificationChannel(channel)
    }

    fun show(sessionId: String, title: String, body: String) {
        if (context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        val open = Intent(context, MainActivity::class.java)
            .putExtra(MainActivity.EXTRA_SESSION_ID, sessionId)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val tap = PendingIntent.getActivity(
            context, sessionId.hashCode(), open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notification = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_birdsong)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(tap)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .build()
        manager.notify(sessionId, ID, notification)
    }

    fun cancel(sessionId: String) {
        manager.cancel(sessionId, ID)
    }

    /** Takes down alerts for sessions that are no longer unread, e.g. read on the Mac, except `keep`. */
    fun keepOnly(unreadIds: Set<String>, keep: String? = null) {
        for (active in manager.activeNotifications) {
            val tag = active.tag ?: continue
            if (active.id == ID && tag != keep && tag !in unreadIds) manager.cancel(tag, ID)
        }
    }

    private companion object {
        const val CHANNEL = "turns"
        const val ID = 1
    }
}
