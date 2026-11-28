package com.khooeee.birdsong.root

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.khooeee.birdsong.app.BirdsongApplication
import com.khooeee.birdsong.app.LaunchRequests
import com.khooeee.birdsong.network.BirdsongClient
import com.khooeee.birdsong.network.ServerConfig
import com.khooeee.birdsong.pairing.PairDialog
import com.khooeee.birdsong.pairing.PairScreen

/** Pairing until a link works, then the main screen; a tapped pairing link reopens the form, filled in. */
@Composable
fun BirdsongRoot(app: BirdsongApplication, requests: LaunchRequests) {
    var config by remember { mutableStateOf(app.pairing.load()) }
    var repairPrefill by remember { mutableStateOf<String?>(null) }
    val tappedLink by requests.pairingLink.collectAsState()
    val client = remember(config) { config?.let(::BirdsongClient) }

    LaunchedEffect(tappedLink, client) {
        val link = tappedLink ?: return@LaunchedEffect
        if (client != null) {
            repairPrefill = link
            requests.pairingLink.value = null
        }
    }
    LaunchedEffect(client) { client?.let(app.push::start) }

    val paired = { next: ServerConfig ->
        val previous = client
        app.pairing.save(next)
        // Compare servers, not link text: two links to one Mac can differ in spelling but not in server.
        if (previous != null && previous.config.baseUrl != next.baseUrl) app.push.unregister(previous)
        // Voice belongs to the old pairing's sessions.
        app.voice.stop()
        repairPrefill = null
        requests.pairingLink.value = null
        config = next
    }

    Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Box(Modifier.safeDrawingPadding()) {
            if (client == null) {
                PairScreen(prefill = tappedLink, onPaired = paired)
            } else {
                MainScreen(client, app, requests, onPair = { repairPrefill = client.config.link })
            }
        }
    }
    repairPrefill?.let { prefill ->
        PairDialog(prefill = prefill, onPaired = paired, onDismiss = { repairPrefill = null })
    }
}
