import Foundation

public struct Call: Codable {
    public let id: String
    public let type: String
    public let status: String
    public let initiatedBy: String
}

public struct CallConfig: Encodable {
    public let type: String
    public let participants: [String]
    public let channelId: String?

    public init(type: String = "video", participants: [String], channelId: String? = nil) {
        self.type = type
        self.participants = participants
        self.channelId = channelId
    }
}

public final class CallModule {
    private let http: HTTPClient
    private let ws: WebSocketClient

    init(http: HTTPClient, ws: WebSocketClient) {
        self.http = http
        self.ws = ws
    }

    public func start(_ config: CallConfig) async throws -> Call {
        let result: Call = try await http.post("/calls", body: config)
        return result
    }

    public func get(_ callId: String) async throws -> Call {
        let result: Call = try await http.get("/calls/\(callId)")
        return result
    }

    public func accept(_ callId: String) async throws {
        let _: EmptyResponse = try await http.post("/calls/\(callId)/accept")
    }

    public func reject(_ callId: String, reason: String? = nil) async throws {
        struct RejectCallBody: Encodable {
            let reason: String
        }
        let _: EmptyResponse = try await http.post("/calls/\(callId)/reject", body: RejectCallBody(reason: reason ?? ""))
    }

    public func end(_ callId: String) async throws {
        let _: EmptyResponse = try await http.post("/calls/\(callId)/end")
    }

    public func startRecording(_ callId: String) async throws {
        let _: EmptyResponse = try await http.post("/calls/\(callId)/recording/start")
    }

    public func stopRecording(_ callId: String) async throws {
        let _: EmptyResponse = try await http.post("/calls/\(callId)/recording/stop")
    }

    public func toggleAudio(_ callId: String, enabled: Bool) {
        Task { await ws.send(type: "call.signal", data: ["callId": callId, "action": "toggle_audio", "enabled": enabled]) }
    }

    public func toggleVideo(_ callId: String, enabled: Bool) {
        Task { await ws.send(type: "call.signal", data: ["callId": callId, "action": "toggle_video", "enabled": enabled]) }
    }

    public func switchCamera(_ callId: String) {
        Task { await ws.send(type: "call.signal", data: ["callId": callId, "action": "switch_camera"]) }
    }

    public func startScreenShare(_ callId: String) async throws {
        let _: EmptyResponse = try await http.post("/calls/\(callId)/screen-share/start")
    }

    public func stopScreenShare(_ callId: String) async throws {
        let _: EmptyResponse = try await http.post("/calls/\(callId)/screen-share/stop")
    }

    public func getStats(_ callId: String) async throws -> CallStats {
        let result: CallStats = try await http.get("/calls/\(callId)/stats")
        return result
    }

    /// Async stream of incoming calls. Yields each new `Call` as it arrives.
    public var incomingCalls: AsyncStream<Call> {
        AsyncStream { continuation in
            Task {
                await ws.on("call.incoming") { data in
                    if let call = try? JSONDecoder().decode(Call.self, from: data) {
                        continuation.yield(call)
                    }
                }
            }
        }
    }
}

public struct CallStats: Codable {
    public let callId: String
    public let audioPacketsLost: Int
    public let videoPacketsLost: Int
    public let audioJitter: Double
    public let videoJitter: Double
    public let roundTripTime: Double
    public let bitrate: Double
}
