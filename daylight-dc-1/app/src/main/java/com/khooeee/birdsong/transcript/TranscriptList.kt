package com.khooeee.birdsong.transcript

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.khooeee.birdsong.model.RemoteTurn

/**
 * Prompts and replies, newest at the bottom. Laid out from the bottom up, so a streaming reply grows upward and
 * the end stays in view; a new turn scrolls into view unless the user has scrolled up.
 */
@Composable
fun TranscriptList(turns: List<RemoteTurn>, onDetails: (turnId: String, atEnd: Boolean) -> Unit) {
    val listState = rememberLazyListState()
    var followsEnd by remember { mutableStateOf(true) }
    LaunchedEffect(listState) {
        snapshotFlow { listState.isScrollInProgress to (listState.firstVisibleItemIndex == 0 && listState.firstVisibleItemScrollOffset == 0) }
            .collect { (scrolling, atEnd) -> if (scrolling) followsEnd = atEnd }
    }
    LaunchedEffect(turns.lastOrNull()?.id) {
        if (followsEnd) listState.scrollToItem(0)
    }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        state = listState,
        reverseLayout = true,
        contentPadding = PaddingValues(vertical = 12.dp),
    ) {
        for (turn in turns.asReversed()) {
            item(key = "reply:${turn.id}", contentType = "reply") { ReplyBlock(turn, onDetails) }
            if (turn.agentStarted != true) {
                item(key = "prompt:${turn.id}", contentType = "prompt") { PromptCard(turn, onDetails) }
            }
        }
    }
}
