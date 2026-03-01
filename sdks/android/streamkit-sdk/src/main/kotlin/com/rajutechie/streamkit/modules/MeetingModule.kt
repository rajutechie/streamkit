package com.rajutechie.streamkit.modules

import com.rajutechie.streamkit.transport.HttpClient
import com.rajutechie.streamkit.transport.WebSocketClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow

data class Meeting(val id: String, val title: String, val meetingCode: String, val status: String, val hostId: String)
data class MeetingParticipant(val id: String, val meetingId: String, val userId: String, val role: String, val status: String)
data class MeetingConfig(val title: String, val description: String? = null, val scheduledAt: String? = null, val durationMins: Int = 60)
data class MeetingPoll(val id: String, val question: String, val options: List<PollOption>, val isActive: Boolean)
data class PollOption(val id: String, val text: String)

class MeetingModule(
    private val http: HttpClient,
    private val ws: WebSocketClient,
    private val scope: CoroutineScope
) {
    suspend fun schedule(config: MeetingConfig): Meeting = http.post("/meetings", config)
    suspend fun get(meetingId: String): Meeting = http.get("/meetings/$meetingId")
    suspend fun join(meetingId: String): MeetingParticipant = http.post("/meetings/$meetingId/join")
    suspend fun joinByCode(code: String): Meeting = http.get("/meetings/join/$code")
    suspend fun leave(meetingId: String) { http.post<Unit>("/meetings/$meetingId/leave") }
    suspend fun end(meetingId: String) { http.post<Unit>("/meetings/$meetingId/end") }
    suspend fun muteParticipant(meetingId: String, userId: String) { http.post<Unit>("/meetings/$meetingId/participants/$userId/mute") }
    suspend fun removeParticipant(meetingId: String, userId: String) { http.post<Unit>("/meetings/$meetingId/participants/$userId/remove") }
    suspend fun muteAll(meetingId: String) { http.post<Unit>("/meetings/$meetingId/mute-all") }

    fun raiseHand(meetingId: String) { ws.emit("hand.raise", mapOf("meetingId" to meetingId)) }
    fun lowerHand(meetingId: String) { ws.emit("hand.lower", mapOf("meetingId" to meetingId)) }

    suspend fun createPoll(meetingId: String, question: String, options: List<String>): MeetingPoll {
        return http.post("/meetings/$meetingId/polls", mapOf("question" to question, "options" to options))
    }

    suspend fun votePoll(meetingId: String, pollId: String, optionId: String) {
        http.post<Unit>("/meetings/$meetingId/polls/$pollId/vote", mapOf("optionId" to optionId))
    }

    suspend fun createBreakoutRooms(meetingId: String, rooms: List<Map<String, Any>>): List<BreakoutRoom> {
        return http.post("/meetings/$meetingId/breakout-rooms", mapOf("rooms" to rooms))
    }

    fun observeParticipants(): Flow<MeetingParticipant> = ws.on("meeting.participant.joined", MeetingParticipant::class.java)

    fun observePolls(): Flow<MeetingPoll> = ws.on("meeting.poll.created", MeetingPoll::class.java)

    fun observeParticipantLeft(): Flow<Map<String, String>> = ws.on("meeting.participant.left", Map::class.java as Class<Map<String, String>>)
}

data class BreakoutRoom(val id: String, val name: String, val meetingId: String, val participants: List<String>)
