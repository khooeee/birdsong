package com.khooeee.birdsong.voice

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import com.khooeee.birdsong.network.ServerError
import com.khooeee.birdsong.network.VoiceClient
import kotlin.coroutines.cancellation.CancellationException
import kotlin.time.Duration
import kotlin.time.Duration.Companion.seconds
import kotlinx.coroutines.Job
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Voice on the tablet, on one session at a time. Whoever starts voice holds the mic, so starting here takes it over
 * from the Mac (or moves it from another session), whose agent still drives the call. After a drop (network change,
 * dead spot) it resumes with a new call. Use it on the main thread.
 */
class VoiceController(private val context: Context) {
    private val scope = MainScope()
    private val route = VoiceAudioRoute(context)
    private val mutableStatus = MutableStateFlow(VoiceStatus())
    val status: StateFlow<VoiceStatus> = mutableStatus.asStateFlow()

    private var client: VoiceClient? = null
    private var peer: VoicePeer? = null
    private var attempt: Job? = null

    /** Opened at least once since start, so drops resume instead of failing. */
    private var opened = false
    private var failures = 0

    private val state get() = status.value.state

    /** A session's mic: stop voice on that session, else start it there. */
    fun toggle(client: VoiceClient, sessionId: String) {
        if (status.value.isOn(sessionId)) stop() else start(client, sessionId)
    }

    /** Start on a session; voice on another one ends here first, and the Mac starts this one fresh. */
    fun start(client: VoiceClient, sessionId: String) {
        if (status.value.isOn(sessionId)) return
        // No stop request: it could land after the new start and stop the new session's voice.
        if (state != VoiceState.Off) finish(error = null)
        if (context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            mutableStatus.value = VoiceStatus(sessionId, VoiceState.Off, MIC_OFF)
            return
        }
        this.client = client
        opened = false
        failures = 0
        mutableStatus.value = VoiceStatus(sessionId, VoiceState.Connecting)
        route.begin()
        VoiceService.start(context, sessionId)
        connect(resume = false, reason = null)
    }

    fun stop() {
        if (state == VoiceState.Off) return
        val client = client
        finish(error = null)
        scope.launch { runCatching { client?.stop() } }
    }

    /** The last error was shown. */
    fun dismissError() {
        mutableStatus.update { it.copy(error = null) }
    }

    private fun connect(resume: Boolean, reason: String?, after: Duration = Duration.ZERO) {
        attempt?.cancel()
        mutableStatus.update { it.copy(state = VoiceState.Connecting) }
        attempt = scope.launch {
            delay(after)
            attempt(resume, reason)
        }
    }

    private suspend fun attempt(resume: Boolean, reason: String?) {
        val client = client ?: return
        val sessionId = status.value.sessionId ?: return
        try {
            val iceServers = client.start(sessionId, resume, reason)
            val peer = VoicePeer(context, iceServers)
            adopt(peer)
            val answer = client.answer(peer.offer())
            peer.accept(answer)
        } catch (e: CancellationException) {
            // Stopped, or superseded by a newer attempt.
            throw e
        } catch (e: ServerError) {
            // 409: voice was stopped meanwhile (on the Mac, by its idle timer, or by the agent) or moved to another session.
            if (e.status == 409) finish(error = if (resume) null else e.message) else failed(e.message.orEmpty())
        } catch (e: Exception) {
            failed(e.message ?: "Voice failed.")
        }
    }

    /** The new call replaces the last one, which is closed: the service keeps the app alive meanwhile. */
    private fun adopt(next: VoicePeer) {
        peer?.close()
        peer = next
        next.onOpen = { if (it === peer && state != VoiceState.Off) peerOpened() }
        next.onEnded = { ended, reason -> if (ended === peer && state != VoiceState.Off) failed(reason) }
        next.onEvent = { from, type ->
            val activity = VoiceActivity.from(type)
            if (from === peer && state is VoiceState.Live && activity != null) {
                mutableStatus.update { it.copy(state = VoiceState.Live(activity)) }
            }
        }
    }

    private fun peerOpened() {
        opened = true
        failures = 0
        mutableStatus.update { it.copy(state = VoiceState.Live(VoiceActivity.Idle)) }
        val client = client ?: return
        scope.launch {
            // Until the Mac hears this it holds back notices, so try a few times.
            repeat(3) {
                if (runCatching { client.opened() }.isSuccess) return@launch
                delay(1.seconds)
            }
        }
    }

    private fun failed(reason: String) {
        failures += 1
        if (!opened || failures > MAX_FAILURES) return finish(error = reason)
        // At once the first time (usually a network switch), then back off.
        val delay = if (failures == 1) Duration.ZERO else (1 shl (failures - 2)).seconds
        connect(resume = true, reason = reason, after = delay)
    }

    private fun finish(error: String?) {
        attempt?.cancel()
        attempt = null
        peer?.close()
        peer = null
        route.end()
        mutableStatus.update { it.copy(state = VoiceState.Off, error = error) }
    }

    private companion object {
        /** Calls in a row that end or never open before voice gives up. */
        const val MAX_FAILURES = 5
        const val MIC_OFF = "Microphone access is off. Allow it for Birdsong in Settings → Apps → Birdsong → Permissions."
    }
}
