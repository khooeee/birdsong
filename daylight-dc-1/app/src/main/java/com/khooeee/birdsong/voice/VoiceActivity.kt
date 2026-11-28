package com.khooeee.birdsong.voice

/** What the voice agent is doing, from the call's events (as the desktop's mic button shows it). */
enum class VoiceActivity {
    Idle,
    Thinking,
    Speaking,
    ;

    companion object {
        /** The activity an event moves to; null when the event doesn't change it. */
        fun from(eventType: String): VoiceActivity? = when (eventType) {
            "input_audio_buffer.committed", "response.created" -> Thinking
            "response.content_part.added", "output_audio_buffer.started" -> Speaking
            "output_audio_buffer.stopped", "response.done" -> Idle
            else -> null
        }
    }
}
