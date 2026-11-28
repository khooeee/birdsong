package com.khooeee.birdsong.network

import kotlinx.serialization.json.Json

/** Lenient about what a newer Mac adds: unknown keys are skipped, unknown enum values take the default. */
val BirdsongJson = Json {
    ignoreUnknownKeys = true
    coerceInputValues = true
    explicitNulls = false
}
