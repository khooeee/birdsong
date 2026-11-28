package com.khooeee.birdsong.network

import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/** A STUN/TURN server for the voice call, as Inworld hands it to the Mac; `urls` may be one string or many. */
data class VoiceIceServer(val urls: List<String>, val username: String?, val credential: String?) {
    /** A TURN relay: on some networks the only path that works. */
    val isRelay: Boolean get() = urls.any { it.startsWith("turn") }

    companion object {
        fun decode(element: JsonElement): VoiceIceServer {
            val fields = element.jsonObject
            val urls = when (val raw = fields["urls"]) {
                is JsonArray -> raw.map { it.jsonPrimitive.content }
                is JsonPrimitive -> listOf(raw.content)
                else -> throw SerializationException("An ICE server has no urls.")
            }
            return VoiceIceServer(
                urls,
                fields["username"]?.jsonPrimitive?.contentOrNull,
                fields["credential"]?.jsonPrimitive?.contentOrNull,
            )
        }
    }
}
