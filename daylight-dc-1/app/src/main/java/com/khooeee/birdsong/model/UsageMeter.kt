package com.khooeee.birdsong.model

import kotlinx.serialization.Serializable

/** One limit an agent enforces: how much of it is used and when it resets. */
@Serializable
data class UsageMeter(
    val label: String,
    /** 0–100, or null when the agent reports no percentage. */
    val usedPercent: Double? = null,
    /** Epoch ms of the next reset. */
    val resetsAt: Double? = null,
    /** Extra context, e.g. "$4.20 left". */
    val detail: String? = null,
)
