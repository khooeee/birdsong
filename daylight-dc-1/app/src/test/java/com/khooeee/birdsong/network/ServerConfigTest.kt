package com.khooeee.birdsong.network

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ServerConfigTest {
    @Test
    fun tailnetLinkUsesHttpsWithPortAndToken() {
        val config = ServerConfig.parse("  birdsong://Mac.tail1234.ts.net:8443?token=abc%2B123  ")!!
        assertEquals("https://mac.tail1234.ts.net:8443/", config.baseUrl.toString())
        assertEquals("abc+123", config.token)
        assertEquals("birdsong://Mac.tail1234.ts.net:8443?token=abc%2B123", config.link)
    }

    @Test
    fun loopbackUsesPlainHttp() {
        assertEquals("http://localhost:7389/", ServerConfig.parse("birdsong://localhost:7389?token=t")!!.baseUrl.toString())
    }

    @Test
    fun refusesOtherHostsSchemesAndMissingTokens() {
        assertNull(ServerConfig.parse("birdsong://example.com?token=t"))
        assertNull(ServerConfig.parse("https://mac.tail1234.ts.net?token=t"))
        assertNull(ServerConfig.parse("birdsong://mac.tail1234.ts.net"))
        assertNull(ServerConfig.parse("birdsong://mac.tail1234.ts.net?token="))
        assertNull(ServerConfig.parse("not a link"))
    }
}
