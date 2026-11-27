package com.khooeee.birdsong.transcript

import android.content.ClipData
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.ClipEntry
import androidx.compose.ui.platform.LocalClipboard
import androidx.compose.ui.unit.dp
import com.khooeee.birdsong.ui.BirdsongIcons
import kotlinx.coroutines.launch

/** Copy and Turn Details, at the bottom right of a prompt or reply. */
@Composable
fun TurnActions(copyText: String?, onDetails: () -> Unit) {
    val clipboard = LocalClipboard.current
    val scope = rememberCoroutineScope()
    val tint = MaterialTheme.colorScheme.onSurfaceVariant
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
        if (!copyText.isNullOrEmpty()) {
            IconButton(onClick = {
                scope.launch { clipboard.setClipEntry(ClipEntry(ClipData.newPlainText("Birdsong", copyText))) }
            }) {
                Icon(BirdsongIcons.Copy, contentDescription = "Copy", tint = tint, modifier = Modifier.size(18.dp))
            }
        }
        IconButton(onClick = onDetails) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "Turn Details", tint = tint)
        }
    }
}
