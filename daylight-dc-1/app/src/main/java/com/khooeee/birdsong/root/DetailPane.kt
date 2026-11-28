package com.khooeee.birdsong.root

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.khooeee.birdsong.sessions.MainViewModel
import com.khooeee.birdsong.transcript.TranscriptPane

/** The open session's transcript, or a hint until one is picked. */
@Composable
fun DetailPane(
    model: MainViewModel,
    promptFocus: FocusRequester,
    transcriptListState: LazyListState,
    modifier: Modifier = Modifier,
) {
    val list by model.list.collectAsStateWithLifecycle()
    val selectedId by model.selectedId.collectAsStateWithLifecycle()
    val session = list?.all?.firstOrNull { it.id == selectedId }
    if (session == null) {
        Box(modifier, contentAlignment = Alignment.Center) {
            Text(
                if (selectedId != null && list == null) "Connecting…" else "Pick a session",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        return
    }
    key(session.id) {
        TranscriptPane(
            model.client,
            session,
            onAlert = model::showAlert,
            drafts = model.drafts,
            voice = model.voice,
            promptFocus = promptFocus,
            transcriptListState = transcriptListState,
            modifier = modifier,
        )
    }
}
