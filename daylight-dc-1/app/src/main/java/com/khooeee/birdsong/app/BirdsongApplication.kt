package com.khooeee.birdsong.app

import android.app.Application
import com.khooeee.birdsong.notify.PushRegistration
import com.khooeee.birdsong.notify.TurnNotifications
import com.khooeee.birdsong.pairing.PairingStore
import com.khooeee.birdsong.voice.VoiceController
import kotlinx.coroutines.MainScope

/** App-wide pieces that outlive any screen: the pairing, alert registration, and voice. */
class BirdsongApplication : Application() {
    private val scope = MainScope()
    lateinit var pairing: PairingStore
        private set
    lateinit var push: PushRegistration
        private set

    /** One for the app: voice is on one session at a time, so every session's mic shares it. */
    lateinit var voice: VoiceController
        private set

    override fun onCreate() {
        super.onCreate()
        pairing = PairingStore(this)
        push = PushRegistration(this, scope, pairing)
        voice = VoiceController(this)
        TurnNotifications(this).createChannel()
    }
}
