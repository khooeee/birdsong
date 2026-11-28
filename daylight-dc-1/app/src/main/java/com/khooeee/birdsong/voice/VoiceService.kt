package com.khooeee.birdsong.voice

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.khooeee.birdsong.MainActivity
import com.khooeee.birdsong.R
import com.khooeee.birdsong.app.BirdsongApplication
import kotlinx.coroutines.Job
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Keeps the mic and the call running while voice is on, with the screen off or another app in front, and stops itself
 * once voice is off. Its ongoing notification opens the session voice is on, or stops voice.
 */
class VoiceService : Service() {
    private val scope = MainScope()
    private var watch: Job? = null

    override fun onBind(intent: Intent?) = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val voice = (application as BirdsongApplication).voice
        if (intent?.action == ACTION_STOP) {
            voice.stop()
            stopSelf()
            return START_NOT_STICKY
        }
        // Always in the foreground before stopping: a service started that way and stopped first crashes the app.
        val sessionId = intent?.getStringExtra(MainActivity.EXTRA_SESSION_ID)
        ServiceCompat.startForeground(this, ID, notification(sessionId), ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        watch?.cancel()
        watch = scope.launch {
            voice.status.first { it.state == VoiceState.Off }
            stopSelf()
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    private fun notification(sessionId: String?): Notification {
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel(CHANNEL, "Voice", NotificationManager.IMPORTANCE_LOW))
        val open = Intent(this, MainActivity::class.java)
            .setAction(OPEN_ACTION)
            .apply { sessionId?.let { putExtra(MainActivity.EXTRA_SESSION_ID, it) } }
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val flags = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        val stop = Intent(this, VoiceService::class.java).setAction(ACTION_STOP)
        return NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_birdsong)
            .setContentTitle("Voice is on")
            .setContentText("Birdsong is listening.")
            .setContentIntent(PendingIntent.getActivity(this, 0, open, flags))
            .addAction(0, "Stop", PendingIntent.getService(this, 0, stop, flags))
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .build()
    }

    companion object {
        private const val CHANNEL = "voice"
        private const val ID = 2
        private const val ACTION_STOP = "com.khooeee.birdsong.STOP_VOICE"
        private const val OPEN_ACTION = "com.khooeee.birdsong.OPEN_VOICE_SESSION"

        /** Call while the app is in front: Android only lets a foreground app start using the mic. */
        fun start(context: Context, sessionId: String) {
            val intent = Intent(context, VoiceService::class.java).putExtra(MainActivity.EXTRA_SESSION_ID, sessionId)
            context.startForegroundService(intent)
        }
    }
}
