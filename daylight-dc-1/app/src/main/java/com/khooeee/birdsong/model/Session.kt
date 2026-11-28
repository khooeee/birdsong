package com.khooeee.birdsong.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** One desktop session as the rail lists it. */
@Serializable
data class Session(
    val id: String,
    val title: String,
    val agent: String,
    val cwd: String = "",
    val status: Status = Status.Idle,
    val error: String? = null,
    val createdAt: Double = 0.0,
    /** When a quota retry continues the session, in epoch milliseconds. */
    val resumeAt: Double? = null,
    val modelConfig: SessionModelConfig? = null,
    /** A turn finished while the session was off screen; absent from an older Mac app. */
    val unread: Boolean? = null,
    /** The Home session, pinned above the others. Absent from an older Mac app. */
    val home: Boolean? = null,
    /** False when the agent can't fork; absent until one of its kind connects, or from an older Mac app. */
    val supportsFork: Boolean? = null,
) {
    @Serializable
    enum class Status {
        @SerialName("idle") Idle,
        @SerialName("connecting") Connecting,
        @SerialName("ready") Ready,
        @SerialName("running") Running,
        @SerialName("error") Error,
    }

    val isWorking: Boolean get() = status == Status.Running || status == Status.Connecting
    val isUnread: Boolean get() = unread == true
    val isHome: Boolean get() = home == true

    /** The title's first line, for headers and alerts. */
    val firstLine: String get() = title.lineSequence().firstOrNull { it.isNotBlank() } ?: title
}
