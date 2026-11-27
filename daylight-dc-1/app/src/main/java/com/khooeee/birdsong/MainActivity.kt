package com.khooeee.birdsong

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.khooeee.birdsong.app.BirdsongApplication
import com.khooeee.birdsong.app.LaunchRequests
import com.khooeee.birdsong.root.BirdsongRoot
import com.khooeee.birdsong.ui.theme.BirdsongTheme

/** The only activity: pairing until a link works, then sessions beside the open transcript. */
class MainActivity : ComponentActivity() {
    private val requests = LaunchRequests()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        if (savedInstanceState == null) handle(intent)
        val app = application as BirdsongApplication
        setContent {
            BirdsongTheme {
                BirdsongRoot(app, requests)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handle(intent)
    }

    private fun handle(intent: Intent) {
        intent.getStringExtra(EXTRA_SESSION_ID)?.let { requests.sessionId.value = it }
        if (intent.action == Intent.ACTION_VIEW && intent.data?.scheme == "birdsong") {
            requests.pairingLink.value = intent.dataString
        }
    }

    companion object {
        /** On an alert's tap: the session to open. */
        const val EXTRA_SESSION_ID = "sessionId"
    }
}
