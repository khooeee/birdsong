package com.khooeee.birdsong.usage

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp
import com.khooeee.birdsong.model.AgentUsage

/** One agent in the Usage dialog: its limits, notes and errors, or a link to its usage page. */
@Composable
fun AgentUsageBlock(name: String, usage: AgentUsage?, now: Long) {
    val dim = MaterialTheme.colorScheme.onSurfaceVariant
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row {
            Text(name, Modifier.weight(1f), style = MaterialTheme.typography.titleSmall)
            usage?.plan?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = dim) }
        }
        if (usage == null) {
            Text("Reading…", style = MaterialTheme.typography.bodyMedium, color = dim)
            return@Column
        }
        usage.error?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
        usage.meters.forEach { UsageMeterRow(it, now) }
        usage.notes.forEach { Text(it, style = MaterialTheme.typography.bodySmall, color = dim) }
        usage.page?.let { page ->
            val uriHandler = LocalUriHandler.current
            TextButton(onClick = { uriHandler.openUri(page.url) }, contentPadding = PaddingValues(0.dp)) {
                Text(page.url.removePrefix("https://"))
            }
            page.hint?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = dim) }
        }
    }
}
