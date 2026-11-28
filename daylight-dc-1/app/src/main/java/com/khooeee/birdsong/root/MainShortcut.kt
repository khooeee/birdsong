package com.khooeee.birdsong.root

import android.view.InputDevice
import android.view.KeyEvent
import com.khooeee.birdsong.transcript.ComposerKeyHandler

/**
 * Physical-keyboard Ctrl shortcuts for the main two-pane workspace, matching Birdsong's desktop session shortcuts.
 */
enum class MainShortcut(val allowsRepeat: Boolean = false) {
    FocusPrompt,
    FocusSearch,
    NewSession,
    ToggleHome,
    RenameSession,
    TogglePin,
    NextSession(allowsRepeat = true),
    PreviousSession(allowsRepeat = true),
    PageUp(allowsRepeat = true),
    PageDown(allowsRepeat = true),
    ToggleUnread,
    StopAgent,
    ;

    companion object {
        fun dispatch(
            event: KeyEvent,
            enabled: Boolean,
            allowStopAgent: Boolean = true,
            onShortcut: (MainShortcut) -> Unit,
        ): Boolean {
            if (!enabled) return false
            val shortcut = match(
                keyCode = event.keyCode,
                isCtrlPressed = event.isCtrlPressed,
                isAltPressed = event.isAltPressed,
                isShiftPressed = event.isShiftPressed,
                isMetaPressed = event.isMetaPressed,
                isPhysicalKeyboard = ComposerKeyHandler.isPhysicalKeyboard(
                    deviceId = event.deviceId,
                    flags = event.flags,
                    deviceLookup = { deviceId ->
                        InputDevice.getDevice(deviceId)?.let {
                            ComposerKeyHandler.DeviceInfo(
                                isVirtual = it.isVirtual,
                                supportsKeyboard = it.supportsSource(InputDevice.SOURCE_KEYBOARD),
                            )
                        }
                    },
                ),
            ) ?: return false
            if (shortcut == StopAgent && !allowStopAgent) return false

            return when (event.action) {
                KeyEvent.ACTION_DOWN -> {
                    if (event.repeatCount == 0 || shortcut.allowsRepeat) onShortcut(shortcut)
                    true
                }
                KeyEvent.ACTION_UP -> true
                else -> false
            }
        }

        internal fun match(
            keyCode: Int,
            isCtrlPressed: Boolean,
            isAltPressed: Boolean,
            isShiftPressed: Boolean,
            isMetaPressed: Boolean,
            isPhysicalKeyboard: Boolean,
        ): MainShortcut? {
            if (!isPhysicalKeyboard) return null
            if (keyCode == KeyEvent.KEYCODE_ESCAPE) {
                return if (!isCtrlPressed && !isAltPressed && !isShiftPressed && !isMetaPressed) StopAgent else null
            }
            if (!isCtrlPressed || isMetaPressed) return null
            if (isAltPressed) {
                return if (!isShiftPressed && keyCode == KeyEvent.KEYCODE_P) TogglePin else null
            }
            if (keyCode == KeyEvent.KEYCODE_TAB) {
                return if (isShiftPressed) PreviousSession else NextSession
            }
            if (keyCode == KeyEvent.KEYCODE_DPAD_UP) return if (!isShiftPressed) PageUp else null
            if (keyCode == KeyEvent.KEYCODE_DPAD_DOWN) return if (!isShiftPressed) PageDown else null
            if (isShiftPressed) return null
            return when (keyCode) {
                KeyEvent.KEYCODE_I -> FocusPrompt
                KeyEvent.KEYCODE_P -> FocusSearch
                KeyEvent.KEYCODE_N -> NewSession
                KeyEvent.KEYCODE_1, KeyEvent.KEYCODE_NUMPAD_1 -> ToggleHome
                KeyEvent.KEYCODE_R -> RenameSession
                KeyEvent.KEYCODE_U -> ToggleUnread
                else -> null
            }
        }
    }
}
