package com.khooeee.birdsong.usage

import android.text.format.DateFormat
import java.util.Date
import java.util.Locale

private const val MINUTE_MS = 60_000L
private const val HOUR_MS = 60 * MINUTE_MS
private const val DAY_MS = 24 * HOUR_MS

/** "resets in 2h 13m (Fri 3:00 PM)" for a meter's reset, or null when there is none. */
fun usageResetText(resetsAt: Double?, now: Long = System.currentTimeMillis()): String? {
    if (resetsAt == null) return null
    val left = resetsAt.toLong() - now
    if (left <= 0) return "resets now"
    val skeleton = if (left > 6 * DAY_MS) "EEEMMMdjmm" else "EEEjmm"
    val pattern = DateFormat.getBestDateTimePattern(Locale.getDefault(), skeleton)
    return "resets in ${duration(left)} (${DateFormat.format(pattern, Date(resetsAt.toLong()))})"
}

private fun duration(ms: Long): String {
    val days = ms / DAY_MS
    val hours = (ms % DAY_MS) / HOUR_MS
    val minutes = ((ms % HOUR_MS + MINUTE_MS - 1) / MINUTE_MS) % 60
    return when {
        days > 0 -> if (hours > 0) "${days}d ${hours}h" else "${days}d"
        hours > 0 -> if (minutes > 0) "${hours}h ${minutes}m" else "${hours}h"
        else -> "${maxOf(1, (ms + MINUTE_MS - 1) / MINUTE_MS)}m"
    }
}
