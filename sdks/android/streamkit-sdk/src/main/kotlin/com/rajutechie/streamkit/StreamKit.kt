package com.rajutechie.streamkit

import android.content.Context
import com.rajutechie.streamkit.modules.ChatModule
import com.rajutechie.streamkit.modules.CallModule
import com.rajutechie.streamkit.modules.MeetingModule
import com.rajutechie.streamkit.modules.StreamModule
import com.rajutechie.streamkit.transport.HttpClient
import com.rajutechie.streamkit.transport.WebSocketClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

data class RajutechieStreamKitConfig(
    val apiKey: String,
    val region: Region = Region.US_EAST_1,
    val apiUrl: String = "https://api.rajutechie-streamkit.io/v1",
    val wsUrl: String = "wss://ws.rajutechie-streamkit.io",
    val logLevel: LogLevel = LogLevel.WARN
)

enum class Region { US_EAST_1, US_WEST_2, EU_WEST_1, AP_SOUTHEAST_1 }
enum class LogLevel { DEBUG, INFO, WARN, ERROR }

class RajutechieStreamKit private constructor(
    private val context: Context,
    private val config: RajutechieStreamKitConfig
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val httpClient = HttpClient(config.apiUrl, config.apiKey)
    private val wsClient = WebSocketClient(config.wsUrl)

    val chat: ChatModule by lazy { ChatModule(httpClient, wsClient, scope) }
    val call: CallModule by lazy { CallModule(httpClient, wsClient, scope) }
    val meeting: MeetingModule by lazy { MeetingModule(httpClient, wsClient, scope) }
    val stream: StreamModule by lazy { StreamModule(httpClient, wsClient, scope) }

    var isConnected: Boolean = false
        private set

    suspend fun connect(userToken: String) {
        httpClient.setToken(userToken)
        wsClient.connect(userToken)
        isConnected = true
    }

    suspend fun disconnect() {
        wsClient.disconnect()
        httpClient.setToken(null)
        isConnected = false
    }

    companion object {
        @Volatile
        private var instance: RajutechieStreamKit? = null

        fun initialize(context: Context, config: RajutechieStreamKitConfig): RajutechieStreamKit {
            return instance ?: synchronized(this) {
                instance ?: RajutechieStreamKit(context.applicationContext, config).also { instance = it }
            }
        }

        fun getInstance(): RajutechieStreamKit {
            return instance ?: throw IllegalStateException("RajutechieStreamKit not initialized. Call initialize() first.")
        }
    }
}
