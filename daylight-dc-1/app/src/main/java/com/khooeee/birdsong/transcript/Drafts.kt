package com.khooeee.birdsong.transcript

/** Unsent prompts by session id. Kept outside the open session's composition, so switching sessions keeps them. */
class Drafts {
    private val bySession = mutableMapOf<String, String>()

    operator fun get(sessionId: String): String = bySession[sessionId].orEmpty()

    operator fun set(sessionId: String, text: String) {
        if (text.isEmpty()) bySession.remove(sessionId) else bySession[sessionId] = text
    }
}
