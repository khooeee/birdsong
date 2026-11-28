package com.khooeee.birdsong.network

import com.khooeee.birdsong.model.RemoteTurn
import com.khooeee.birdsong.model.RemoteTurnDetail
import com.khooeee.birdsong.model.SessionList
import kotlinx.serialization.Serializable

/** One server-sent event from `/events`, `/sessions/:id/events` or `/sessions/:id/turns/:turnId/events`. */
sealed interface RemoteEvent {
    data class Sessions(val list: SessionList) : RemoteEvent
    data class Reset(val turns: List<RemoteTurn>) : RemoteEvent
    data class Turn(val turn: RemoteTurn) : RemoteEvent
    data class TurnDetail(val detail: RemoteTurnDetail) : RemoteEvent

    /** The turn was removed, so there is nothing to reconnect to. */
    data object TurnGone : RemoteEvent

    companion object {
        @Serializable
        private data class ResetBody(val turns: List<RemoteTurn> = emptyList())

        @Serializable
        private data class TurnBody(val turn: RemoteTurn)

        /** null for event names this app does not know yet. */
        fun decode(name: String, data: String): RemoteEvent? = when (name) {
            "sessions" -> Sessions(BirdsongJson.decodeFromString<SessionList>(data))
            "reset" -> Reset(BirdsongJson.decodeFromString<ResetBody>(data).turns)
            "turn" -> Turn(BirdsongJson.decodeFromString<TurnBody>(data).turn)
            "turnDetail" -> TurnDetail(BirdsongJson.decodeFromString<RemoteTurnDetail>(data))
            "turnGone" -> TurnGone
            else -> null
        }
    }
}
