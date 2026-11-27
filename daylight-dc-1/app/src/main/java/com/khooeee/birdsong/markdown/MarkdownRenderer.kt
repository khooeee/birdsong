package com.khooeee.birdsong.markdown

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withLink
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.em
import org.commonmark.ext.autolink.AutolinkExtension
import org.commonmark.ext.gfm.strikethrough.Strikethrough
import org.commonmark.ext.gfm.strikethrough.StrikethroughExtension
import org.commonmark.node.BlockQuote
import org.commonmark.node.BulletList
import org.commonmark.node.Code
import org.commonmark.node.Emphasis
import org.commonmark.node.FencedCodeBlock
import org.commonmark.node.HardLineBreak
import org.commonmark.node.Heading
import org.commonmark.node.HtmlBlock
import org.commonmark.node.HtmlInline
import org.commonmark.node.Image
import org.commonmark.node.IndentedCodeBlock
import org.commonmark.node.Link
import org.commonmark.node.ListBlock
import org.commonmark.node.Node
import org.commonmark.node.OrderedList
import org.commonmark.node.Paragraph
import org.commonmark.node.SoftLineBreak
import org.commonmark.node.StrongEmphasis
import org.commonmark.node.Text
import org.commonmark.node.ThematicBreak
import org.commonmark.parser.Parser

/**
 * Markdown to styled text for replies: inline styles and links, headings in bold, lists, quotes, and code in
 * monospace. Single line breaks are kept, as agents write them. Only http, https and mailto links open.
 */
class MarkdownRenderer(private val muted: Color, private val codeBackground: Color, private val links: TextLinkStyles) {
    private val out = AnnotatedString.Builder()
    /** What follows each line break inside a list item or quote, so wrapped content lines up. */
    private var indent = ""

    fun render(markdown: String): AnnotatedString {
        blocks(PARSER.parse(markdown), separator = 2)
        return out.toAnnotatedString()
    }

    private fun blocks(parent: Node, separator: Int) {
        var child = parent.firstChild
        var first = true
        while (child != null) {
            if (!first) repeat(separator) { newline() }
            block(child)
            first = false
            child = child.next
        }
    }

    private fun block(node: Node) {
        when (node) {
            is Paragraph -> inlines(node)
            is Heading -> out.withStyle(SpanStyle(fontWeight = FontWeight.Bold, fontSize = if (node.level <= 2) 1.1.em else 1.em)) {
                inlines(node)
            }
            is BulletList -> items(node) { "•  " }
            is OrderedList -> {
                var number = node.markerStartNumber ?: 1
                items(node) { "${number++}.  " }
            }
            is BlockQuote -> out.withStyle(SpanStyle(color = muted)) {
                out.append(QUOTE)
                nested(QUOTE) { blocks(node, separator = 1) }
            }
            is FencedCodeBlock -> code(node.literal)
            is IndentedCodeBlock -> code(node.literal)
            is ThematicBreak -> out.append("———")
            is HtmlBlock -> lines(node.literal.trimEnd())
            else -> blocks(node, separator = 2)
        }
    }

    private fun items(list: ListBlock, marker: () -> String) {
        var item = list.firstChild
        var first = true
        while (item != null) {
            if (!first) repeat(if (list.isTight) 1 else 2) { newline() }
            val text = marker()
            out.append(text)
            nested(" ".repeat(text.length + 1)) { blocks(item, separator = if (list.isTight) 1 else 2) }
            first = false
            item = item.next
        }
    }

    private fun code(literal: String) {
        out.withStyle(SpanStyle(fontFamily = FontFamily.Monospace, fontSize = 0.85.em, color = muted)) {
            lines(literal.trimEnd('\n'))
        }
    }

    private fun inlines(parent: Node) {
        var child = parent.firstChild
        while (child != null) {
            inline(child)
            child = child.next
        }
    }

    private fun inline(node: Node) {
        when (node) {
            is Text -> out.append(node.literal)
            is Emphasis -> out.withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { inlines(node) }
            is StrongEmphasis -> out.withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { inlines(node) }
            is Strikethrough -> out.withStyle(SpanStyle(textDecoration = TextDecoration.LineThrough)) { inlines(node) }
            is Code -> out.withStyle(SpanStyle(fontFamily = FontFamily.Monospace, fontSize = 0.9.em, background = codeBackground)) {
                out.append(node.literal)
            }
            is Link -> if (isOpenable(node.destination)) {
                out.withLink(LinkAnnotation.Url(node.destination, links)) { inlines(node) }
            } else {
                inlines(node)
            }
            is Image -> inlines(node)
            is SoftLineBreak, is HardLineBreak -> newline()
            is HtmlInline -> out.append(node.literal)
            else -> inlines(node)
        }
    }

    private fun lines(text: String) {
        text.split("\n").forEachIndexed { index, line ->
            if (index > 0) newline()
            out.append(line)
        }
    }

    private fun newline() {
        out.append("\n")
        out.append(indent)
    }

    private inline fun nested(prefix: String, body: () -> Unit) {
        val saved = indent
        indent += prefix
        body()
        indent = saved
    }

    private companion object {
        const val QUOTE = "│ "
        val PARSER: Parser = Parser.builder()
            .extensions(listOf(AutolinkExtension.create(), StrikethroughExtension.create()))
            .build()

        fun isOpenable(destination: String): Boolean {
            val scheme = destination.substringBefore(':', "").lowercase()
            return scheme == "http" || scheme == "https" || scheme == "mailto"
        }
    }
}
