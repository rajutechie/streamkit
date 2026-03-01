import Foundation

public struct Meeting: Codable {
    public let id: String
    public let title: String
    public let meetingCode: String
    public let status: String
    public let hostId: String
}

public struct MeetingParticipant: Codable {
    public let id: String
    public let meetingId: String
    public let userId: String
    public let role: String
    public let status: String
}

public struct MeetingConfigBuilder {
    private var title: String
    private var description: String?
    private var scheduledAt: Date?
    private var waitingRoom: Bool = true
    private var maxParticipants: Int = 100

    public init(title: String, scheduledAt: Date? = nil) {
        self.title = title
        self.scheduledAt = scheduledAt
    }

    public func waitingRoom(_ enabled: Bool) -> MeetingConfigBuilder {
        var copy = self
        copy.waitingRoom = enabled
        return copy
    }

    public func maxParticipants(_ count: Int) -> MeetingConfigBuilder {
        var copy = self
        copy.maxParticipants = count
        return copy
    }
}

public final class MeetingModule {
    private let http: HTTPClient
    private let ws: WebSocketClient

    init(http: HTTPClient, ws: WebSocketClient) {
        self.http = http
        self.ws = ws
    }

    public func schedule(_ config: MeetingConfigInput) async throws -> Meeting {
        let result: Meeting = try await http.post("/meetings", body: config)
        return result
    }

    public func get(_ meetingId: String) async throws -> Meeting {
        let result: Meeting = try await http.get("/meetings/\(meetingId)")
        return result
    }

    public func join(_ meetingId: String) async throws -> MeetingParticipant {
        let result: MeetingParticipant = try await http.post("/meetings/\(meetingId)/join")
        return result
    }

    public func joinByCode(_ code: String) async throws -> Meeting {
        let result: Meeting = try await http.get("/meetings/join/\(code)")
        return result
    }

    public func leave(_ meetingId: String) async throws {
        let _: EmptyResponse = try await http.post("/meetings/\(meetingId)/leave")
    }

    public func end(_ meetingId: String) async throws {
        let _: EmptyResponse = try await http.post("/meetings/\(meetingId)/end")
    }

    public func muteParticipant(_ meetingId: String, userId: String) async throws {
        let _: EmptyResponse = try await http.post("/meetings/\(meetingId)/participants/\(userId)/mute")
    }

    public func removeParticipant(_ meetingId: String, userId: String) async throws {
        let _: EmptyResponse = try await http.post("/meetings/\(meetingId)/participants/\(userId)/remove")
    }

    public func muteAll(_ meetingId: String) async throws {
        let _: EmptyResponse = try await http.post("/meetings/\(meetingId)/mute-all")
    }

    public func createPoll(_ meetingId: String, question: String, options: [String], isAnonymous: Bool = false) async throws -> MeetingPoll {
        struct CreatePollBody: Encodable {
            let question: String
            let options: [String]
            let isAnonymous: Bool
        }
        let result: MeetingPoll = try await http.post("/meetings/\(meetingId)/polls", body: CreatePollBody(question: question, options: options, isAnonymous: isAnonymous))
        return result
    }

    public func votePoll(_ meetingId: String, pollId: String, optionId: String) async throws {
        struct VotePollBody: Encodable {
            let optionId: String
        }
        let _: EmptyResponse = try await http.post("/meetings/\(meetingId)/polls/\(pollId)/vote", body: VotePollBody(optionId: optionId))
    }

    public func createBreakoutRooms(_ meetingId: String, rooms: [BreakoutRoomInput]) async throws -> [BreakoutRoom] {
        struct CreateBreakoutRoomsBody: Encodable {
            let rooms: [BreakoutRoomInput]
        }
        let result: [BreakoutRoom] = try await http.post("/meetings/\(meetingId)/breakout-rooms", body: CreateBreakoutRoomsBody(rooms: rooms))
        return result
    }

    public func raiseHand(_ meetingId: String) {
        Task { await ws.send(type: "hand.raise", data: ["meetingId": meetingId]) }
    }

    public func lowerHand(_ meetingId: String) {
        Task { await ws.send(type: "hand.lower", data: ["meetingId": meetingId]) }
    }

    /// Async stream of participant events (joined/left) for a given meeting.
    public func observeParticipants(meetingId: String) -> AsyncStream<MeetingParticipant> {
        AsyncStream { continuation in
            Task {
                await ws.on("meeting.participant.joined") { data in
                    if let p = try? JSONDecoder().decode(MeetingParticipant.self, from: data),
                       p.meetingId == meetingId {
                        continuation.yield(p)
                    }
                }
            }
        }
    }

    /// Async stream of poll events for a given meeting.
    public func observePolls(meetingId: String) -> AsyncStream<MeetingPoll> {
        AsyncStream { continuation in
            Task {
                await ws.on("meeting.poll.created") { data in
                    if let poll = try? JSONDecoder().decode(MeetingPoll.self, from: data),
                       poll.meetingId == meetingId {
                        continuation.yield(poll)
                    }
                }
                await ws.on("meeting.poll.result") { data in
                    if let poll = try? JSONDecoder().decode(MeetingPoll.self, from: data),
                       poll.meetingId == meetingId {
                        continuation.yield(poll)
                    }
                }
            }
        }
    }
}

public struct MeetingPoll: Codable {
    public let id: String
    public let meetingId: String
    public let question: String
    public let options: [PollOption]
    public let isActive: Bool
    public let isAnonymous: Bool
}

public struct PollOption: Codable {
    public let id: String
    public let text: String
    public let votes: Int
}

public struct BreakoutRoom: Codable {
    public let id: String
    public let name: String
    public let meetingId: String
    public let participants: [String]
}

public struct BreakoutRoomInput: Encodable {
    public let name: String
    public let participants: [String]
    
    public init(name: String, participants: [String]) {
        self.name = name
        self.participants = participants
    }
}

public struct MeetingConfigInput: Encodable {
    public let title: String
    public let description: String?
    public let scheduledAt: String?
    public let durationMins: Int

    public init(title: String, description: String? = nil, scheduledAt: String? = nil, durationMins: Int = 60) {
        self.title = title
        self.description = description
        self.scheduledAt = scheduledAt
        self.durationMins = durationMins
    }
}
