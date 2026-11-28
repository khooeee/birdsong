package com.khooeee.birdsong.root

import android.view.KeyEvent
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class MainShortcutTest {
    @Test
    fun matchesRequestedCtrlShortcutsAndTabDirection() {
        assertEquals(MainShortcut.FocusPrompt, match(KeyEvent.KEYCODE_I))
        assertEquals(MainShortcut.FocusSearch, match(KeyEvent.KEYCODE_P))
        assertEquals(MainShortcut.NewSession, match(KeyEvent.KEYCODE_N))
        assertEquals(MainShortcut.ForkSession, match(KeyEvent.KEYCODE_N, shift = true))
        assertEquals(MainShortcut.ToggleHome, match(KeyEvent.KEYCODE_1))
        assertEquals(MainShortcut.RenameSession, match(KeyEvent.KEYCODE_R))
        assertEquals(MainShortcut.ToggleUnread, match(KeyEvent.KEYCODE_U))
        assertEquals(MainShortcut.TogglePin, match(KeyEvent.KEYCODE_P, alt = true))
        assertEquals(MainShortcut.NextSession, match(KeyEvent.KEYCODE_TAB))
        assertEquals(MainShortcut.PreviousSession, match(KeyEvent.KEYCODE_TAB, shift = true))
        assertEquals(MainShortcut.PageUp, match(KeyEvent.KEYCODE_DPAD_UP))
        assertEquals(MainShortcut.PageDown, match(KeyEvent.KEYCODE_DPAD_DOWN))
        assertEquals(MainShortcut.PageUp, match(KeyEvent.KEYCODE_PAGE_UP, ctrl = false))
        assertEquals(MainShortcut.PageDown, match(KeyEvent.KEYCODE_PAGE_DOWN, ctrl = false))
        assertEquals(MainShortcut.PageUp, match(KeyEvent.KEYCODE_DPAD_UP, ctrl = false, function = true))
        assertEquals(MainShortcut.PageDown, match(KeyEvent.KEYCODE_DPAD_DOWN, ctrl = false, function = true))
    }

    @Test
    fun escapeOnlyMatchesWithoutModifiersAndOnlyPhysicalKeyboardsMatch() {
        assertEquals(MainShortcut.StopAgent, match(KeyEvent.KEYCODE_ESCAPE, ctrl = false))
        assertNull(match(KeyEvent.KEYCODE_ESCAPE, ctrl = true))
        assertNull(match(KeyEvent.KEYCODE_I, physical = false))
        assertNull(match(KeyEvent.KEYCODE_I, meta = true))
        assertNull(match(KeyEvent.KEYCODE_I, shift = true))
        assertNull(match(KeyEvent.KEYCODE_P, alt = true, shift = true))
        assertNull(match(KeyEvent.KEYCODE_DPAD_UP, shift = true))
    }

    private fun match(
        keyCode: Int,
        ctrl: Boolean = true,
        alt: Boolean = false,
        shift: Boolean = false,
        meta: Boolean = false,
        physical: Boolean = true,
        function: Boolean = false,
    ) = MainShortcut.match(keyCode, ctrl, alt, shift, meta, function, physical)
}
