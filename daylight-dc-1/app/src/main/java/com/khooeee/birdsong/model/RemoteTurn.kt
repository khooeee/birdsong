package com.khooeee.birdsong.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** One prompt and its reply, trimmed by the desktop to what a phone or tablet shows. */
@Serializable
data class RemoteTurn(
    val id: String,
    val at: Double = 0.0,
    val status: Status = Status.Complete,
    val user: String = "",
    /** The agent began this turn itself (e.g. a reminder), so there is no prompt to show. */
    val agentStarted: Boolean? = null,
    val queued: Boolean? = null,
    val assistant: String? = null,
    /** Latest tool title (or "Thinking") while the turn runs. */
    val activity: String? = null,
) {
    @Serializable
    enum class Status {
        @SerialName("running") Running,
        @SerialName("complete") Complete,
        @SerialName("stopped") Stopped,
    }
}
