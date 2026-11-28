package com.khooeee.birdsong.voice

/** Whether voice is on, and once its call is up, what the agent is doing. */
sealed interface VoiceState {
    data object Off : VoiceState

    data object Connecting : VoiceState

    data class Live(val activity: VoiceActivity) : VoiceState
}
