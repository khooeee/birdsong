package com.khooeee.birdsong.transcript

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.khooeee.birdsong.model.RemoteTurn
import com.khooeee.birdsong.model.Session
import com.khooeee.birdsong.model.SessionAgent
import com.khooeee.birdsong.network.BirdsongClient
import com.khooeee.birdsong.turndetails.TurnDetailsDialog
import com.khooeee.birdsong.ui.EmptyState
import com.khooeee.birdsong.ui.PaneHeader
import com.khooeee.birdsong.ui.UserAlert
import com.khooeee.birdsong.voice.VoiceButton
import com.khooeee.birdsong.voice.VoiceController

/** The open session: its title and mic, streaming transcript, and the composer. */
@Composable
fun TranscriptPane(
    client: BirdsongClient,
    session: Session,
    onAlert: (UserAlert) -> Unit,
    drafts: Drafts,
    voice: VoiceController,
    modifier: Modifier = Modifier,
) {
    val scope = rememberCoroutineScope()
    val state = remember(session.id) { TranscriptState(client, session.id, scope) }
    LifecycleStartEffect(state) {
        state.start()
        onStopOrDispose { state.stop() }
    }
    val turns by state.turns.collectAsStateWithLifecycle()
    val connection by state.connection.collectAsStateWithLifecycle()
    var details by remember { mutableStateOf<Pair<String, Boolean>?>(null) }
    val showError = { e: Exception -> onAlert(UserAlert("Couldn't reach Birdsong", e.message.orEmpty())) }

    Column(modifier) {
        PaneHeader(session.firstLine, subtitle = connection.notice ?: SessionAgent.labelFor(session.agent)) {
            VoiceButton(voice, client.voice, session.id)
        }
        Box(Modifier.weight(1f)) {
            val current = turns
            when {
                current == null -> EmptyState(loading = true)
                current.isEmpty() -> EmptyState("No messages yet")
                else -> TranscriptList(current, onDetails = { turnId, atEnd -> details = turnId to atEnd })
            }
        }
        Composer(
            client = client,
            session = session,
            drafts = drafts,
            isRunning = turns.orEmpty().any { it.status == RemoteTurn.Status.Running && it.queued != true },
            onSend = { text, restore ->
                state.send(text) { failed, e ->
                    restore(failed)
                    showError(e)
                }
            },
            onStop = { state.cancel(showError) },
            onAlert = onAlert,
        )
    }
    details?.let { (turnId, atEnd) ->
        TurnDetailsDialog(client, session.id, turnId, openAtEnd = atEnd, onDismiss = { details = null })
    }
}
