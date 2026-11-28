package com.khooeee.birdsong.model

import kotlinx.serialization.Serializable

/** The desktop rail: pinned sessions first, then the rest, newest activity first. */
@Serializable
data class SessionList(val pinned: List<Session> = emptyList(), val unpinned: List<Session> = emptyList()) {
    val all: List<Session> get() = pinned + unpinned
}
