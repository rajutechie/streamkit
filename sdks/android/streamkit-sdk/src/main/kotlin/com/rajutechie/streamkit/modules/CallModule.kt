package com.rajutechie.streamkit.modules

import com.rajutechie.streamkit.transport.HttpClient
import com.rajutechie.streamkit.transport.WebSocketClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow

data class Call(val id: String, val type: CallType, val status: String, val initiatedBy: String)
data class CallConfig(val type: CallType, val participants: List<String>, val channelId: String? = null)
enum class CallType { AUDIO, VIDEO }

class CallModule(
    private val http: HttpClient,
    private val ws: WebSocketClient,
    private val scope: CoroutineScope
) {
    suspend fun start(config: CallConfig): Call = http.post("/calls", config)
    suspend fun get(callId: String): Call = http.get("/calls/$callId")
    suspend fun accept(callId: String) { http.post<Unit>("/calls/$callId/accept") }
    suspend fun reject(callId: String, reason: String? = null) { http.post<Unit>("/calls/$callId/reject", mapOf("reason" to reason)) }
    suspend fun end(callId: String) { http.post<Unit>("/calls/$callId/end") }
    suspend fun startRecording(callId: String) { http.post<Unit>("/calls/$callId/recording/start") }
    suspend fun stopRecording(callId: String) { http.post<Unit>("/calls/$callId/recording/stop") }

    fun toggleAudio(callId: String, enabled: Boolean) {
        ws.emit("call.signal", mapOf("callId" to callId, "action" to "toggle_audio", "enabled" to enabled))
    }

    fun toggleVideo(callId: String, enabled: Boolean) {
        ws.emit("call.signal", mapOf("callId" to callId, "action" to "toggle_video", "enabled" to enabled))
    }

    fun switchCamera(callId: String) {
        ws.emit("call.signal", mapOf("callId" to callId, "action" to "switch_camera"))
    }

    suspend fun startScreenShare(callId: String) {
        http.post<Unit>("/calls/$callId/screen-share/start")
    }

    suspend fun stopScreenShare(callId: String) {
        http.post<Unit>("/calls/$callId/screen-share/stop")
    }

    suspend fun getStats(callId: String): CallStats = http.get("/calls/$callId/stats")

    fun observeIncomingCalls(): Flow<Call> = ws.on("call.incoming", Call::class.java)

    fun observeCallEvents(): Flow<CallEvent> = ws.on("call.event", CallEvent::class.java)
}

data class CallStats(
    val callId: String,
    val audioPacketsLost: Int,
    val videoPacketsLost: Int,
    val audioJitter: Double,
    val videoJitter: Double,
    val roundTripTime: Double,
    val bitrate: Double,
)

data class CallEvent(val callId: String, val type: String, val data: Map<String, Any>?)
