package com.khooeee.birdsong.voice

/**
 * Voice on the tablet: the session it's on (kept after it stops, so that session's mic can show the last error), its
 * state, and why it last stopped by itself.
 */
data class VoiceStatus(
    val sessionId: String? = null,
    val state: VoiceState = VoiceState.Off,
    val error: String? = null,
) {
    fun isOn(sessionId: String) = state != VoiceState.Off && this.sessionId == sessionId
}
