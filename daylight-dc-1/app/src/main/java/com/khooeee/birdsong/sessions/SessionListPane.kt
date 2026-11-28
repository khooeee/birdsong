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
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.khooeee.birdsong.model.Session
import com.khooeee.birdsong.network.StreamState
import com.khooeee.birdsong.ui.BirdsongIcons
import com.khooeee.birdsong.ui.EmptyState
import com.khooeee.birdsong.ui.PaneHeader

/** The desktop rail, live: pinned then recent, filtered by title. Home always shows. */
@Composable
fun SessionListPane(
    model: MainViewModel,
    onPair: () -> Unit,
    filter: String,
    onFilterChange: (String) -> Unit,
    searchFocus: FocusRequester,
    onNewSession: () -> Unit,
    onShowUsage: () -> Unit,
    onRename: (Session) -> Unit,
    modifier: Modifier = Modifier,
) {
    val list by model.list.collectAsStateWithLifecycle()
    val connection by model.connection.collectAsStateWithLifecycle()
    val selectedId by model.selectedId.collectAsStateWithLifecycle()

    Column(modifier) {
        PaneHeader("Sessions", subtitle = connection.notice?.takeIf { list != null }) {
            IconButton(onClick = onNewSession) { Icon(Icons.Filled.Add, contentDescription = "New session") }
            IconButton(onClick = onShowUsage) { Icon(BirdsongIcons.Usage, contentDescription = "Usage") }
            IconButton(onClick = onPair) { Icon(Icons.Filled.Settings, contentDescription = "Pairing") }
        }
        OutlinedTextField(
            value = filter,
            onValueChange = onFilterChange,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp).focusRequester(searchFocus),
            singleLine = true,
            placeholder = { Text("Search") },
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
            trailingIcon = {
                if (filter.isNotEmpty()) {
                    IconButton(onClick = { onFilterChange("") }) {
                        Icon(Icons.Filled.Clear, contentDescription = "Clear search")
                    }
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
                else -> SessionColumn(
                    SessionNavigation.visible(current.pinned, filter),
                    SessionNavigation.visible(current.unpinned, filter),
                    selectedId,
                    model,
                    onRename,
                )
            }
        }
    }
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
        item(key = "recent-header", contentType = "header") {
            SectionHeader("Recent", top = if (pinned.isEmpty()) 16.dp else 40.dp)
        }
        items(recent, key = { "recent:${it.id}" }, contentType = { "session" }) {
            SessionRow(it, pinned = false, selected = it.id == selectedId, model, onRename)
        }
    }
}

@Composable
private fun SectionHeader(text: String, top: Dp = 16.dp) {
    Text(
        text,
        modifier = Modifier.padding(start = 16.dp, top = top, bottom = 4.dp),
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}
