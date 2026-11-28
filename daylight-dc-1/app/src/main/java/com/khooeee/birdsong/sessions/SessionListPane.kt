package com.khooeee.birdsong.sessions

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.khooeee.birdsong.model.Session
import com.khooeee.birdsong.network.StreamState
import com.khooeee.birdsong.ui.EmptyState
import com.khooeee.birdsong.ui.PaneHeader

/** The desktop rail, live: pinned then recent, filtered by title. Home always shows. */
@Composable
fun SessionListPane(model: MainViewModel, onPair: () -> Unit, modifier: Modifier = Modifier) {
    val list by model.list.collectAsStateWithLifecycle()
    val connection by model.connection.collectAsStateWithLifecycle()
    val selectedId by model.selectedId.collectAsStateWithLifecycle()
    var filter by rememberSaveable { mutableStateOf("") }
    var creating by remember { mutableStateOf(false) }
    var renaming by remember { mutableStateOf<Session?>(null) }

    Column(modifier) {
        PaneHeader("Sessions", subtitle = connection.notice?.takeIf { list != null }) {
            IconButton(onClick = { creating = true }) { Icon(Icons.Filled.Add, contentDescription = "New session") }
            IconButton(onClick = onPair) { Icon(Icons.Filled.Settings, contentDescription = "Pairing") }
        }
        OutlinedTextField(
            value = filter,
            onValueChange = { filter = it },
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
            singleLine = true,
            placeholder = { Text("Search") },
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
            trailingIcon = {
                if (filter.isNotEmpty()) {
                    IconButton(onClick = { filter = "" }) { Icon(Icons.Filled.Clear, contentDescription = "Clear search") }
                }
            },
        )
        Box(Modifier.weight(1f)) {
            val current = list
            val state = connection
            when {
                current == null && state is StreamState.Offline ->
                    EmptyState("Can't reach Birdsong", "${state.message}\nCheck Tailscale is on and Birdsong is open.")
                current == null -> EmptyState(loading = true)
                current.all.isEmpty() -> EmptyState("No sessions")
                else -> SessionColumn(current.pinned.visible(filter), current.unpinned.visible(filter), selectedId, model) {
                    renaming = it
                }
            }
        }
    }
    if (creating) {
        NewSessionDialog(
            client = model.client,
            recent = list?.let { it.unpinned + it.pinned }.orEmpty(),
            onCreated = { model.select(it.id) },
            onDismiss = { creating = false },
        )
    }
    renaming?.let { RenameDialog(model.client, it, onDismiss = { renaming = null }) }
}

@Composable
private fun SessionColumn(
    pinned: List<Session>,
    recent: List<Session>,
    selectedId: String?,
    model: MainViewModel,
    onRename: (Session) -> Unit,
) {
    LazyColumn(Modifier.fillMaxWidth()) {
        if (pinned.isNotEmpty()) {
            item(key = "pinned-header", contentType = "header") { SectionHeader("Pinned") }
            items(pinned, key = { "pinned:${it.id}" }, contentType = { "session" }) {
                SessionRow(it, pinned = true, selected = it.id == selectedId, model, onRename)
            }
        }
        item(key = "recent-header", contentType = "header") { SectionHeader("Recent") }
        items(recent, key = { "recent:${it.id}" }, contentType = { "session" }) {
            SessionRow(it, pinned = false, selected = it.id == selectedId, model, onRename)
        }
    }
}

@Composable
private fun SectionHeader(text: String) {
    Text(
        text,
        modifier = Modifier.padding(start = 16.dp, top = 16.dp, bottom = 4.dp),
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

private fun List<Session>.visible(filter: String): List<Session> {
    val needle = filter.trim()
    return filter { it.isHome || needle.isEmpty() || it.title.contains(needle, ignoreCase = true) }
}
