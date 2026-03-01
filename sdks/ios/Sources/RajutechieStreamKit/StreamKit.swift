import Foundation

public struct RajutechieStreamKitConfig {
    public let apiKey: String
    public let region: Region
    public let apiUrl: String
    public let wsUrl: String

    public init(
        apiKey: String,
        region: Region = .usEast1,
        apiUrl: String = "https://api.rajutechie-streamkit.io/v1",
        wsUrl: String = "wss://ws.rajutechie-streamkit.io"
    ) {
        self.apiKey = apiKey
        self.region = region
        self.apiUrl = apiUrl
        self.wsUrl = wsUrl
    }
}

public enum Region: String {
    case usEast1 = "us-east-1"
    case usWest2 = "us-west-2"
    case euWest1 = "eu-west-1"
    case apSoutheast1 = "ap-southeast-1"
}

public enum ConnectionState {
    case connecting, connected, disconnected, reconnecting
}

@MainActor
public final class RajutechieStreamKit {
    public static let shared = RajutechieStreamKit()

    private var config: RajutechieStreamKitConfig?
    private var httpClient: HTTPClient?
    private var wsClient: WebSocketClient?

    public private(set) var connectionState: ConnectionState = .disconnected

    private init() {}

    public func configure(_ config: RajutechieStreamKitConfig) -> RajutechieStreamKit {
        self.config = config
        self.httpClient = HTTPClient(baseURL: config.apiUrl, apiKey: config.apiKey)
        self.wsClient = WebSocketClient(url: config.wsUrl)
        return self
    }

    public var chat: ChatModule {
        guard let http = httpClient, let ws = wsClient else {
            fatalError("RajutechieStreamKit not configured. Call configure() first.")
        }
        return ChatModule(http: http, ws: ws)
    }

    public var call: CallModule {
        guard let http = httpClient, let ws = wsClient else {
            fatalError("RajutechieStreamKit not configured. Call configure() first.")
        }
        return CallModule(http: http, ws: ws)
    }

    public var meeting: MeetingModule {
        guard let http = httpClient, let ws = wsClient else {
            fatalError("RajutechieStreamKit not configured. Call configure() first.")
        }
        return MeetingModule(http: http, ws: ws)
    }

    public var stream: StreamModule {
        guard let http = httpClient, let ws = wsClient else {
            fatalError("RajutechieStreamKit not configured. Call configure() first.")
        }
        return StreamModule(http: http, ws: ws)
    }

    public func connect(token: String) async throws {
        connectionState = .connecting
        await httpClient?.setToken(token)
        try await wsClient?.connect(token: token)
        connectionState = .connected
    }

    public func disconnect() async {
        await wsClient?.disconnect()
        await httpClient?.setToken(nil)
        connectionState = .disconnected
    }
}
