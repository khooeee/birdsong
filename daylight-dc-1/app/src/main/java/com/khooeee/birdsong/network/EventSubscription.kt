package com.khooeee.birdsong.network

import kotlin.coroutines.cancellation.CancellationException
import kotlin.time.Duration
import kotlin.time.Duration.Companion.seconds
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.serialization.SerializationException

/**
 * Keeps one event stream open while started, reconnecting with backoff. Screens start it when the app comes to
 * the foreground and stop it when it leaves, so the Mac sends alerts while nobody is watching.
 */
class EventSubscription(
    private val client: BirdsongClient,
    private val path: List<String>,
    private val scope: CoroutineScope,
    private val onEvent: (RemoteEvent) -> Unit,
) {
    private val mutableState = MutableStateFlow<StreamState>(StreamState.Connecting(again = false))
    val state: StateFlow<StreamState> = mutableState.asStateFlow()

    private var job: Job? = null
    private var hasBeenLive = false

    fun start() {
        if (job != null) return
        job = scope.launch { run() }
    }

    fun stop() {
        job?.cancel()
        job = null
    }

    private suspend fun run() {
        var wait = 1.seconds
        var timeout = FIRST_EVENT_TIMEOUT
        set(StreamState.Connecting(hasBeenLive))
        while (scope.isActive) {
            var failure = "Disconnected"
            try {
                client.events(path, timeout).collect { event ->
                    wait = 1.seconds
                    timeout = FIRST_EVENT_TIMEOUT
                    set(StreamState.Live)
                    onEvent(event)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                failure = e.message ?: "Disconnected"
                // These mean the Mac answered, so other requests can keep using the connection.
                if (e !is ServerError && e !is SerializationException) client.dropConnections()
            }
            set(StreamState.Offline(failure))
            delay(wait)
            wait = minOf(wait * 2, 15.seconds)
            timeout = minOf(timeout * 2, LONGEST_FIRST_EVENT_TIMEOUT)
        }
    }

    private fun set(next: StreamState) {
        if (next == StreamState.Live) hasBeenLive = true
        mutableState.value = next
    }

    private companion object {
        /** Generous next to the usual fraction of a second, and doubled per failure up to the longest for slow links. */
        val FIRST_EVENT_TIMEOUT: Duration = 8.seconds
        val LONGEST_FIRST_EVENT_TIMEOUT: Duration = 32.seconds
    }
}
