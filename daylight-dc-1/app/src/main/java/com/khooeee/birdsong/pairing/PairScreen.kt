package com.khooeee.birdsong.pairing

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.khooeee.birdsong.network.ServerConfig

/** The first screen, until a pairing link works. */
@Composable
fun PairScreen(prefill: String?, onPaired: (ServerConfig) -> Unit) {
    Box(Modifier.fillMaxSize().verticalScroll(rememberScrollState()), contentAlignment = Alignment.TopCenter) {
        Column(Modifier.widthIn(max = 640.dp).padding(32.dp)) {
            Text("Pair with Birdsong", style = MaterialTheme.typography.headlineMedium)
            PairForm(prefill, onPaired, Modifier.padding(top = 24.dp))
        }
    }
}
