package com.khooeee.birdsong.transcript

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.khooeee.birdsong.markdown.MarkdownText
import com.khooeee.birdsong.model.RemoteTurn

/** A turn's reply (or what the agent is doing), with Copy and Turn Details at the bottom right, as on the desktop. */
@Composable
fun ReplyBlock(turn: RemoteTurn, onDetails: (turnId: String, atEnd: Boolean) -> Unit) {
    val reply = turn.assistant?.takeIf { it.isNotEmpty() }
    val running = turn.status == RemoteTurn.Status.Running
    val status = when {
        reply != null -> if (running) turn.activity else null
        running -> turn.activity ?: "Working…"
        turn.status == RemoteTurn.Status.Stopped -> "Stopped"
        else -> "No reply"
    }
    Column(Modifier.fillMaxWidth().padding(start = 32.dp, end = 20.dp, top = 8.dp)) {
        reply?.let {
            SelectionContainer { MarkdownText(it, style = MaterialTheme.typography.bodyLarge) }
        }
        status?.let {
            Text(
                it,
                modifier = Modifier.padding(top = 4.dp),
                style = if (reply == null) MaterialTheme.typography.bodyLarge else MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        TurnActions(reply) { onDetails(turn.id, true) }
    }
}
