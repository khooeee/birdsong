package com.khooeee.birdsong.root

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.width
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.khooeee.birdsong.app.BirdsongApplication
import com.khooeee.birdsong.app.LaunchRequests
import com.khooeee.birdsong.network.BirdsongClient
import com.khooeee.birdsong.notify.TurnNotifications
import com.khooeee.birdsong.sessions.MainViewModel
import com.khooeee.birdsong.sessions.SessionListPane

/** Two panes in either orientation: the rail on the left, the open session's transcript on the right. */
@Composable
fun MainScreen(client: BirdsongClient, app: BirdsongApplication, requests: LaunchRequests, onPair: () -> Unit) {
    val model = viewModel(key = client.config.link) { MainViewModel(client, TurnNotifications(app), app.voice) }
    LifecycleStartEffect(model) {
        model.start()
        onStopOrDispose { model.stop() }
    }
    val tappedSession by requests.sessionId.collectAsState()
    LaunchedEffect(tappedSession) {
        tappedSession?.let(model::select)
        requests.sessionId.value = null
    }
    AskForAlerts(app)

    BoxWithConstraints(Modifier.fillMaxSize()) {
        // About 320dp of a portrait DC-1's ~900dp, and 380dp of landscape's ~1200dp.
        val railWidth = (maxWidth * 0.34f).coerceIn(280.dp, 380.dp)
        Row(Modifier.fillMaxSize()) {
            SessionListPane(model, onPair, Modifier.width(railWidth).fillMaxHeight())
            VerticalDivider()
            DetailPane(model, Modifier.weight(1f).fillMaxHeight())
        }
    }

    val alert by model.alert.collectAsStateWithLifecycle()
    alert?.let {
        AlertDialog(
            onDismissRequest = model::dismissAlert,
            confirmButton = { TextButton(onClick = model::dismissAlert) { Text("OK") } },
            title = { Text(it.title) },
            text = { Text(it.message) },
        )
    }
}

/** Asks once for notifications, when this build can receive alerts at all. */
@Composable
private fun AskForAlerts(app: BirdsongApplication) {
    val context = LocalContext.current
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
    LaunchedEffect(Unit) {
        val permission = Manifest.permission.POST_NOTIFICATIONS
        if (app.push.isAvailable && context.checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) {
            launcher.launch(permission)
        }
    }
}
