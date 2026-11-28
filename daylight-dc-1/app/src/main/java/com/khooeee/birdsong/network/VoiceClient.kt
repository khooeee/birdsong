package com.khooeee.birdsong.network

import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

/**
 * The Mac's voice routes. The tablet only asks it to start (on a session), answer its offer, mark the call open, and
 * stop; the Mac drives the call itself, and the audio goes straight to Inworld.
 */
class VoiceClient(private val http: BirdsongHttp) {
    /**
     * ICE servers for a new call on a session. `resume` after a drop fails with a 409 `ServerError` if voice was
     * stopped or moved to another session meanwhile.
     */
    suspend fun start(sessionId: String, resume: Boolean, reason: String?): List<VoiceIceServer> {
        val body = buildJsonObject {
            put("sessionId", sessionId)
            put("resume", resume)
            reason?.let { put("reason", it) }
        }
        val reply = BirdsongJson.parseToJsonElement(post("start", body.toString())).jsonObject
        return reply["iceServers"]?.jsonArray.orEmpty().map(VoiceIceServer::decode)
    }

    /** The tablet's SDP offer → Inworld's answer; the Mac attaches to the call before replying. */
    suspend fun answer(offer: String): String {
        val reply = post("answer", buildJsonObject { put("sdp", offer) }.toString())
        return BirdsongJson.parseToJsonElement(reply).jsonObject.getValue("sdp").jsonPrimitive.content
    }

    /** The call's media is up, so the Mac can start speaking notices. */
    suspend fun opened() {
        post("open", "{}")
    }

    suspend fun stop() {
        post("stop", "{}")
    }

    private suspend fun post(route: String, json: String) = http.send(listOf("voice", route), "POST", json)
}
