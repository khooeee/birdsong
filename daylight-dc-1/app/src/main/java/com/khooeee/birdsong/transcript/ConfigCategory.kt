package com.khooeee.birdsong.transcript

/** Which picker a composer pill opens: the model or its reasoning effort. */
enum class ConfigCategory(val raw: String, val label: String) {
    Model("model", "Model"),
    Effort("thought_level", "Reasoning effort"),
}
