package com.khooeee.birdsong.model

import kotlinx.serialization.Serializable

/** Where an agent shows its own usage, for agents the Mac does not read. */
@Serializable
data class UsagePage(
    val url: String,
    /** How to reach the numbers once the page is open. */
    val hint: String? = null,
)
