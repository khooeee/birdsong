package com.khooeee.birdsong.voice

import android.content.Context
import com.khooeee.birdsong.network.BirdsongJson
import com.khooeee.birdsong.network.VoiceIceServer
import java.io.IOException
import kotlin.time.Duration
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.Duration.Companion.seconds
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Job
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.webrtc.AudioSource
import org.webrtc.AudioTrack
import org.webrtc.DataChannel
import org.webrtc.IceCandidate
import org.webrtc.MediaConstraints
import org.webrtc.MediaStream
import org.webrtc.PeerConnection
import org.webrtc.SessionDescription

/**
 * The tablet's side of a voice call: mic up, agent audio down (WebRTC plays it). The Mac drives the call over its own
 * sideband; the `oai-events` channel here only shows what the agent is doing and when the call ends. Use it on the
 * main thread; WebRTC's callbacks hop there.
 */
class VoicePeer(context: Context, iceServers: List<VoiceIceServer>) {
    var onOpen: ((VoicePeer) -> Unit)? = null

    /** Once per peer: the call closed, failed, never connected, or dropped for too long. */
    var onEnded: ((VoicePeer, String) -> Unit)? = null

    /** Each realtime event type the agent sends (streaming deltas skipped). */
    var onEvent: ((VoicePeer, String) -> Unit)? = null

    private val scope = MainScope()

    /** With TURN servers, wait for a relay candidate: on cellular it is often the only path that works. */
    private val expectsRelay = iceServers.any { it.isRelay }
    private var hasRelay = false
    private val gathered = CompletableDeferred<Unit>()
    private var gatherSettle: Job? = null
    private var connectTimer: Job? = null
    private var dropTimer: Job? = null
    private var finished = false

    private val factory = VoicePeerFactory.get(context)
    private val source: AudioSource = factory.createAudioSource(MediaConstraints())
    private val mic: AudioTrack = factory.createAudioTrack("mic", source)
    private var connection: PeerConnection?
    private var channel: DataChannel?

    init {
        val config = PeerConnection.RTCConfiguration(iceServers.map(::rtcServer))
        config.sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
        val connection = factory.createPeerConnection(config, ConnectionObserver())
        if (connection == null) {
            mic.dispose()
            source.dispose()
            throw IOException("Couldn't start the voice connection.")
        }
        connection.addTrack(mic, listOf("mic"))
        val channel = connection.createDataChannel("oai-events", DataChannel.Init().apply { ordered = true })
        channel.registerObserver(ChannelObserver(channel))
        this.connection = connection
        this.channel = channel
    }

    /** The offer with its ICE candidates: Inworld takes a single exchange, no trickle. */
    suspend fun offer(): String {
        val connection = connection ?: throw IOException("The voice connection closed.")
        val offer = awaitSdp { connection.createOffer(it, MediaConstraints()) } ?: throw IOException("No voice offer.")
        awaitSdp { connection.setLocalDescription(it, offer) }
        // Inworld's sample: 500 ms after the last candidate, or 3 s at most.
        withTimeoutOrNull(GATHER_CAP) { gathered.await() }
        return this.connection?.localDescription?.description ?: throw IOException("No voice offer.")
    }

    suspend fun accept(answer: String) {
        val connection = connection ?: throw IOException("The voice connection closed.")
        awaitSdp { connection.setRemoteDescription(it, SessionDescription(SessionDescription.Type.ANSWER, answer)) }
        connectTimer = after(CONNECT_TIMEOUT) { end("The call didn't connect.") }
    }

    fun close() {
        val connection = connection ?: return
        finished = true
        scope.cancel()
        channel?.unregisterObserver()
        channel?.dispose()
        channel = null
        connection.dispose()
        this.connection = null
        mic.dispose()
        source.dispose()
    }

    private fun candidateFound(sdp: String) {
        if (sdp.contains(" typ relay")) hasRelay = true
        if (expectsRelay && !hasRelay) return
        gatherSettle?.cancel()
        gatherSettle = after(GATHER_SETTLE) { gathered.complete(Unit) }
    }

