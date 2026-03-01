package com.rajutechie.streamkit.transport

import com.google.gson.Gson
import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.callbackFlow
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine

enum class ConnectionState { CONNECTING, CONNECTED, DISCONNECTED, RECONNECTING }

class WebSocketClient(private val wsUrl: String) {
    private var socket: Socket? = null
    private val gson = Gson()

    private val _connectionState = MutableStateFlow(ConnectionState.DISCONNECTED)
    val connectionState: StateFlow<ConnectionState> = _connectionState

    suspend fun connect(token: String) = suspendCoroutine { continuation ->
        val options = IO.Options().apply {
            auth = mapOf("token" to token)
            transports = arrayOf("websocket")
            reconnection = true
            reconnectionAttempts = 10
            reconnectionDelay = 1000
            reconnectionDelayMax = 30000
            timeout = 20000
        }

        _connectionState.value = ConnectionState.CONNECTING
        socket = IO.socket(wsUrl, options)

        socket?.on(Socket.EVENT_CONNECT) {
            _connectionState.value = ConnectionState.CONNECTED
            continuation.resume(Unit)
        }

        socket?.on(Socket.EVENT_CONNECT_ERROR) { args ->
            val error = args.firstOrNull() as? Exception
            if (_connectionState.value == ConnectionState.CONNECTING) {
                continuation.resumeWithException(error ?: Exception("Connection failed"))
            }
        }

        socket?.on(Socket.EVENT_DISCONNECT) {
            _connectionState.value = ConnectionState.DISCONNECTED
        }

        socket?.on("reconnecting") {
            _connectionState.value = ConnectionState.RECONNECTING
        }

        socket?.connect()
    }

    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
        _connectionState.value = ConnectionState.DISCONNECTED
    }

    fun emit(event: String, data: Any) {
        socket?.emit(event, gson.toJson(data))
    }

    fun <T> on(event: String, type: Class<T>): Flow<T> = callbackFlow {
        val listener = Emitter.Listener { args ->
            val json = args.firstOrNull()?.toString() ?: "{}"
            val parsed = gson.fromJson(json, type)
            trySend(parsed)
        }
        socket?.on(event, listener)
        awaitClose { socket?.off(event, listener) }
    }
}
