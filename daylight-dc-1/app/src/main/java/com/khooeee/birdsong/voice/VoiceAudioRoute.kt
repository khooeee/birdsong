package com.khooeee.birdsong.voice

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFocusRequest
import android.media.AudioManager

/**
 * The tablet's audio while voice is on: a hands-free call on the speaker, or on a headset when one is connected, with
 * other audio paused. Undone when voice stops.
 */
class VoiceAudioRoute(context: Context) {
    private val audio = context.getSystemService(AudioManager::class.java)
    private var focus: AudioFocusRequest? = null

    fun begin() {
        if (focus != null) return
        val attributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
        val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN).setAudioAttributes(attributes).build()
        focus = request
        audio.requestAudioFocus(request)
        audio.mode = AudioManager.MODE_IN_COMMUNICATION
        preferredDevice()?.let(audio::setCommunicationDevice)
    }

    fun end() {
        val request = focus ?: return
        focus = null
        audio.clearCommunicationDevice()
        audio.mode = AudioManager.MODE_NORMAL
        audio.abandonAudioFocusRequest(request)
    }

    private fun preferredDevice(): AudioDeviceInfo? {
        val devices = audio.availableCommunicationDevices
        return devices.firstOrNull { it.type in HEADSETS } ?: devices.firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
    }

    private companion object {
        val HEADSETS = setOf(
            AudioDeviceInfo.TYPE_WIRED_HEADSET,
            AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
            AudioDeviceInfo.TYPE_USB_HEADSET,
            AudioDeviceInfo.TYPE_BLE_HEADSET,
            AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
        )
    }
}
