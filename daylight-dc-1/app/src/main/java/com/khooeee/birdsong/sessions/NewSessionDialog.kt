package com.khooeee.birdsong.sessions

import android.content.Context
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.edit
import com.khooeee.birdsong.model.Session
import com.khooeee.birdsong.model.SessionAgent
import com.khooeee.birdsong.network.BirdsongClient
import com.khooeee.birdsong.network.ServerError
import kotlinx.coroutines.launch

/** Starts a session in a folder on the paired Mac. The Pin choice carries over to the next new session. */
@Composable
fun NewSessionDialog(client: BirdsongClient, recent: List<Session>, onCreated: (Session) -> Unit, onDismiss: () -> Unit) {
    val prefs = LocalContext.current.getSharedPreferences("newSession", Context.MODE_PRIVATE)
    val railFolders = remember { recent.map { it.cwd }.filter { it.startsWith("/") }.distinct().take(8) }
    var folders by remember { mutableStateOf(railFolders) }
    var agent by remember { mutableStateOf(recent.firstOrNull()?.let { SessionAgent.fromRaw(it.agent) } ?: SessionAgent.Claude) }
    var cwd by remember { mutableStateOf(railFolders.firstOrNull().orEmpty()) }
    var pin by remember { mutableStateOf(prefs.getBoolean(LAST_PIN, false)) }
    var creating by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var missingFolder by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    // Swaps the rail's folders for the Mac's list; replaces the prefilled folder only while untouched.
    LaunchedEffect(Unit) {
        val fromMac = runCatching { client.recentFolders() }.getOrNull()?.filter { it.startsWith("/") }.orEmpty()
        if (fromMac.isEmpty()) return@LaunchedEffect
        if (cwd == railFolders.firstOrNull().orEmpty()) cwd = fromMac.first()
        folders = fromMac
    }

    val create = { createFolder: Boolean ->
        val path = cwd.trim()
        if (!path.startsWith("/")) {
            error = "Enter the full folder path on your Mac, starting with /."
        } else {
            prefs.edit { putBoolean(LAST_PIN, pin) }
            error = null
            creating = true
            scope.launch {
                try {
                    val session = client.createSession(agent, path, pin, createFolder)
                    if (session.status == Session.Status.Error) {
                        error = session.error ?: "The session failed to start."
                    } else {
                        onDismiss()
                        onCreated(session)
                    }
                } catch (e: ServerError) {
                    if (e.status == 409 && !createFolder) missingFolder = path else error = e.message
                } catch (e: Exception) {
                    error = e.message
                } finally {
                    creating = false
                }
            }
        }
    }

    AlertDialog(
        onDismissRequest = { if (!creating) onDismiss() },
        properties = DialogProperties(dismissOnClickOutside = !creating),
        title = { Text("New Session") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Agent", style = MaterialTheme.typography.titleSmall)
                ChoiceButton(agent.label, SessionAgent.entries.map { it.label }, enabled = !creating) {
                    agent = SessionAgent.entries[it]
                    error = null
                }
                Text("Session Folder on Mac", style = MaterialTheme.typography.titleSmall)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = cwd,
                        onValueChange = {
                            cwd = it
                            error = null
                        },
                        modifier = Modifier.weight(1f),
                        enabled = !creating,
                        singleLine = true,
                        placeholder = { Text("/path/to/project") },
                        keyboardOptions = KeyboardOptions(autoCorrectEnabled = false, keyboardType = KeyboardType.Uri),
                    )
                    if (folders.isNotEmpty()) {
                        ChoiceButton("Recent", folders, enabled = !creating) { cwd = folders[it] }
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Checkbox(checked = pin, onCheckedChange = { pin = it }, enabled = !creating)
                    Text("Pin")
                }
                error?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
            }
        },
        confirmButton = {
            TextButton(enabled = !creating && cwd.isNotBlank(), onClick = { create(false) }) {
                Text(if (creating) "Starting…" else "Create")
            }
        },
        dismissButton = { TextButton(enabled = !creating, onClick = onDismiss) { Text("Cancel") } },
    )
    missingFolder?.let { path ->
        AlertDialog(
            onDismissRequest = { missingFolder = null },
            title = { Text("This folder doesn't exist. Do you want to create it?") },
            text = { Text(path) },
            confirmButton = {
                TextButton(onClick = {
                    missingFolder = null
                    create(true)
                }) { Text("Create Folder") }
            },
            dismissButton = { TextButton(onClick = { missingFolder = null }) { Text("Cancel") } },
        )
    }
}

private const val LAST_PIN = "lastPin"
