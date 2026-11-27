package com.khooeee.birdsong.transcript

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.unit.dp
import com.khooeee.birdsong.model.SessionModelConfig
import com.khooeee.birdsong.network.BirdsongClient
import com.khooeee.birdsong.ui.UserAlert

/** Model and effort pills under the composer; each opens the agent's current choices and applies a pick. */
@Composable
fun ModelConfigBar(client: BirdsongClient, sessionId: String, fromRail: SessionModelConfig?, onAlert: (UserAlert) -> Unit) {
    var config by remember(sessionId) { mutableStateOf(fromRail) }
    LaunchedEffect(fromRail) { if (fromRail != null) config = fromRail }
    val current = config ?: return
    if (current.isEmpty) return
    val updated = { next: SessionModelConfig? -> if (next != null) config = next }
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        current.model?.let { ConfigPill(client, sessionId, ConfigCategory.Model, it, updated, onAlert) }
        current.effort?.let { ConfigPill(client, sessionId, ConfigCategory.Effort, it, updated, onAlert) }
    }
}
