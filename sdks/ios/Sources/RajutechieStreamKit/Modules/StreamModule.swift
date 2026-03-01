import Foundation

public struct LiveStream: Codable {
    public let id: String
    public let title: String
    public let streamKey: String
    public let status: String
    public let hlsUrl: String?
    public let viewerCount: Int
}

public final class StreamModule {
    private let http: HTTPClient
    private let ws: WebSocketClient

    init(http: HTTPClient, ws: WebSocketClient) {
        self.http = http
        self.ws = ws
    }

    public func create(title: String, visibility: String = "public") async throws -> LiveStream {
        struct CreateStreamBody: Encodable {
            let title: String
            let visibility: String
        }
        let result: LiveStream = try await http.post("/streams", body: CreateStreamBody(title: title, visibility: visibility))
        return result
    }

    public func get(_ streamId: String) async throws -> LiveStream {
        let result: LiveStream = try await http.get("/streams/\(streamId)")
        return result
    }

    public func start(_ streamId: String) async throws -> LiveStream {
        let result: LiveStream = try await http.post("/streams/\(streamId)/start")
        return result
    }

    public func stop(_ streamId: String) async throws -> LiveStream {
        let result: LiveStream = try await http.post("/streams/\(streamId)/stop")
        return result
    }

    public func getViewerCount(_ streamId: String) async throws -> Int {
        let result: ViewerCount = try await http.get("/streams/\(streamId)/viewers")
        return result.count
    }
}

private struct ViewerCount: Codable {
    let count: Int
}
