package com.khooeee.birdsong.network

/** Builds server-sent events from lines; the desktop sends one `data:` line per event and `: ping` comments. */
class ServerSentEventParser {
    private var name = "message"

    /** The event this line completes, as its name and data, if any. */
    fun consume(line: String): Pair<String, String>? {
        when {
            line.startsWith("event:") -> name = line.substring(6).trim()
            line.startsWith("data:") -> return (name to line.substring(5)).also { name = "message" }
        }
        return null
    }
}
