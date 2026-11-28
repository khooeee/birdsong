package com.khooeee.birdsong.model

import kotlinx.serialization.Serializable

/** One agent's usage and limits, read on the Mac on request; a failed read keeps the agent with `error`. */
@Serializable
data class AgentUsage(
    val agent: String,
    val name: String,
    val plan: String? = null,
    val meters: List<UsageMeter> = emptyList(),
    /** Usage that is not a limit, or where the limits live instead. */
    val notes: List<String> = emptyList(),
    /** Set instead of meters for agents whose usage lives on their website. */
    val page: UsagePage? = null,
    val error: String? = null,
)
