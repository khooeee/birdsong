package com.khooeee.birdsong.sessions

import com.khooeee.birdsong.model.Session
import com.khooeee.birdsong.model.SessionList

/** Pure session filtering and keyboard-navigation target selection shared between the rail and shortcuts. */
object SessionNavigation {
    fun visible(sessions: List<Session>, filter: String): List<Session> {
        val needle = filter.trim()
        return sessions.filter { it.isHome || needle.isEmpty() || it.title.contains(needle, ignoreCase = true) }
    }

    fun stepTarget(list: SessionList, selectedId: String?, delta: Int, filter: String): String? {
        val order = visible(list.pinned, filter) + visible(list.unpinned, filter)
        if (order.isEmpty()) return null
        val index = order.indexOfFirst { it.id == selectedId }
        if (index < 0) return if (delta > 0) order.first().id else order.last().id
        return order[(index + delta).mod(order.size)].id
    }

    fun homeToggleTarget(list: SessionList, selectedId: String?, lastNonHomeId: String?): String? {
        val home = list.all.firstOrNull { it.isHome } ?: return null
        if (selectedId != home.id) return home.id
        return lastNonHomeId?.takeIf { id -> list.all.any { it.id == id } }
    }
}
