package com.khooeee.birdsong.network

import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/** A non-2xx reply; the desktop sends `{ "error": "…" }`. */
class ServerError(val status: Int, val serverMessage: String) : Exception(
    if (status == 401) "The pairing link is out of date. Copy a new one from Birdsong's Settings." else serverMessage,
) {
    companion object {
        fun from(status: Int, body: String): ServerError {
            val error = runCatching { BirdsongJson.parseToJsonElement(body).jsonObject["error"]?.jsonPrimitive?.content }
                .getOrNull()
            return ServerError(status, error ?: "HTTP $status")
        }
    }
}
