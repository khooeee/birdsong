package com.khooeee.birdsong.voice

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.khooeee.birdsong.network.VoiceClient
import com.khooeee.birdsong.ui.BirdsongIcons

/**
 * A session's mic in its header: starts or stops voice on that session, shows what the agent is doing while voice is
 * on it, and explains failures. No animation, for the paper screen: filled while live, gray while connecting.
 */
@Composable
fun VoiceButton(voice: VoiceController, client: VoiceClient, sessionId: String) {
    val status by voice.status.collectAsStateWithLifecycle()
    val context = LocalContext.current
    // Starts either way: when refused, the controller says how to allow the mic.
    val askForMic = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        voice.start(client, sessionId)
    }
    val toggle = {
        val permission = Manifest.permission.RECORD_AUDIO
        when {
            status.isOn(sessionId) -> voice.stop()
            context.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED -> voice.start(client, sessionId)
            else -> askForMic.launch(permission)
        }
    }

    val state = if (status.sessionId == sessionId) status.state else VoiceState.Off
    val label = if (state == VoiceState.Off) "Start voice" else "Stop voice"
    when (state) {
        VoiceState.Off -> IconButton(onClick = toggle) { Icon(BirdsongIcons.MicNone, label) }
        VoiceState.Connecting -> FilledTonalIconButton(onClick = toggle) { Icon(BirdsongIcons.Mic, label) }
        is VoiceState.Live -> FilledIconButton(onClick = toggle) { Icon(icon(state.activity), label) }
    }

    val error = status.error
    if (state == VoiceState.Off && error != null && status.sessionId == sessionId) {
        AlertDialog(
            onDismissRequest = voice::dismissError,
            confirmButton = {
                TextButton(onClick = {
                    voice.dismissError()
                    toggle()
                }) { Text("Try Again") }
            },
            dismissButton = { TextButton(onClick = voice::dismissError) { Text("OK") } },
            title = { Text("Voice stopped") },
            text = { Text(error) },
        )
    }
}

private fun icon(activity: VoiceActivity) = when (activity) {
    VoiceActivity.Idle -> BirdsongIcons.Mic
    VoiceActivity.Thinking -> BirdsongIcons.MoreHoriz
    VoiceActivity.Speaking -> BirdsongIcons.GraphicEq
}
