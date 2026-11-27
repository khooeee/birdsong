package com.khooeee.birdsong.sessions

import com.khooeee.birdsong.model.Session
import com.khooeee.birdsong.model.SessionAgent
import com.khooeee.birdsong.network.BirdsongClient
import com.khooeee.birdsong.ui.UserAlert
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** A rail row's menu actions: pin, fork and continue with another agent. Failures become alerts. */
class SessionActions(
    private val client: BirdsongClient,
    private val scope: CoroutineScope,
    private val onStarted: (Session) -> Unit,
    private val onAlert: (UserAlert) -> Unit,
) {
    private val pendingPins = MutableStateFlow(emptySet<String>())
    /** Sessions with a pin or unpin on its way; their menu leaves the item out meanwhile. */
    val pinUpdates: StateFlow<Set<String>> = pendingPins.asStateFlow()

    private val installedAgents = MutableStateFlow<List<SessionAgent>?>(null)
    /** The Mac's last answer, so reopening Continue with doesn't wait on it. */
    val agents: StateFlow<List<SessionAgent>?> = installedAgents.asStateFlow()

    fun setPinned(pin: Boolean, sessionId: String) {
        if (sessionId in pendingPins.value) return
        pendingPins.update { it + sessionId }
        scope.launch {
            try {
                client.setPinned(pin, sessionId)
            } catch (e: Exception) {
                onAlert(UserAlert(if (pin) "Couldn't pin session" else "Couldn't unpin session", e.message.orEmpty()))
            } finally {
                pendingPins.update { it - sessionId }
            }
        }
    }

    fun fork(session: Session) {
        start("Couldn't fork session", "The fork failed to start.") { client.forkSession(session.id) }
    }

    fun continueWith(agent: SessionAgent, source: Session, pin: Boolean) {
        start("Couldn't continue with ${agent.label}", "The session failed to start.") {
            client.continueSession(source.id, agent, pin)
        }
    }

    /** Refreshes the installed agents; throws when the Mac can't be reached and none are known yet. */
    suspend fun loadAgents() {
        try {
            installedAgents.value = client.availableAgents().sortedBy { it.label.lowercase() }
        } catch (e: Exception) {
            if (installedAgents.value == null) throw e
        }
    }

    private fun start(title: String, fallback: String, create: suspend () -> Session) {
        scope.launch {
            try {
                val session = create()
                if (session.status == Session.Status.Error) {
                    onAlert(UserAlert(title, session.error ?: fallback))
                } else {
                    onStarted(session)
                }
            } catch (e: Exception) {
                onAlert(UserAlert(title, e.message.orEmpty()))
            }
        }
    }
}
