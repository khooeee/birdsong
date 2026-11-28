package com.khooeee.birdsong.app

import android.app.Application
import com.khooeee.birdsong.notify.PushRegistration
import com.khooeee.birdsong.notify.TurnNotifications
import com.khooeee.birdsong.pairing.PairingStore
import kotlinx.coroutines.MainScope

/** App-wide pieces that outlive any screen: the pairing, and alert registration. */
class BirdsongApplication : Application() {
    private val scope = MainScope()
    lateinit var pairing: PairingStore
        private set
    lateinit var push: PushRegistration
        private set

    override fun onCreate() {
        super.onCreate()
        pairing = PairingStore(this)
        push = PushRegistration(this, scope, pairing)
        TurnNotifications(this).createChannel()
    }
}
