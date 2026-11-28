package com.khooeee.birdsong.network

import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.time.Duration
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.channels.trySendBlocking
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.Call
import okhttp3.Callback
import okhttp3.ConnectionPool
import okhttp3.Dispatcher
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.coroutines.executeAsync

/** Requests and event streams to the paired Mac, with its bearer token. */
class BirdsongHttp(private val config: ServerConfig) {
    /** The Mac didn't send its opening event in time. */
    class NotAnswering : IOException("Your Mac isn't answering.")

    @Volatile
    private var client = OkHttpClient.Builder()
        // Event streams ping every 20s, so a minute of silence means the Mac is gone.
        .readTimeout(60, TimeUnit.SECONDS)
        // `tailscale serve` speaks HTTP/2; pings find a connection that died silently (Wi-Fi to cellular).
        .pingInterval(15, TimeUnit.SECONDS)
        // Each open event stream holds a slot.
        .dispatcher(Dispatcher().apply { maxRequestsPerHost = 16 })
        .build()

    /** The reply body; throws `ServerError` for a non-2xx reply. */
    suspend fun send(path: List<String>, method: String = "GET", json: String? = null): String {
        val body = json?.toRequestBody(JSON)
        val request = request(path).method(method, body ?: if (method == "GET") null else EMPTY).build()
        return withContext(Dispatchers.IO) {
            client.newCall(request).executeAsync().use { response ->
                val text = response.body.string()
                if (!response.isSuccessful) throw ServerError.from(response.code, text)
                text
            }
        }
    }

    /** Fails unless an event arrives within `firstWithin`; the desktop always sends one on opening. */
    fun events(path: List<String>, firstWithin: Duration): Flow<RemoteEvent> = callbackFlow {
        val call = client.newCall(request(path).build())
        val deadline = launch {
            delay(firstWithin)
            close(NotAnswering())
        }
        call.enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                close(e)
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    try {
                        if (!it.isSuccessful) throw ServerError.from(it.code, it.body.string())
                        val source = it.body.source()
                        val parser = ServerSentEventParser()
                        while (true) {
                            // Lines end at `\n` only, so U+2028 inside a message can't split it. A line past the cap fails the
                            // stream rather than growing the buffer without bound.
                            val line = source.readUtf8LineStrict(MAX_LINE_BYTES)
                            val (name, data) = parser.consume(line) ?: continue
                            val event = RemoteEvent.decode(name, data) ?: continue
                            deadline.cancel()
                            trySendBlocking(event)
                        }
                        close()
                    } catch (e: Exception) {
                        close(e)
                    }
                }
            }
        })
        awaitClose {
            deadline.cancel()
            call.cancel()
        }
    }

    /** New requests open fresh connections, rather than queue on one that may be dead. Idle-only eviction can't retire a busy one, so swap the pool. */
    suspend fun dropConnections() {
        val old = client
        client = old.newBuilder().connectionPool(ConnectionPool()).build()
        // Closing a TLS connection writes to its socket, which Android forbids on the main thread.
        withContext(Dispatchers.IO + NonCancellable) { old.connectionPool.evictAll() }
    }

    private fun request(path: List<String>): Request.Builder {
        val url = config.baseUrl.newBuilder().apply { path.forEach(::addPathSegment) }.build()
        return Request.Builder().url(url).header("Authorization", "Bearer ${config.token}")
    }

    private companion object {
        /** Large enough for a whole session's transcript sent in one reset event. */
        const val MAX_LINE_BYTES = 32L * 1024 * 1024
        val JSON = "application/json".toMediaType()
        val EMPTY = ByteArray(0).toRequestBody(null)
    }
}
