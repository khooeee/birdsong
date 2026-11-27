package com.khooeee.birdsong.sessions

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.khooeee.birdsong.model.Session

/** A rail row: the title, any continuation or error, and a spinner, unread dot or warning. Long-press for the menu. */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun SessionRow(
    session: Session,
    pinned: Boolean,
    selected: Boolean,
    model: MainViewModel,
    onRename: (Session) -> Unit,
) {
    var menuOpen by remember { mutableStateOf(false) }
    val background = if (selected) MaterialTheme.colorScheme.surfaceContainerHighest else MaterialTheme.colorScheme.surface
    Box {
        Row(
            Modifier
                .fillMaxWidth()
                .background(background)
                .combinedClickable(onClick = { model.select(session.id) }, onLongClick = { menuOpen = true })
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .semantics { if (session.isUnread) stateDescription = "Unread" },
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (session.isHome) {
                Icon(Icons.Filled.Home, contentDescription = "Home", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.width(12.dp))
            }
            Column(Modifier.weight(1f)) {
                Text(
                    session.title,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = if (session.isUnread) FontWeight.SemiBold else FontWeight.Normal,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                )
                val notice = continuationNotice(session)
                val detail = notice ?: session.error?.takeIf { session.status == Session.Status.Error }
                detail?.let {
                    Text(
                        it,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = if (notice != null) Int.MAX_VALUE else 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            Spacer(Modifier.width(12.dp))
            StatusMark(session)
        }
        SessionMenu(session, pinned, expanded = menuOpen, onDismiss = { menuOpen = false }, model, onRename)
    }
}

/** The spinner takes the dot's place while the agent works. */
@Composable
private fun StatusMark(session: Session) {
    when {
        session.isWorking -> CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
        session.status == Session.Status.Error -> Icon(Icons.Filled.Warning, contentDescription = "Error")
        session.isUnread -> Box(
            Modifier.size(12.dp).background(MaterialTheme.colorScheme.onSurface, CircleShape),
        )
    }
}
