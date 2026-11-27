package com.khooeee.birdsong.network

/** Where an event stream is: connecting, live, or retrying after a failure. */
sealed interface StreamState {
    /** `again` once the stream has been live. */
    data class Connecting(val again: Boolean) : StreamState
    data object Live : StreamState

    /** Still retrying. */
    data class Offline(val message: String) : StreamState

    /** What to show while not live. */
    val notice: String?
        get() = when (this) {
            is Connecting -> if (again) "Reconnecting…" else "Connecting…"
            Live -> null
            is Offline -> "Reconnecting: $message"
        }
}
