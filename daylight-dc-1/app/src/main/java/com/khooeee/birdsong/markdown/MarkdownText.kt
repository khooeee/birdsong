package com.khooeee.birdsong.markdown

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextDecoration

/** A reply or step rendered from markdown; links open in the browser. */
@Composable
fun MarkdownText(markdown: String, style: TextStyle, modifier: Modifier = Modifier) {
    val colors = MaterialTheme.colorScheme
    val text = remember(markdown, colors) {
        val links = TextLinkStyles(SpanStyle(textDecoration = TextDecoration.Underline))
        MarkdownRenderer(colors.onSurfaceVariant, colors.surfaceContainerHighest, links).render(markdown)
    }
    Text(text, modifier = modifier, style = style)
}
