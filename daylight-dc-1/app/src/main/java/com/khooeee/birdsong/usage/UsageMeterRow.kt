package com.khooeee.birdsong.usage

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.khooeee.birdsong.model.UsageMeter
import kotlin.math.roundToInt

/** One limit: label and percent, an outlined bar filled to the used share, then its reset or detail. */
@Composable
fun UsageMeterRow(meter: UsageMeter, now: Long) {
    val used = meter.usedPercent?.coerceIn(0.0, 100.0)
    val extra = listOfNotNull(meter.detail, usageResetText(meter.resetsAt, now)).joinToString(" · ")
    Column {
        Row {
            Text(meter.label, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
            used?.let { Text("${it.roundToInt()}%", style = MaterialTheme.typography.bodyMedium) }
        }
        used?.let { UsageBar((it / 100).toFloat(), meter.label) }
        if (extra.isNotEmpty()) {
            Text(extra, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

/** Fill length carries the value, since the Daylight screen shows no color. */
@Composable
private fun UsageBar(fraction: Float, label: String) {
    val ink = MaterialTheme.colorScheme.onSurface
    Box(
        Modifier
            .padding(vertical = 4.dp)
            .fillMaxWidth()
            .height(12.dp)
            .border(1.dp, ink, RoundedCornerShape(3.dp))
            .padding(2.dp)
            .semantics {
                contentDescription = label
                progressBarRangeInfo = ProgressBarRangeInfo(fraction, 0f..1f)
            },
    ) {
        Box(Modifier.fillMaxHeight().fillMaxWidth(fraction).background(ink, RoundedCornerShape(1.dp)))
    }
}
