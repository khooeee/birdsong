package com.khooeee.birdsong.voice

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class VoiceActivityTest {
    @Test
    fun eventsMoveTheAgentBetweenThinkingSpeakingAndIdle() {
        assertEquals(VoiceActivity.Thinking, VoiceActivity.from("input_audio_buffer.committed"))
        assertEquals(VoiceActivity.Speaking, VoiceActivity.from("output_audio_buffer.started"))
        assertEquals(VoiceActivity.Idle, VoiceActivity.from("response.done"))
        assertNull(VoiceActivity.from("session.updated"))
    }
}
