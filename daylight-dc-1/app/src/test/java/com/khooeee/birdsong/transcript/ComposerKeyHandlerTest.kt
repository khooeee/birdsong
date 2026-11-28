package com.khooeee.birdsong.transcript

import android.view.KeyCharacterMap
import android.view.KeyEvent
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ComposerKeyHandlerTest {
    private val hardwareKeyboard = ComposerKeyHandler.DeviceInfo(isVirtual = false, supportsKeyboard = true)
    private val virtualKeyboard = ComposerKeyHandler.DeviceInfo(isVirtual = true, supportsKeyboard = true)
    private val nonKeyboardDevice = ComposerKeyHandler.DeviceInfo(isVirtual = false, supportsKeyboard = false)

    @Test
    fun physicalEnterSendsWhileShiftEnterInsertsNewline() {
        assertTrue(
            ComposerKeyHandler.shouldSend(
                isEnter = true,
                isShiftPressed = false,
                isAltPressed = false,
                isCtrlOrMetaPressed = false,
                isPhysicalKeyboard = true,
            ),
        )
        assertFalse(
            ComposerKeyHandler.shouldSend(
                isEnter = true,
                isShiftPressed = true,
                isAltPressed = false,
                isCtrlOrMetaPressed = false,
                isPhysicalKeyboard = true,
            ),
        )
        assertFalse(
            ComposerKeyHandler.shouldSend(
                isEnter = true,
                isShiftPressed = false,
                isAltPressed = true,
                isCtrlOrMetaPressed = false,
                isPhysicalKeyboard = true,
            ),
        )
    }

    @Test
    fun softKeyboardEnterInsertsNewlineWhileCtrlOrCmdEnterStillSends() {
        assertFalse(
            ComposerKeyHandler.shouldSend(
                isEnter = true,
                isShiftPressed = false,
                isAltPressed = false,
                isCtrlOrMetaPressed = false,
                isPhysicalKeyboard = false,
            ),
        )
        assertTrue(
            ComposerKeyHandler.shouldSend(
                isEnter = true,
                isShiftPressed = false,
                isAltPressed = false,
                isCtrlOrMetaPressed = true,
                isPhysicalKeyboard = false,
            ),
        )
        assertFalse(
            ComposerKeyHandler.shouldSend(
                isEnter = false,
                isShiftPressed = false,
                isAltPressed = false,
                isCtrlOrMetaPressed = true,
                isPhysicalKeyboard = true,
            ),
        )
    }

    @Test
    fun physicalKeyboardDetectionRejectsSoftAndVirtualDevices() {
        assertTrue(
            ComposerKeyHandler.isPhysicalKeyboard(deviceId = 3, flags = 0) { hardwareKeyboard },
        )
        assertFalse(
            ComposerKeyHandler.isPhysicalKeyboard(
                deviceId = 3,
                flags = KeyEvent.FLAG_SOFT_KEYBOARD,
            ) { hardwareKeyboard },
        )
        assertFalse(
            ComposerKeyHandler.isPhysicalKeyboard(
                deviceId = KeyCharacterMap.VIRTUAL_KEYBOARD,
                flags = 0,
            ) { hardwareKeyboard },
        )
        assertFalse(
            ComposerKeyHandler.isPhysicalKeyboard(deviceId = 3, flags = 0) { virtualKeyboard },
        )
        assertFalse(
            ComposerKeyHandler.isPhysicalKeyboard(deviceId = 3, flags = 0) { nonKeyboardDevice },
        )
        assertFalse(
            ComposerKeyHandler.isPhysicalKeyboard(deviceId = 3, flags = 0) { null },
        )
    }
}
