package com.rajutechie.streamkit.modules

import com.rajutechie.streamkit.transport.HttpClient
import com.rajutechie.streamkit.transport.WebSocketClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow

data class Channel(val id: String, val type: String, val name: String?, val memberCount: Int)
data class Message(val id: String, val channelId: String, val senderId: String, val content: MessageContent, val createdAt: String)
data class MessageContent(val text: String?, val attachments: List<Attachment>? = null)
data class Attachment(val type: String, val url: String, val filename: String?)
data class ChannelConfig(val type: ChannelType, val name: String?, val members: List<String>?) {
    companion object {
        fun builder() = Builder()
    }
    class Builder {
        private var type: ChannelType = ChannelType.GROUP
        private var name: String? = null
        private var members: List<String>? = null
        fun type(t: ChannelType) = apply { type = t }
        fun name(n: String) = apply { name = n }
        fun members(m: List<String>) = apply { members = m }
        fun build() = ChannelConfig(type, name, members)
    }
}
enum class ChannelType { DIRECT, GROUP, COMMUNITY, OPEN }

class ChatModule(
    private val http: HttpClient,
    private val ws: WebSocketClient,
    private val scope: CoroutineScope
) {
    suspend fun createChannel(config: ChannelConfig): Channel {
        return http.post("/channels", config)
    }

    suspend fun getChannel(channelId: String): Channel {
        return http.get("/channels/$channelId")
    }

    suspend fun sendMessage(channelId: String, text: String, attachments: List<Attachment>? = null): Message {
        val body = mapOf("text" to text, "attachments" to attachments)
        return http.post("/channels/$channelId/messages", body)
    }

    suspend fun getMessages(channelId: String, limit: Int = 25, after: String? = null): List<Message> {
        val params = mutableMapOf("limit" to limit.toString())
        after?.let { params["after"] = it }
        val result: Map<String, Any> = http.get("/channels/$channelId/messages", params)
        @Suppress("UNCHECKED_CAST")
        return result["data"] as? List<Message> ?: emptyList()
    }

    suspend fun editMessage(channelId: String, messageId: String, text: String): Message {
        return http.patch("/channels/$channelId/messages/$messageId", mapOf("text" to text))
    }

    suspend fun deleteMessage(channelId: String, messageId: String) {
        http.delete<Unit>("/channels/$channelId/messages/$messageId")
    }

    suspend fun addReaction(channelId: String, messageId: String, emoji: String) {
        http.post<Unit>("/channels/$channelId/messages/$messageId/reactions", mapOf("emoji" to emoji))
    }

    fun startTyping(channelId: String) {
        ws.emit("typing.start", mapOf("channelId" to channelId))
    }

    fun stopTyping(channelId: String) {
        ws.emit("typing.stop", mapOf("channelId" to channelId))
    }

    fun observeMessages(channelId: String): Flow<Message> {
        return ws.on("message.new", Message::class.java)
    }
}
