package com.khooeee.birdsong.notify

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import com.khooeee.birdsong.network.BirdsongClient
import com.khooeee.birdsong.pairing.PairingStore
import kotlin.coroutines.resume
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine

/** Tells the paired Mac this tablet's FCM token, so it can alert when a turn finishes. */
class PushRegistration(private val context: Context, private val scope: CoroutineScope, private val pairing: PairingStore) {
    private var client: BirdsongClient? = null
    private var postedToken: String? = null

    /** False when the build has no `google-services.json`, so there are no alerts to ask permission for. */
    val isAvailable: Boolean get() = FirebaseApp.getApps(context).isNotEmpty()

    /** Registers on every launch and pairing; the Mac drops tokens FCM says are dead. */
    fun start(client: BirdsongClient) {
        this.client = client
        postedToken = null
        scope.launch { token()?.let { post(it) } }
    }

    /** FCM replaced the token, possibly while the app isn't open; the saved pairing covers that. Called off the main thread. */
    fun tokenChanged(token: String) {
        scope.launch { post(token) }
    }

    /** Stops alerts from a Mac this tablet no longer pairs with. Best effort. */
    fun unregister(old: BirdsongClient) {
        scope.launch {
            val token = token() ?: return@launch
            runCatching { old.unregisterDevice(token) }
        }
    }

    private suspend fun post(token: String) {
        val client = client ?: pairing.load()?.let(::BirdsongClient)?.also { this.client = it } ?: return
        if (token == postedToken) return
        postedToken = token
        try {
            client.registerDevice(token)
        } catch (e: Exception) {
            // The next launch tries again.
            if (postedToken == token) postedToken = null
        }
    }

    /**
     * The registration token the Mac sends to with FCM HTTP v1. Firebase deprecated tokens for installation IDs
     * (`register()`), but documents no way yet for a server to send to one, so this stays on tokens until it does.
     */
    @Suppress("DEPRECATION")
    private suspend fun token(): String? {
        if (!isAvailable) return null
        return suspendCancellableCoroutine { continuation ->
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                continuation.resume(if (task.isSuccessful) task.result else null)
            }
        }
    }
}
