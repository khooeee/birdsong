package com.khooeee.birdsong.network

import java.net.URI
import java.net.URLDecoder
import okhttp3.HttpUrl

/** Where the desktop app is and the token it pairs with, from `birdsong://<mac>.ts.net[:port]?token=…`. */
data class ServerConfig(val link: String, val baseUrl: HttpUrl, val token: String) {
    companion object {
        fun parse(raw: String): ServerConfig? {
            val link = raw.trim()
            val uri = runCatching { URI(link) }.getOrNull() ?: return null
            if (uri.scheme?.lowercase() != "birdsong") return null
            val host = uri.host?.lowercase() ?: return null
            if (!allowedHost(host)) return null
            val token = uri.rawQuery.orEmpty().split("&")
                .map { it.split("=", limit = 2) }
                .firstOrNull { it.size == 2 && it[0] == "token" }
                ?.let { URLDecoder.decode(it[1], "UTF-8") }
            if (token.isNullOrEmpty()) return null
            if (uri.port != -1 && uri.port !in 1..65535) return null
            val base = HttpUrl.Builder()
                // The tailnet is https via `tailscale serve`; plain http only to loopback, for an emulator.
                .scheme(if (isLoopback(host)) "http" else "https")
                .host(host)
                .apply { if (uri.port != -1) port(uri.port) }
                .build()
            return ServerConfig(link, base, token)
        }

        /** Your tailnet, or loopback for an emulator. A link to any other host would send your prompts there. */
        private fun allowedHost(host: String) = isLoopback(host) || host.endsWith(".ts.net")

        private fun isLoopback(host: String) = host == "localhost" || host == "127.0.0.1"
    }
}
