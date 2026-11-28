package com.khooeee.birdsong.turndetails

import android.text.format.DateUtils
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.khooeee.birdsong.markdown.MarkdownText
import com.khooeee.birdsong.model.RemoteTurnItem

/** One step: what it is, its state and time, then its text: markdown for messages and thoughts, monospace for tools. */
@Composable
fun TurnStepRow(item: RemoteTurnItem) {
    val colors = MaterialTheme.colorScheme
    val type = MaterialTheme.typography
    val background = if (item.role == "user") colors.surfaceContainerHigh else Color.Transparent
    Column(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp)
            .background(background, MaterialTheme.shapes.large)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(item.role.replaceFirstChar { it.uppercase() }, style = type.labelMedium, fontWeight = FontWeight.SemiBold)
            val status = if (item.queued == true) "Queued" else item.status?.replace('_', ' ')
            status?.let {
                Text(
                    it,
                    style = type.labelMedium,
                    color = colors.onSurfaceVariant,
                    fontWeight = if (item.status == "failed") FontWeight.Bold else FontWeight.Normal,
                )
            }
            Spacer(Modifier.weight(1f))
            Text(time(item.at), style = type.labelMedium, color = colors.onSurfaceVariant)
        }
        if (item.text.isNotEmpty()) {
            SelectionContainer {
                when (item.role) {
                    "user", "assistant" -> MarkdownText(item.text, type.bodyLarge)
                    "thought" -> MarkdownText(item.text, type.bodyLarge.copy(color = colors.onSurfaceVariant))
                    "tool" -> Text(item.text, style = type.bodyMedium.copy(fontFamily = FontFamily.Monospace))
                    else -> Text(item.text, style = type.bodyLarge)
                }
            }
        }
        val images = item.images?.let { if (it == 1) "1 image, on your Mac" else "$it images, on your Mac" }
        val note = listOfNotNull(item.task, images).joinToString("\n")
        if (note.isNotEmpty()) Text(note, style = type.bodyMedium, color = colors.onSurfaceVariant)
    }
}

@Composable
private fun time(at: Double): String {
    val millis = at.toLong()
    val flags = if (DateUtils.isToday(millis)) DateUtils.FORMAT_SHOW_TIME else DateUtils.FORMAT_SHOW_DATE or DateUtils.FORMAT_SHOW_TIME or DateUtils.FORMAT_ABBREV_MONTH
    return DateUtils.formatDateTime(LocalContext.current, millis, flags)
}
