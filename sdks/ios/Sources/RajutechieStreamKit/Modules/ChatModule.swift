import Foundation

public struct Channel: Codable {
    public let id: String
    public let type: String
    public let name: String?
    public let memberCount: Int
}

public struct Message: Codable {
    public let id: String
    public let channelId: String
    public let senderId: String
    public let content: MessageContent
    public let createdAt: String
}

public struct MessageContent: Codable {
    public let text: String?
    public let attachments: [MessageAttachment]?
}

public struct MessageAttachment: Codable {
    public let type: String
    public let url: String
    public let filename: String?
}

public struct ChannelConfig: Encodable {
    public let type: String
    public let name: String?
    public let members: [String]?

    public static func group(name: String, members: [String]) -> ChannelConfig {
        ChannelConfig(type: "group", name: name, members: members)
    }

    public static func direct(members: [String]) -> ChannelConfig {
        ChannelConfig(type: "direct", name: nil, members: members)
    }
}

public struct SendMessageInput: Encodable {
    public let text: String?
    public let attachments: [MessageAttachment]?

    public static func text(_ text: String) -> SendMessageInput {
        SendMessageInput(text: text, attachments: nil)
    }
}

public final class ChatModule {
    private let http: HTTPClient
    private let ws: WebSocketClient

    init(http: HTTPClient, ws: WebSocketClient) {
        self.http = http
        self.ws = ws
    }

    public func createChannel(_ config: ChannelConfig) async throws -> Channel {
        let result: Channel = try await http.post("/channels", body: config)
        return result
    }

    public func getChannel(_ channelId: String) async throws -> Channel {
        let result: Channel = try await http.get("/channels/\(channelId)")
        return result
    }

    public func send(to channelId: String, message: SendMessageInput) async throws -> Message {
        let result: Message = try await http.post("/channels/\(channelId)/messages", body: message)
        return result
    }

    public func getMessages(in channelId: String, limit: Int = 25, after: String? = nil) async throws -> [Message] {
        var params: [String: String] = ["limit": "\(limit)"]
        if let after { params["after"] = after }
        let result: PaginatedResponse<Message> = try await http.get("/channels/\(channelId)/messages", params: params)
        return result.data
    }

    public func editMessage(in channelId: String, messageId: String, text: String) async throws -> Message {
        struct EditMessageBody: Encodable {
            let text: String
        }
        let result: Message = try await http.patch("/channels/\(channelId)/messages/\(messageId)", body: EditMessageBody(text: text))
        return result
    }

    public func deleteMessage(in channelId: String, messageId: String) async throws {
        let _: EmptyResponse = try await http.delete("/channels/\(channelId)/messages/\(messageId)")
    }

    public func addReaction(in channelId: String, messageId: String, emoji: String) async throws {
        struct AddReactionBody: Encodable {
            let emoji: String
        }
        let _: EmptyResponse = try await http.post("/channels/\(channelId)/messages/\(messageId)/reactions", body: AddReactionBody(emoji: emoji))
    }

    public func onMessage(in channelId: String, handler: @escaping (Message) -> Void) {
        Task {
            await ws.on("message.new") { data in
                if let message = try? JSONDecoder().decode(Message.self, from: data) {
                    if message.channelId == channelId {
                        handler(message)
                    }
                }
            }
        }
    }

    public func startTyping(in channelId: String) {
        Task { await ws.send(type: "typing.start", data: ["channelId": channelId]) }
    }

    public func stopTyping(in channelId: String) {
        Task { await ws.send(type: "typing.stop", data: ["channelId": channelId]) }
    }
}

struct PaginatedResponse<T: Codable>: Codable {
    let data: [T]
    let total: Int
    let hasNext: Bool
}

struct EmptyResponse: Codable {}
