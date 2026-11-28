package com.khooeee.birdsong.model

import kotlinx.serialization.Serializable

/** An agent the Usage dialog shows, labelled before its read lands. */
@Serializable
data class UsageAgent(val agent: String, val name: String)
