package com.khooeee.birdsong.transcript

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.khooeee.birdsong.model.ConfigPickers
import com.khooeee.birdsong.model.SessionModelConfig
import com.khooeee.birdsong.network.BirdsongClient
import com.khooeee.birdsong.network.ServerError
import com.khooeee.birdsong.ui.UserAlert
import kotlinx.coroutines.launch

/** One pill: the current model or effort. Every open asks the agent again, so the choices follow changes on the Mac. */
@Composable
fun ConfigPill(
    client: BirdsongClient,
    sessionId: String,
    category: ConfigCategory,
    title: String,
    onConfig: (SessionModelConfig?) -> Unit,
    onAlert: (UserAlert) -> Unit,
) {
    var open by remember { mutableStateOf(false) }
    var pickers by remember { mutableStateOf<Result<ConfigPickers>?>(null) }
    var applying by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(open) {
        if (!open) return@LaunchedEffect
        pickers = null
        pickers = runCatching { client.configPickers(sessionId) }.onSuccess { onConfig(it.modelConfig) }
    }
    Box {
        OutlinedButton(
            onClick = { open = true },
            enabled = !applying,
            modifier = Modifier.widthIn(max = 320.dp).semantics { contentDescription = "${category.label}: $title" },
            contentPadding = PaddingValues(start = 14.dp, end = 8.dp),
        ) {
            Text(title, style = MaterialTheme.typography.labelLarge, maxLines = 1, overflow = TextOverflow.Ellipsis)
            if (applying) {
                CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
            } else {
                Icon(Icons.Filled.ArrowDropDown, contentDescription = null)
            }
        }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            ConfigMenuItems(category, pickers, describe = ::describe) { configId, value ->
                open = false
                if (value == null) return@ConfigMenuItems
                applying = true
                scope.launch {
                    try {
                        onConfig(client.setConfigOption(configId, value, sessionId).modelConfig)
                    } catch (e: Exception) {
                        onAlert(UserAlert("Couldn't change the setting", describe(e)))
                    } finally {
                        applying = false
                    }
                }
            }
        }
    }
}

/** A Mac app from before these routes answers 404 "Not found" (an unknown session says "Session not found"). */
private fun describe(error: Throwable): String {
    if (error is ServerError && error.status == 404 && error.serverMessage == "Not found") {
        return "Update Birdsong on your Mac to change the model from your tablet."
    }
    return error.message.orEmpty()
}
