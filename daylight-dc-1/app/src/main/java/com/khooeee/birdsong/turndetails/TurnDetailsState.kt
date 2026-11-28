package com.khooeee.birdsong.turndetails

import com.khooeee.birdsong.model.RemoteTurn
import com.khooeee.birdsong.model.RemoteTurnItem
import com.khooeee.birdsong.network.BirdsongClient
import com.khooeee.birdsong.network.EventSubscription
import com.khooeee.birdsong.network.RemoteEvent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** One turn in full, live: each event lists every step's id in order and only the steps that changed. */
class TurnDetailsState(client: BirdsongClient, sessionId: String, turnId: String, scope: CoroutineScope) {
    /** The turn's steps in order, its status, or that it was removed (a discarded queued prompt). */
    data class Snapshot(val steps: List<RemoteTurnItem>, val status: RemoteTurn.Status?, val gone: Boolean)

    private val items = mutableMapOf<String, RemoteTurnItem>()
    private val mutableSnapshot = MutableStateFlow(Snapshot(emptyList(), status = null, gone = false))
    val snapshot: StateFlow<Snapshot> = mutableSnapshot.asStateFlow()

    private val subscription = EventSubscription(client, listOf("sessions", sessionId, "turns", turnId, "events"), scope) {
        handle(it)
    }
    val connection = subscription.state

    fun start() {
        if (!mutableSnapshot.value.gone) subscription.start()
    }

    fun stop() = subscription.stop()

    private fun handle(event: RemoteEvent) {
        when (event) {
            is RemoteEvent.TurnDetail -> {
                for (item in event.detail.items) items[item.id] = item
                val steps = event.detail.order.mapNotNull(items::get)
                mutableSnapshot.value = Snapshot(steps, event.detail.status, gone = false)
            }
            RemoteEvent.TurnGone -> {
                subscription.stop()
                mutableSnapshot.value = Snapshot(emptyList(), status = null, gone = true)
            }
            else -> Unit
        }
    }
}
