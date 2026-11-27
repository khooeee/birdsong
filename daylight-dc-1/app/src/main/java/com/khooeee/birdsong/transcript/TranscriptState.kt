package com.khooeee.birdsong.transcript

import com.khooeee.birdsong.model.RemoteTurn
import com.khooeee.birdsong.network.BirdsongClient
import com.khooeee.birdsong.network.EventSubscription
import com.khooeee.birdsong.network.RemoteEvent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** One session's prompts and replies, streaming, and the calls to send, steer or stop. */
class TranscriptState(private val client: BirdsongClient, val sessionId: String, private val scope: CoroutineScope) {
    private val mutableTurns = MutableStateFlow<List<RemoteTurn>?>(null)
    /** null until the first reset arrives. */
    val turns: StateFlow<List<RemoteTurn>?> = mutableTurns.asStateFlow()

    private val subscription = EventSubscription(client, listOf("sessions", sessionId, "events"), scope, ::handle)
    val connection = subscription.state

    fun start() = subscription.start()

    fun stop() = subscription.stop()

    /** Sends, or steers while running; `onFailed` gets the text back to restore. */
    fun send(text: String, onFailed: (String, Exception) -> Unit) {
        scope.launch {
            try {
                client.sendPrompt(text, sessionId)
            } catch (e: Exception) {
                onFailed(text, e)
            }
        }
    }

    /** Stops the running turn, or a scheduled quota continuation. */
    fun cancel(onFailed: (Exception) -> Unit) {
        scope.launch {
            try {
                client.cancel(sessionId)
            } catch (e: Exception) {
                onFailed(e)
            }
        }
    }

    private fun handle(event: RemoteEvent) {
        when (event) {
            is RemoteEvent.Reset -> mutableTurns.value = event.turns
            is RemoteEvent.Turn -> mutableTurns.update { turns ->
                val current = turns.orEmpty()
                val index = current.indexOfFirst { it.id == event.turn.id }
                when {
                    index < 0 -> current + event.turn
                    current[index] == event.turn -> current
                    else -> current.toMutableList().also { it[index] = event.turn }
                }
            }
            else -> Unit
        }
    }
}
