package com.khooeee.birdsong.app

import kotlinx.coroutines.flow.MutableStateFlow

/** What the activity was opened for, until the screen that handles it takes it. */
class LaunchRequests {
    /** A tapped alert's session. */
    val sessionId = MutableStateFlow<String?>(null)

    /** A tapped `birdsong://` pairing link, to fill in the pairing form. */
    val pairingLink = MutableStateFlow<String?>(null)
}
