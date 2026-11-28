package com.khooeee.birdsong.model

import kotlinx.serialization.Serializable

/** One step of a turn: a message, thought, tool call or subagent, trimmed by the desktop to its text. */
@Serializable
data class RemoteTurnItem(
    val id: String,
    /** `user`, `assistant`, `thought`, `tool`, …; a string so a newer Mac's roles still show. */
    val role: String = "",
    val at: Double = 0.0,
    val text: String = "",
    val queued: Boolean? = null,
    /** A tool's or subagent's state, e.g. `completed`. */
    val status: String? = null,
    /** What a subagent was asked to do. */
    val task: String? = null,
    /** How many images a tool returned; they stay on the Mac. */
    val images: Int? = null,
)
