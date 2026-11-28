package com.khooeee.birdsong.transcript

import android.view.InputDevice
import android.view.KeyCharacterMap
import android.view.KeyEvent as AndroidKeyEvent
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEvent
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.isAltPressed
import androidx.compose.ui.input.key.isCtrlPressed
import androidx.compose.ui.input.key.isMetaPressed
import androidx.compose.ui.input.key.isShiftPressed
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.type

/**
 * Routes composer Enter presses: physical-keyboard Enter (and Ctrl/Cmd+Enter) sends the prompt, while Shift+Enter
 * and on-screen keyboard Enter fall through to insert a newline.
 */
object ComposerKeyHandler {
    fun onPreviewKeyEvent(event: KeyEvent, onSend: () -> Unit): Boolean {
        val native = event.nativeKeyEvent
        val physical = isPhysicalKeyboard(
            deviceId = native.deviceId,
            flags = native.flags,
            deviceLookup = ::lookupDeviceInfo,
        )
        val isSendKey = shouldSend(
            isEnter = event.key == Key.Enter || event.key == Key.NumPadEnter,
            isShiftPressed = event.isShiftPressed,
            isAltPressed = event.isAltPressed,
            isCtrlOrMetaPressed = event.isCtrlPressed || event.isMetaPressed,
            isPhysicalKeyboard = physical,
        )
        if (!isSendKey) return false
        if (event.type == KeyEventType.KeyDown && native.repeatCount == 0) onSend()
        return true
    }

    internal fun shouldSend(
        isEnter: Boolean,
        isShiftPressed: Boolean,
        isAltPressed: Boolean,
        isCtrlOrMetaPressed: Boolean,
        isPhysicalKeyboard: Boolean,
    ): Boolean {
        if (!isEnter || isShiftPressed || isAltPressed) return false
        return isPhysicalKeyboard || isCtrlOrMetaPressed
    }

    internal fun isPhysicalKeyboard(
        deviceId: Int,
        flags: Int,
        deviceLookup: (Int) -> DeviceInfo?,
    ): Boolean {
        if ((flags and AndroidKeyEvent.FLAG_SOFT_KEYBOARD) != 0) return false
        if (deviceId == KeyCharacterMap.VIRTUAL_KEYBOARD || deviceId < 0) return false
        val device = deviceLookup(deviceId) ?: return false
        return !device.isVirtual && device.supportsKeyboard
    }

    internal data class DeviceInfo(val isVirtual: Boolean, val supportsKeyboard: Boolean)

    private fun lookupDeviceInfo(deviceId: Int): DeviceInfo? {
        val device = InputDevice.getDevice(deviceId) ?: return null
        return DeviceInfo(
            isVirtual = device.isVirtual,
            supportsKeyboard = device.supportsSource(InputDevice.SOURCE_KEYBOARD),
        )
    }
}
