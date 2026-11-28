package com.khooeee.birdsong.sessions

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.AlertDialog
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.DialogProperties
import com.khooeee.birdsong.model.Session
import com.khooeee.birdsong.network.BirdsongClient
import kotlinx.coroutines.launch

/** Edits a session's title, which may span several lines. */
@Composable
fun RenameDialog(client: BirdsongClient, session: Session, onDismiss: () -> Unit) {
    var text by remember { mutableStateOf(session.title) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val focus = remember { FocusRequester() }
    // The server trims too; an unchanged title would needlessly stop the agent naming the session.
    val title = text.trim()

    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        properties = DialogProperties(dismissOnClickOutside = !saving),
        title = { Text("Rename Session") },
        text = {
            Column {
                OutlinedTextField(
                    value = text,
                    onValueChange = {
                        text = it
                        error = null
                    },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 120.dp).focusRequester(focus),
                    enabled = !saving,
                    label = { Text("Session title") },
                )
                error?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
            }
        },
        confirmButton = {
            TextButton(
                enabled = !saving && title.isNotEmpty() && title != session.title,
                onClick = {
                    saving = true
                    scope.launch {
                        try {
                            client.rename(session.id, title)
                            onDismiss()
                        } catch (e: Exception) {
                            saving = false
                            error = e.message
                        }
                    }
                },
            ) { Text(if (saving) "Saving…" else "Save") }
        },
        dismissButton = { TextButton(enabled = !saving, onClick = onDismiss) { Text("Cancel") } },
    )
    LaunchedEffect(Unit) { focus.requestFocus() }
}
