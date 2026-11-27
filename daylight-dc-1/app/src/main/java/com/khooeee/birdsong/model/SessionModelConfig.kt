package com.khooeee.birdsong.model

import kotlinx.serialization.Serializable

/** The agent's current model and reasoning effort, as display names. */
@Serializable
data class SessionModelConfig(val model: String? = null, val effort: String? = null) {
    val isEmpty: Boolean get() = model == null && effort == null
}
