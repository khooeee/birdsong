package com.khooeee.birdsong.turndetails

import androidx.compose.foundation.gestures.scrollBy
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.khooeee.birdsong.model.RemoteTurn
import com.khooeee.birdsong.network.BirdsongClient
import com.khooeee.birdsong.network.StreamState
import com.khooeee.birdsong.ui.EmptyState
import com.khooeee.birdsong.ui.PaneHeader

/**
 * One turn's prompt, thoughts, tool calls, steers, subagents and reply, live. Over the transcript, whose streams
 * stay open underneath and keep the session read. Opened from the reply, it starts at the end and follows it.
 */
@Composable
fun TurnDetailsDialog(client: BirdsongClient, sessionId: String, turnId: String, openAtEnd: Boolean, onDismiss: () -> Unit) {
    val scope = rememberCoroutineScope()
    val state = remember(turnId) { TurnDetailsState(client, sessionId, turnId, scope) }
    LifecycleStartEffect(state) {
        state.start()
        onStopOrDispose { state.stop() }
    }
    val snapshot by state.snapshot.collectAsStateWithLifecycle()
    val connection by state.connection.collectAsStateWithLifecycle()
    val subtitle = when {
        snapshot.status == null || snapshot.gone -> null
        connection is StreamState.Offline -> "Reconnecting…"
        snapshot.status == RemoteTurn.Status.Running -> "Working…"
        snapshot.status == RemoteTurn.Status.Stopped -> "Stopped"
        else -> null
    }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(Modifier.fillMaxWidth(0.9f).fillMaxHeight(0.9f), shape = MaterialTheme.shapes.large) {
            Column {
                PaneHeader("Turn Details", subtitle) {
                    IconButton(onClick = onDismiss) { Icon(Icons.Filled.Close, contentDescription = "Close") }
                }
                Box(Modifier.weight(1f)) {
                    val offline = connection as? StreamState.Offline
                    when {
                        snapshot.gone -> EmptyState("This turn was removed")
                        snapshot.status != null -> Steps(snapshot, openAtEnd)
                        offline != null -> EmptyState("Can't load this turn", offline.message)
                        else -> EmptyState(loading = true)
                    }
                }
            }
        }
    }
}

@Composable
private fun Steps(snapshot: TurnDetailsState.Snapshot, openAtEnd: Boolean) {
    val listState = rememberLazyListState()
    var followsEnd by remember { mutableStateOf(openAtEnd) }
    LaunchedEffect(listState) {
        snapshotFlow { listState.isScrollInProgress to !listState.canScrollForward }
            .collect { (scrolling, atEnd) -> if (scrolling) followsEnd = atEnd }
    }
    LaunchedEffect(snapshot) {
        if (!followsEnd || snapshot.steps.isEmpty()) return@LaunchedEffect
        listState.scrollToItem(snapshot.steps.lastIndex)
        // Past the last row's top to its bottom; LazyColumn stops at the end.
        listState.scrollBy(1_000_000f)
    }
    LazyColumn(Modifier.fillMaxSize(), state = listState, contentPadding = PaddingValues(vertical = 8.dp)) {
        items(snapshot.steps, key = { it.id }) { TurnStepRow(it) }
    }
}
