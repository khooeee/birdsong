package com.khooeee.birdsong.usage

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.khooeee.birdsong.model.AgentUsage
import com.khooeee.birdsong.model.UsageAgent
import com.khooeee.birdsong.network.BirdsongClient
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

/** Usage and limits for every agent installed on the Mac, read fresh each time it opens or refreshes. */
@Composable
fun UsageDialog(client: BirdsongClient, onDismiss: () -> Unit) {
    var revision by remember { mutableIntStateOf(0) }
    var agents by remember { mutableStateOf<List<UsageAgent>?>(null) }
    val usage = remember { mutableStateMapOf<String, AgentUsage>() }
    var error by remember { mutableStateOf<String?>(null) }

    // Each agent reads at once, so every agent fills in as soon as its own CLI answers.
    LaunchedEffect(revision) {
        agents = null
        usage.clear()
        error = null
        val list = try {
            client.usageAgents()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            error = e.message ?: "Couldn't read usage."
            return@LaunchedEffect
        }
        agents = list
        coroutineScope {
            list.forEach { agent ->
                launch {
                    usage[agent.agent] = try {
                        client.usage(agent.agent)
                    } catch (e: CancellationException) {
                        throw e
                    } catch (e: Exception) {
                        AgentUsage(agent.agent, agent.name, error = e.message ?: "Couldn't read usage.")
                    }
                }
            }
        }
    }

    val reading = error == null && agents.let { it == null || it.size > usage.size }
    val now = System.currentTimeMillis()
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Usage") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                val current = agents
                when {
                    error != null -> Text(error.orEmpty(), style = MaterialTheme.typography.bodyMedium)
                    current == null -> CircularProgressIndicator()
                    current.isEmpty() -> Text("No agents with usage are installed on the Mac.")
                    else -> current.forEachIndexed { index, agent ->
                        if (index > 0) HorizontalDivider()
                        AgentUsageBlock(agent.name, usage[agent.agent], now)
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Close") } },
        dismissButton = {
            TextButton(enabled = !reading, onClick = { revision++ }) { Text(if (reading) "Reading…" else "Refresh") }
        },
    )
}
