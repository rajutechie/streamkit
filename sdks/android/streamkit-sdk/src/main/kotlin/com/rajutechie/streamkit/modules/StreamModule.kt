package com.rajutechie.streamkit.modules

import com.rajutechie.streamkit.transport.HttpClient
import com.rajutechie.streamkit.transport.WebSocketClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow

data class LiveStream(val id: String, val title: String, val streamKey: String, val status: String, val hlsUrl: String?, val viewerCount: Int)

class StreamModule(
    private val http: HttpClient,
    private val ws: WebSocketClient,
    private val scope: CoroutineScope
) {
    suspend fun create(title: String, visibility: String = "public"): LiveStream {
        return http.post("/streams", mapOf("title" to title, "visibility" to visibility))
    }

    suspend fun get(streamId: String): LiveStream = http.get("/streams/$streamId")
    suspend fun start(streamId: String): LiveStream = http.post("/streams/$streamId/start")
    suspend fun stop(streamId: String): LiveStream = http.post("/streams/$streamId/stop")

    suspend fun getViewerCount(streamId: String): Int {
        val result: Map<String, Any> = http.get("/streams/$streamId/viewers")
        return (result["count"] as? Double)?.toInt() ?: 0
    }

    fun observeViewerCount(): Flow<Map<String, Any>> = ws.on("stream.viewer.count", Map::class.java) as Flow<Map<String, Any>>
}
