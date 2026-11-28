package com.khooeee.birdsong.model

import kotlinx.serialization.Serializable

/** A turn's steps: the ids of all of them in order, and the ones new or changed since the last event. */
@Serializable
data class RemoteTurnDetail(
    val turnId: String,
    val status: RemoteTurn.Status = RemoteTurn.Status.Complete,
    val order: List<String> = emptyList(),
    val items: List<RemoteTurnItem> = emptyList(),
)
