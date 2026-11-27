package com.khooeee.birdsong.transcript

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.khooeee.birdsong.model.RemoteTurn

/** A turn's prompt, in a shaded box, with Copy and Turn Details at the bottom right. */
@Composable
fun PromptCard(turn: RemoteTurn, onDetails: (turnId: String, atEnd: Boolean) -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .background(MaterialTheme.colorScheme.surfaceContainerHigh, MaterialTheme.shapes.large)
            .padding(start = 16.dp, end = 4.dp, top = 12.dp),
    ) {
        SelectionContainer(Modifier.padding(end = 12.dp)) {
            Text(turn.user, style = MaterialTheme.typography.bodyLarge)
        }
        if (turn.queued == true) {
            Text("Queued", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        TurnActions(turn.user) { onDetails(turn.id, false) }
    }
}
