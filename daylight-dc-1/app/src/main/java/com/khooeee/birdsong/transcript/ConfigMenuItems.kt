package com.khooeee.birdsong.transcript

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.khooeee.birdsong.model.ConfigOption
import com.khooeee.birdsong.model.ConfigPickers

/**
 * A picker's menu: the current choice checked, headed groups, and, under the model, the settings that belong to
 * it, like the desktop.
 */
@Composable
fun ConfigMenuItems(
    category: ConfigCategory,
    pickers: Result<ConfigPickers>?,
    describe: (Throwable) -> String,
    onPick: (configId: String, value: String?) -> Unit,
) {
    val loaded = pickers?.getOrNull()
    when {
        pickers == null -> Disabled("Loading…")
        loaded == null -> Disabled("Couldn't load choices: ${describe(pickers.exceptionOrNull()!!)}")
        else -> {
            val options = loaded.options.filter { it.category == category.raw }
            if (options.isEmpty()) return Disabled("No choices from the agent")
            options.forEach { Choices(it, onPick) }
            if (category == ConfigCategory.Model) {
                loaded.options.filter { it.category == "model_config" }.forEach { setting ->
                    HorizontalDivider()
                    Heading(setting.name)
                    Choices(setting, onPick)
                }
            }
        }
    }
}

@Composable
private fun Choices(option: ConfigOption, onPick: (configId: String, value: String?) -> Unit) {
    option.groups.forEach { group ->
        group.name?.let { Heading(it) }
        group.choices.forEach { choice ->
            val current = choice.value == option.currentValue
            DropdownMenuItem(
                text = {
                    Column {
                        Text(choice.name)
                        choice.description?.let {
                            Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                },
                leadingIcon = { if (current) Icon(Icons.Filled.Check, contentDescription = "Current") },
                // Picking the current choice only closes the menu.
                onClick = { onPick(option.id, if (current) null else choice.value) },
            )
        }
    }
}

@Composable
private fun Heading(text: String) {
    Text(
        text,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

@Composable
private fun Disabled(text: String) {
    DropdownMenuItem(text = { Text(text) }, enabled = false, onClick = {})
}
