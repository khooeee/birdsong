package com.khooeee.birdsong.network

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class VoiceIceServerTest {
    private fun decode(json: String) = VoiceIceServer.decode(BirdsongJson.parseToJsonElement(json))

    @Test
    fun urlsMayBeOneStringOrMany() {
        val stun = decode("""{"urls":"stun:stun.example.com:3478"}""")
        assertEquals(listOf("stun:stun.example.com:3478"), stun.urls)
        assertNull(stun.username)
        assertFalse(stun.isRelay)

        val turn = decode("""{"urls":["turn:a.example.com","turns:b.example.com"],"username":"u","credential":"c"}""")
        assertEquals(listOf("turn:a.example.com", "turns:b.example.com"), turn.urls)
        assertEquals("u", turn.username)
        assertEquals("c", turn.credential)
        assertTrue(turn.isRelay)
    }
}
