package com.khooeee.birdsong.markdown

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.TextLinkStyles
import org.junit.Assert.assertEquals
import org.junit.Test

class MarkdownRendererTest {
    private fun render(markdown: String) = MarkdownRenderer(Color.Gray, Color.LightGray, TextLinkStyles()).render(markdown)

    @Test
    fun keepsSingleLineBreaksAndSeparatesParagraphs() {
        assertEquals("one\ntwo\n\nthree", render("one\ntwo\n\nthree").text)
    }

    @Test
    fun rendersListsHeadingsQuotesAndCode() {
        val text = render("# Title\n\n- a\n- b\n  more\n\n1. x\n2. y\n\n> quoted\n\n```\ncode()\n```").text
        assertEquals("Title\n\n•  a\n•  b\n    more\n\n1.  x\n2.  y\n\n│ quoted\n\ncode()", text)
    }

    @Test
    fun linksOnlyOpenableSchemes() {
        val text = render("[site](https://example.com) [app](file:///etc) see https://x.dev")
        val urls = text.getLinkAnnotations(0, text.length).map { (it.item as LinkAnnotation.Url).url }
        assertEquals(listOf("https://example.com", "https://x.dev"), urls)
        assertEquals("site app see https://x.dev", text.text)
    }
}