    private fun connectionChanged(state: PeerConnection.PeerConnectionState) {
        when (state) {
            PeerConnection.PeerConnectionState.CONNECTED -> {
                dropTimer?.cancel()
                dropTimer = null
            }
            PeerConnection.PeerConnectionState.DISCONNECTED -> {
                if (dropTimer == null) dropTimer = after(DROP_GRACE) { end("The connection dropped.") }
            }
            PeerConnection.PeerConnectionState.FAILED -> end("The connection failed.")
            else -> Unit
        }
    }

    private fun channelChanged(state: DataChannel.State) {
        if (finished) return
        when (state) {
            DataChannel.State.OPEN -> {
                connectTimer?.cancel()
                onOpen?.invoke(this)
            }
            DataChannel.State.CLOSED -> end("The call ended.")
            else -> Unit
        }
    }

    private fun received(type: String) {
        if (!finished) onEvent?.invoke(this, type)
    }

    private fun end(reason: String) {
        if (finished) return
        finished = true
        connectTimer?.cancel()
        dropTimer?.cancel()
        onEnded?.invoke(this, reason)
    }

    private fun after(delay: Duration, action: () -> Unit) = scope.launch {
        delay(delay)
        action()
    }

    /** WebRTC calls observers on its own threads; hop to the main thread with plain values. */
    private fun hop(action: () -> Unit) {
        scope.launch { action() }
    }

    private inner class ConnectionObserver : PeerConnection.Observer {
        override fun onIceCandidate(candidate: IceCandidate) {
            val sdp = candidate.sdp
            hop { candidateFound(sdp) }
        }

        override fun onIceGatheringChange(state: PeerConnection.IceGatheringState) {
            if (state == PeerConnection.IceGatheringState.COMPLETE) hop { gathered.complete(Unit) }
        }

        override fun onConnectionChange(state: PeerConnection.PeerConnectionState) = hop { connectionChanged(state) }

        override fun onSignalingChange(state: PeerConnection.SignalingState) = Unit
        override fun onIceConnectionChange(state: PeerConnection.IceConnectionState) = Unit
        override fun onIceConnectionReceivingChange(receiving: Boolean) = Unit
        override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>) = Unit
        override fun onAddStream(stream: MediaStream) = Unit
        override fun onRemoveStream(stream: MediaStream) = Unit
        override fun onDataChannel(channel: DataChannel) = Unit
        override fun onRenegotiationNeeded() = Unit
    }

    private inner class ChannelObserver(private val channel: DataChannel) : DataChannel.Observer {
        override fun onStateChange() {
            val state = channel.state()
            hop { channelChanged(state) }
        }

        override fun onMessage(buffer: DataChannel.Buffer) {
            val type = eventType(buffer) ?: return
            hop { received(type) }
        }

        override fun onBufferedAmountChange(previousAmount: Long) = Unit
    }

    private companion object {
        /** No packets this long usually means the network changed; a new call beats waiting for ICE to fail. */
        val DROP_GRACE = 4.seconds
        val CONNECT_TIMEOUT = 15.seconds
        val GATHER_CAP = 3.seconds
        val GATHER_SETTLE = 500.milliseconds

        fun rtcServer(server: VoiceIceServer): PeerConnection.IceServer =
            PeerConnection.IceServer.builder(server.urls)
                .apply { server.username?.let(::setUsername) }
                .apply { server.credential?.let(::setPassword) }
                .createIceServer()

        fun eventType(buffer: DataChannel.Buffer): String? {
            if (buffer.binary) return null
            val bytes = ByteArray(buffer.data.remaining()).also(buffer.data::get)
            val event = runCatching { BirdsongJson.parseToJsonElement(bytes.decodeToString()).jsonObject }.getOrNull()
            val type = event?.get("type")?.jsonPrimitive?.contentOrNull ?: return null
            return type.takeUnless { it.endsWith(".delta") }
        }
    }
}
