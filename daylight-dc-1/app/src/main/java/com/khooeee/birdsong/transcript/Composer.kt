package com.khooeee.birdsong.transcript

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.isCtrlPressed
import androidx.compose.ui.input.key.isMetaPressed
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.unit.dp
import com.khooeee.birdsong.model.Session
import com.khooeee.birdsong.network.BirdsongClient
import com.khooeee.birdsong.sessions.continuationNotice
import com.khooeee.birdsong.ui.BirdsongIcons
import com.khooeee.birdsong.ui.UserAlert

/**
 * The prompt field with Send and, while a turn runs, Stop; sending then steers (or queues). Ctrl or Cmd+Enter sends
 * from a keyboard. A pending quota continuation shows above with Cancel; the model and effort pills below.
 */
@Composable
fun Composer(
    client: BirdsongClient,
    session: Session,
    drafts: Drafts,
    isRunning: Boolean,
    onSend: (text: String, restore: (String) -> Unit) -> Unit,
    onStop: () -> Unit,
    onAlert: (UserAlert) -> Unit,
) {
    var text by remember(session.id) { mutableStateOf(drafts[session.id]) }
    val setText = { value: String ->
        text = value
        drafts[session.id] = value
    }
    val send = {
        val prompt = text.trim()
        if (prompt.isNotEmpty()) {
            setText("")
            onSend(prompt) { failed -> if (text.isEmpty()) setText(failed) }
        }
    }
    Column(Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surfaceContainerLow)) {
        HorizontalDivider()
        Column(Modifier.padding(horizontal = 16.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            continuationNotice(session)?.let { notice ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        notice,
                        modifier = Modifier.weight(1f),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    TextButton(onClick = onStop) { Text("Cancel") }
                }
            }
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = text,
                    onValueChange = setText,
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(max = 200.dp)
                        .onPreviewKeyEvent { event ->
                            val chord = event.key == Key.Enter && (event.isCtrlPressed || event.isMetaPressed)
                            if (chord && event.type == KeyEventType.KeyDown) send()
                            chord
                        },
                    placeholder = { Text(if (isRunning) "Steer…" else "Message") },
                    shape = MaterialTheme.shapes.extraLarge,
                )
                if (isRunning) {
                    FilledTonalIconButton(onClick = onStop, modifier = Modifier.padding(bottom = 4.dp)) {
                        Icon(BirdsongIcons.Stop, contentDescription = "Stop", modifier = Modifier.size(20.dp))
                    }
                }
                FilledIconButton(onClick = send, enabled = text.isNotBlank(), modifier = Modifier.padding(bottom = 4.dp)) {
                    Icon(BirdsongIcons.ArrowUp, contentDescription = "Send")
                }
            }
            ModelConfigBar(client, session.id, session.modelConfig, onAlert)
        }
    }
}
