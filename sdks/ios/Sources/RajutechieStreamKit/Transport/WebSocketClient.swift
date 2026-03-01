import Foundation

public actor WebSocketClient {
    private let url: String
    private var webSocket: URLSessionWebSocketTask?
    private var session: URLSession?
    private var handlers: [String: [(Data) -> Void]] = [:]
    private var isConnected = false

    public init(url: String) {
        self.url = url
    }

    public func connect(token: String) async throws {
        guard let wsURL = URL(string: "\(url)?token=\(token)") else {
            throw RajutechieStreamKitError.invalidURL(url)
        }

        session = URLSession(configuration: .default)
        webSocket = session?.webSocketTask(with: wsURL)
        webSocket?.resume()
        isConnected = true
        receiveLoop()
    }

    public func disconnect() {
        webSocket?.cancel(with: .normalClosure, reason: nil)
        webSocket = nil
        session = nil
        isConnected = false
    }

    public func send(type: String, data: [String: Any]) {
        guard isConnected else { return }

        var message = data
        message["type"] = type
        message["id"] = UUID().uuidString
        message["timestamp"] = ISO8601DateFormatter().string(from: Date())

        if let jsonData = try? JSONSerialization.data(withJSONObject: message),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            webSocket?.send(.string(jsonString)) { _ in }
        }
    }

    public func on(_ event: String, handler: @escaping (Data) -> Void) {
        handlers[event, default: []].append(handler)
    }

    private func receiveLoop() {
        webSocket?.receive { [weak self] result in
            guard let self = self else { return }
            Task { await self.handleReceive(result) }
        }
    }

    private func handleReceive(_ result: Result<URLSessionWebSocketTask.Message, Error>) {
        switch result {
        case .success(let message):
            switch message {
            case .string(let text):
                if let data = text.data(using: .utf8),
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let type = json["type"] as? String {
                    handlers[type]?.forEach { $0(data) }
                }
            default: break
            }
            receiveLoop()
        case .failure:
            isConnected = false
        }
    }
}
