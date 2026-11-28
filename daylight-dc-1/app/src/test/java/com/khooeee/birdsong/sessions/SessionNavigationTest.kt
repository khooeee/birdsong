package com.khooeee.birdsong.sessions

import com.khooeee.birdsong.model.Session
import com.khooeee.birdsong.model.SessionList
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SessionNavigationTest {
    private val home = Session(id = "home", title = "Home", agent = "claude", home = true)
    private val alpha = Session(id = "alpha", title = "Alpha", agent = "claude")
    private val beta = Session(id = "beta", title = "Beta", agent = "claude")
    private val list = SessionList(pinned = listOf(home, alpha), unpinned = listOf(beta))

    @Test
    fun stepsInPinnedThenRecentOrderAndWraps() {
        assertEquals("alpha", SessionNavigation.stepTarget(list, "home", 1, ""))
        assertEquals("home", SessionNavigation.stepTarget(list, "beta", 1, ""))
        assertEquals("beta", SessionNavigation.stepTarget(list, "home", -1, ""))
    }

    @Test
    fun stepHonorsFilterButAlwaysKeepsHome() {
        assertEquals("home", SessionNavigation.stepTarget(list, "alpha", 1, "missing"))
        assertEquals("home", SessionNavigation.stepTarget(list, "home", 1, "missing"))
    }

    @Test
    fun homeToggleReturnsToLastSessionOnlyWhileHomeIsSelected() {
        assertEquals("home", SessionNavigation.homeToggleTarget(list, "alpha", "beta"))
        assertEquals("beta", SessionNavigation.homeToggleTarget(list, "home", "beta"))
        assertNull(SessionNavigation.homeToggleTarget(list, "home", "closed"))
    }
}
