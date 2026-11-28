package com.khooeee.birdsong.model

import kotlinx.serialization.Serializable

/** What the model and effort pickers offer, from `GET /sessions/:id/config`. */
data class ConfigPickers(val options: List<ConfigOption>, val modelConfig: SessionModelConfig?) {
    /** The desktop's JSON: each option lists plain choices or `{ name, options }` groups. */
    @Serializable
    internal data class Wire(val options: List<WireOption> = emptyList(), val modelConfig: SessionModelConfig? = null) {
        fun toPickers() = ConfigPickers(options.map(WireOption::toOption), modelConfig)
    }

    @Serializable
    internal data class WireOption(
        val id: String,
        val name: String,
        val category: String? = null,
        val currentValue: String,
        val options: List<WireEntry> = emptyList(),
    ) {
        /** Consecutive ungrouped choices share one unnamed group. */
        fun toOption(): ConfigOption {
            val groups = mutableListOf<ConfigOption.Group>()
            for (entry in options) {
                val nested = entry.options
                if (nested != null) {
                    groups += ConfigOption.Group(entry.name, nested.map { it.toChoice() })
                } else if (entry.value != null) {
                    val choice = entry.toChoice()
                    val last = groups.lastOrNull()
                    if (last != null && last.name == null) {
                        groups[groups.lastIndex] = last.copy(choices = last.choices + choice)
                    } else {
                        groups += ConfigOption.Group(null, listOf(choice))
                    }
                }
            }
            return ConfigOption(id, name, category, currentValue, groups)
        }
    }

    @Serializable
    internal data class WireEntry(
        val value: String? = null,
        val name: String,
        val description: String? = null,
        val options: List<WireEntry>? = null,
    ) {
        fun toChoice() = ConfigOption.Choice(value.orEmpty(), name, description)
    }
}
