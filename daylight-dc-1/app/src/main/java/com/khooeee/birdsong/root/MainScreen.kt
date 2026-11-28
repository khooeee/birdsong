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
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.khooeee.birdsong.app.BirdsongApplication
import com.khooeee.birdsong.app.LaunchRequests
import com.khooeee.birdsong.model.Session
import com.khooeee.birdsong.network.BirdsongClient
import com.khooeee.birdsong.notify.TurnNotifications
import com.khooeee.birdsong.sessions.MainViewModel
import com.khooeee.birdsong.sessions.NewSessionDialog
import com.khooeee.birdsong.sessions.RenameDialog
import com.khooeee.birdsong.sessions.SessionListPane
import com.khooeee.birdsong.usage.UsageDialog

/** Two panes in either orientation: the rail on the left, the open session's transcript on the right. */
@Composable
fun MainScreen(
    client: BirdsongClient,
    app: BirdsongApplication,
    requests: LaunchRequests,
    keyDispatcher: WindowKeyDispatcher,
    shortcutsEnabled: Boolean,
    onPair: () -> Unit,
) {
    val model = viewModel(key = client.config.link) { MainViewModel(client, TurnNotifications(app), app.voice) }
    LifecycleStartEffect(model) {
        model.start()
        onStopOrDispose { model.stop() }
    }
    val list by model.list.collectAsStateWithLifecycle()
    val tappedSession by requests.sessionId.collectAsState()
    var filter by rememberSaveable { mutableStateOf("") }
    var creating by remember { mutableStateOf(false) }
    var showingUsage by remember { mutableStateOf(false) }
    var renaming by remember { mutableStateOf<Session?>(null) }
    val alert by model.alert.collectAsStateWithLifecycle()
    val promptFocus = remember { FocusRequester() }
    val searchFocus = remember { FocusRequester() }

    LaunchedEffect(tappedSession) {
        tappedSession?.let(model::select)
        requests.sessionId.value = null
    }

    val shortcutAction: (MainShortcut) -> Unit = { shortcut ->
        when (shortcut) {
            MainShortcut.FocusPrompt -> if (model.activeSession() != null) promptFocus.requestFocus()
            MainShortcut.FocusSearch -> searchFocus.requestFocus()
            MainShortcut.NewSession -> creating = true
            MainShortcut.ToggleHome -> model.toggleHome()
            MainShortcut.RenameSession -> {
                renaming = model.activeSession()?.takeUnless { it.isHome }
            }
            MainShortcut.TogglePin -> model.togglePinActive()
            MainShortcut.NextSession -> model.stepSession(1, filter)
            MainShortcut.PreviousSession -> model.stepSession(-1, filter)
            MainShortcut.ToggleUnread -> model.toggleUnreadActive()
            MainShortcut.StopAgent -> model.stopActive()
        }
    }
    val currentShortcutAction by rememberUpdatedState(shortcutAction)
    val currentShortcutsEnabled by rememberUpdatedState(
        shortcutsEnabled && !creating && !showingUsage && renaming == null && alert == null,
    )
    DisposableEffect(keyDispatcher) {
        val handler: (android.view.KeyEvent) -> Boolean = { event ->
            MainShortcut.dispatch(
                event = event,
                enabled = currentShortcutsEnabled,
                allowStopAgent = model.activeSession()?.status == Session.Status.Running,
            ) { currentShortcutAction(it) }
        }
        keyDispatcher.handler = handler
        onDispose { if (keyDispatcher.handler === handler) keyDispatcher.handler = null }
    }

    AskForAlerts(app)

    BoxWithConstraints(Modifier.fillMaxSize()) {
        // About 320dp of a portrait DC-1's ~900dp, and 380dp of landscape's ~1200dp.
        val railWidth = (maxWidth * 0.34f).coerceIn(280.dp, 380.dp)
        Row(Modifier.fillMaxSize()) {
            SessionListPane(
                model = model,
                onPair = onPair,
                filter = filter,
                onFilterChange = { filter = it },
                searchFocus = searchFocus,
                onNewSession = { creating = true },
                onShowUsage = { showingUsage = true },
                onRename = { renaming = it },
                modifier = Modifier.width(railWidth).fillMaxHeight(),
            )
            VerticalDivider()
            DetailPane(model, promptFocus, Modifier.weight(1f).fillMaxHeight())
        }
    }

    if (creating) {
        NewSessionDialog(
            client = model.client,
            recent = list?.let { it.unpinned + it.pinned }.orEmpty(),
            onCreated = { model.select(it.id) },
            onDismiss = { creating = false },
        )
    }
    if (showingUsage) UsageDialog(model.client, onDismiss = { showingUsage = false })
    renaming?.let { session -> RenameDialog(model.client, session, onDismiss = { renaming = null }) }
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
