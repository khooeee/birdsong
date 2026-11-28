package com.khooeee.birdsong.voice

import android.content.Context
import org.webrtc.PeerConnectionFactory
import org.webrtc.audio.JavaAudioDeviceModule

/**
 * The app's one WebRTC factory, made on the first call. Its audio runs as a voice call, with the tablet's echo
 * canceller where it has one (WebRTC's own otherwise), so the agent doesn't hear itself on the speaker.
 */
object VoicePeerFactory {
    @Volatile
    private var factory: PeerConnectionFactory? = null

    fun get(context: Context): PeerConnectionFactory =
        factory ?: synchronized(this) { factory ?: create(context.applicationContext).also { factory = it } }

    private fun create(context: Context): PeerConnectionFactory {
        PeerConnectionFactory.initialize(PeerConnectionFactory.InitializationOptions.builder(context).createInitializationOptions())
        val audio = JavaAudioDeviceModule.builder(context)
            .setUseHardwareAcousticEchoCanceler(true)
            .setUseHardwareNoiseSuppressor(true)
            .createAudioDeviceModule()
        val factory = PeerConnectionFactory.builder().setAudioDeviceModule(audio).createPeerConnectionFactory()
        // The factory holds its own reference.
        audio.release()
        return factory
    }
}
