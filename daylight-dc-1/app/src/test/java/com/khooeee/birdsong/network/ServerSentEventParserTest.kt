package com.khooeee.birdsong.network

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ServerSentEventParserTest {
    @Test
    fun namedEventThenDefaultName() {
        val parser = ServerSentEventParser()
        assertNull(parser.consume("event: sessions"))
        assertEquals("sessions" to " {\"a\":1}", parser.consume("data: {\"a\":1}"))
        assertNull(parser.consume(""))
        assertEquals("message" to "x", parser.consume("data:x"))
    }

    @Test
    fun ignoresPingComments() {
        val parser = ServerSentEventParser()
        assertNull(parser.consume(": ping"))
        assertNull(parser.consume(""))
    }

    @Test
    fun keepsLineSeparatorCharactersInData() {
        val parser = ServerSentEventParser()
        parser.consume("event: turn")
        assertEquals("turn" to "a b", parser.consume("data:a b"))
    }
}
