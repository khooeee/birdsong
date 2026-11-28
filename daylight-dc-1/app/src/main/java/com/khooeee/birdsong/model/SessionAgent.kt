package com.khooeee.birdsong.model

/** Agents the Mac can start; `raw` is what the desktop calls each. */
enum class SessionAgent(val raw: String, val label: String) {
    Antigravity("antigravity", "Antigravity"),
    Claude("claude", "Claude Code"),
    Codex("codex", "Codex"),
    Copilot("copilot", "Copilot"),
    Cursor("cursor", "Cursor"),
    Devin("devin", "Devin"),
    Kilo("kilo", "Kilo"),
    Vibe("vibe", "Mistral Vibe"),
    OpenCode("opencode", "OpenCode"),
    Pi("pi", "Pi");

    companion object {
        /** null for agents this build doesn't know. */
        fun fromRaw(raw: String): SessionAgent? = entries.firstOrNull { it.raw == raw }

        /** The label for a session's agent, or its raw name from a newer Mac. */
        fun labelFor(raw: String): String = fromRaw(raw)?.label ?: raw
    }
}
