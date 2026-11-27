package com.khooeee.birdsong.model

/** One of the agent's select settings: the model, its effort, or a per-model setting. */
data class ConfigOption(
    val id: String,
    val name: String,
    val category: String?,
    val currentValue: String,
    val groups: List<Group>,
) {
    data class Choice(val value: String, val name: String, val description: String?)

    /** Choices under one heading; `name` is null for choices the agent did not group. */
    data class Group(val name: String?, val choices: List<Choice>)
}
