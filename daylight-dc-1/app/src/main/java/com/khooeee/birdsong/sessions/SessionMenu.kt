package com.khooeee.birdsong.sessions

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.khooeee.birdsong.model.Session

/** A rail row's long-press menu: Rename, Mark as Unread or Read, Fork, Pin or Unpin, and Continue with. */
@Composable
fun SessionMenu(
    session: Session,
    pinned: Boolean,
    expanded: Boolean,
    onDismiss: () -> Unit,
    model: MainViewModel,
    onRename: (Session) -> Unit,
) {
    var showAgents by remember(expanded) { mutableStateOf(false) }
    val pinUpdates by model.actions.pinUpdates.collectAsStateWithLifecycle()
    val pick = { action: () -> Unit ->
        onDismiss()
        action()
    }
    DropdownMenu(expanded = expanded, onDismissRequest = onDismiss) {
        if (showAgents) {
            ContinueWithItems(session, pinned, model, onBack = { showAgents = false }, onPicked = onDismiss)
            return@DropdownMenu
        }
        DropdownMenuItem(text = { Text("Rename…") }, onClick = { pick { onRename(session) } })
        val unread = !session.isUnread
        DropdownMenuItem(
            text = { Text(if (unread) "Mark as Unread" else "Mark as Read") },
            onClick = { pick { model.setUnread(unread, session) } },
        )
        DropdownMenuItem(
            text = { Text("Fork") },
            enabled = session.supportsFork != false,
            onClick = { pick { model.actions.fork(session) } },
        )
        if (!session.isHome && session.id !in pinUpdates) {
            DropdownMenuItem(
                text = { Text(if (pinned) "Unpin" else "Pin") },
                onClick = { pick { model.actions.setPinned(!pinned, session.id) } },
            )
        }
        DropdownMenuItem(
            text = { Text("Continue with") },
            enabled = session.cwd.isNotBlank(),
            trailingIcon = { Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null) },
            onClick = { showAgents = true },
        )
    }
}

/** The Mac's installed agents, alphabetically; picking one starts a session that takes over in the same folders. */
@Composable
private fun ContinueWithItems(session: Session, pinned: Boolean, model: MainViewModel, onBack: () -> Unit, onPicked: () -> Unit) {
    val agents by model.actions.agents.collectAsStateWithLifecycle()
    var failed by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        failed = runCatching { model.actions.loadAgents() }.isFailure
    }
    DropdownMenuItem(
        text = { Text("Continue with") },
        leadingIcon = { Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Back") },
        onClick = onBack,
    )
    HorizontalDivider()
    val known = agents
    when {
        known == null && failed -> DropdownMenuItem(text = { Text("Couldn't reach your Mac") }, enabled = false, onClick = {})
        known == null -> DropdownMenuItem(text = { Text("Loading…") }, enabled = false, onClick = {})
        known.isEmpty() -> DropdownMenuItem(text = { Text("No agents installed") }, enabled = false, onClick = {})
        else -> known.forEach { agent ->
            DropdownMenuItem(
                text = { Text(agent.label) },
                onClick = {
                    onPicked()
                    model.actions.continueWith(agent, session, pinned)
                },
            )
        }
    }
}
