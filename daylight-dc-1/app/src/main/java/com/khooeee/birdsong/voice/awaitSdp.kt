package com.khooeee.birdsong.voice

import java.io.IOException
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine
import org.webrtc.SdpObserver
import org.webrtc.SessionDescription

/** One of WebRTC's callback-style SDP calls, suspended until it's done: a create returns its description, a set null. */
internal suspend fun awaitSdp(call: (SdpObserver) -> Unit): SessionDescription? = suspendCancellableCoroutine { waiter ->
    call(object : SdpObserver {
        override fun onCreateSuccess(description: SessionDescription) = waiter.resume(description)

        override fun onSetSuccess() = waiter.resume(null)

        override fun onCreateFailure(error: String?) = waiter.resumeWithException(failure(error))

        override fun onSetFailure(error: String?) = waiter.resumeWithException(failure(error))
    })
}

private fun failure(error: String?) = IOException("Couldn't set up the voice call" + (error?.let { ": $it" } ?: "."))
