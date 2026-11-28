package com.khooeee.birdsong.network

import com.khooeee.birdsong.model.AgentUsage
import com.khooeee.birdsong.model.ConfigPickers
import com.khooeee.birdsong.model.Session
import com.khooeee.birdsong.model.SessionAgent
import com.khooeee.birdsong.model.UsageAgent
import kotlin.time.Duration
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/** The desktop app's remote API: sessions, prompts, settings and event streams. */
class BirdsongClient(val config: ServerConfig) {
    private val http = BirdsongHttp(config)

    /** Fails unless the server answers and accepts the token. */
    suspend fun checkConnection() {
        http.send(listOf("sessions"))
    }

    /** Throws a 409 `ServerError` when `cwd` doesn't exist on the Mac, unless `createFolder` is set. */
    suspend fun createSession(agent: SessionAgent, cwd: String, pin: Boolean, createFolder: Boolean = false): Session {
        val body = buildJsonObject {
            put("agent", agent.raw)
            put("cwd", cwd)
            put("pin", pin)
            put("createFolder", createFolder)
        }
        return BirdsongJson.decodeFromString(http.send(listOf("sessions"), "POST", body.toString()))
    }

    /** Session Folders the Mac suggests for new sessions, most recent first, including ones picked on the Mac. */
    suspend fun recentFolders(): List<String> = BirdsongJson.decodeFromString(http.send(listOf("recent-folders")))

    /** Agents installed on the Mac; ones this build doesn't know are dropped. */
    suspend fun availableAgents(): List<SessionAgent> =
        BirdsongJson.decodeFromString<List<String>>(http.send(listOf("agents"))).mapNotNull(SessionAgent::fromRaw)

    /** Installed agents with usage to show, in display order. */
    suspend fun usageAgents(): List<UsageAgent> = BirdsongJson.decodeFromString(http.send(listOf("usage")))

    /** Runs the agent's own usage command on the Mac now; a failed read comes back with `error` set. */
    suspend fun usage(agent: String): AgentUsage = BirdsongJson.decodeFromString(http.send(listOf("usage", agent)))

    /** A new session with `agent` in this one's folders, prompted to read its transcript and carry on. */
    suspend fun continueSession(sessionId: String, agent: SessionAgent, pin: Boolean): Session {
        val body = buildJsonObject {
            put("agent", agent.raw)
            put("pin", pin)
        }
        return BirdsongJson.decodeFromString(http.send(listOf("sessions", sessionId, "continue"), "POST", body.toString()))
    }

    suspend fun setPinned(pinned: Boolean, sessionId: String) {
        http.send(listOf("sessions", sessionId, if (pinned) "pin" else "unpin"), "POST")
    }

    /** Shows or clears the unread dot, here and on the Mac. */
    suspend fun setUnread(unread: Boolean, sessionId: String) {
        http.send(listOf("sessions", sessionId, if (unread) "unread" else "read"), "POST")
    }

    /** A copy of the session with the same agent, folders and history, pinned if the source is. */
    suspend fun forkSession(sessionId: String): Session =
        BirdsongJson.decodeFromString(http.send(listOf("sessions", sessionId, "fork"), "POST"))

    /** Replaces the title; the agent stops naming the session. */
    suspend fun rename(sessionId: String, title: String) {
        http.send(listOf("sessions", sessionId, "rename"), "POST", buildJsonObject { put("title", title) }.toString())
    }

    /** Sends, or steers into the running turn where the agent supports it. */
    suspend fun sendPrompt(text: String, sessionId: String) {
        http.send(listOf("sessions", sessionId, "prompt"), "POST", buildJsonObject { put("text", text) }.toString())
    }

    suspend fun cancel(sessionId: String) {
        http.send(listOf("sessions", sessionId, "cancel"), "POST")
    }

    /** The model, effort and per-model choices; the Mac connects the session's agent first if needed. */
    suspend fun configPickers(sessionId: String): ConfigPickers =
        BirdsongJson.decodeFromString<ConfigPickers.Wire>(http.send(listOf("sessions", sessionId, "config"))).toPickers()

    /** Picks a model, effort or per-model setting and returns the updated choices. */
    suspend fun setConfigOption(configId: String, value: String, sessionId: String): ConfigPickers {
        val body = buildJsonObject {
            put("configId", configId)
            put("value", value)
        }
        val reply = http.send(listOf("sessions", sessionId, "config"), "POST", body.toString())
        return BirdsongJson.decodeFromString<ConfigPickers.Wire>(reply).toPickers()
    }

    /** Registers this tablet's FCM token for an alert when a turn finishes. */
    suspend fun registerDevice(fcmToken: String) {
        http.send(listOf("devices"), "POST", deviceBody(fcmToken))
    }

    /** Stops alerts to this tablet, e.g. after pairing with another Mac. */
    suspend fun unregisterDevice(fcmToken: String) {
        http.send(listOf("devices"), "DELETE", deviceBody(fcmToken))
    }

    /**
     * `path` is `["events"]` for the rail, `["sessions", id, "events"]` for one transcript, or
     * `["sessions", id, "turns", turnId, "events"]` for one turn in full.
     */
    fun events(path: List<String>, firstWithin: Duration): Flow<RemoteEvent> = http.events(path, firstWithin)

    fun dropConnections() = http.dropConnections()

    private fun deviceBody(token: String) = buildJsonObject {
        put("platform", "fcm")
        put("token", token)
    }.toString()
}
