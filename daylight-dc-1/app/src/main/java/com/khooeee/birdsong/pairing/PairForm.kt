package com.khooeee.birdsong.pairing

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.khooeee.birdsong.network.BirdsongClient
import com.khooeee.birdsong.network.ServerConfig
import kotlinx.coroutines.launch

private const val STEPS = """1. On your Mac, open Birdsong Settings and tick Allow the mobile apps over Tailscale.
2. Run the tailscale serve command it shows, once.
3. On this tablet, sign in to Tailscale on the same tailnet.
4. Click Copy Pairing Link on the Mac and paste it here."""

/** Paste the desktop's `birdsong://` link; Connect checks it before saving. */
@Composable
fun PairForm(prefill: String?, onPaired: (ServerConfig) -> Unit, modifier: Modifier = Modifier) {
    var link by remember(prefill) { mutableStateOf(prefill.orEmpty()) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val connect = connect@{
        val config = ServerConfig.parse(link)
        if (config == null) {
            error = "That isn't a Birdsong link. Copy it from Birdsong's Settings: birdsong://<mac>.ts.net[:port]?token=…"
            return@connect
        }
        error = null
        busy = true
        scope.launch {
            try {
                BirdsongClient(config).checkConnection()
                onPaired(config)
            } catch (e: Exception) {
                error = "Couldn't reach Birdsong: ${e.message}"
            } finally {
                busy = false
            }
        }
        Unit
    }

    Column(modifier, verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(STEPS, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        OutlinedTextField(
            value = link,
            onValueChange = { link = it },
            modifier = Modifier.fillMaxWidth(),
            enabled = !busy,
            singleLine = true,
            placeholder = { Text("birdsong://…") },
            textStyle = MaterialTheme.typography.bodyLarge.copy(fontFamily = FontFamily.Monospace),
            keyboardOptions = KeyboardOptions(autoCorrectEnabled = false, keyboardType = KeyboardType.Uri, imeAction = ImeAction.Go),
            keyboardActions = KeyboardActions(onGo = { connect() }),
        )
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(onClick = connect, enabled = !busy && link.isNotBlank()) { Text("Connect") }
            if (busy) CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp)
        }
        error?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
    }
}
