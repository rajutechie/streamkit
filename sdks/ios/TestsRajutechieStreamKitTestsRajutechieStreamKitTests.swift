import Testing
@testable import RajutechieStreamKit

@Suite("RajutechieStreamKit Tests")
struct RajutechieStreamKitTests {
    
    @Test("SDK configuration")
    func sdkConfiguration() async throws {
        // Arrange
        let config = RajutechieStreamKitConfig(
            apiKey: "test-api-key",
            region: .usEast1
        )
        
        // Act
        let sdk = RajutechieStreamKit.shared.configure(config)
        
        // Assert
        #expect(sdk.connectionState == .disconnected)
    }
    
    @Test("Region enum raw values")
    func regionRawValues() {
        #expect(Region.usEast1.rawValue == "us-east-1")
        #expect(Region.usWest2.rawValue == "us-west-2")
        #expect(Region.euWest1.rawValue == "eu-west-1")
        #expect(Region.apSoutheast1.rawValue == "ap-southeast-1")
    }
    
    @Test("Connection states")
    func connectionStates() {
        let states: [ConnectionState] = [.connecting, .connected, .disconnected, .reconnecting]
        #expect(states.count == 4)
    }
}

@Suite("Chat Module Tests")
struct ChatModuleTests {
    
    @Test("ChannelConfig group creation")
    func channelConfigGroup() {
        // Arrange & Act
        let config = ChannelConfig.group(
            name: "Test Group",
            members: ["user1", "user2"]
        )
        
        // Assert
        #expect(config.type == "group")
        #expect(config.name == "Test Group")
        #expect(config.members?.count == 2)
    }
    
    @Test("ChannelConfig direct creation")
    func channelConfigDirect() {
        // Arrange & Act
        let config = ChannelConfig.direct(members: ["user1", "user2"])
        
        // Assert
        #expect(config.type == "direct")
        #expect(config.name == nil)
        #expect(config.members?.count == 2)
    }
    
    @Test("SendMessageInput text creation")
    func sendMessageInputText() {
        // Arrange & Act
        let input = SendMessageInput.text("Hello, world!")
        
        // Assert
        #expect(input.text == "Hello, world!")
        #expect(input.attachments == nil)
    }
}

@Suite("Call Module Tests")
struct CallModuleTests {
    
    @Test("CallConfig initialization")
    func callConfigInit() {
        // Arrange & Act
        let config = CallConfig(
            type: "video",
            participants: ["user1", "user2"],
            channelId: "channel-123"
        )
        
        // Assert
        #expect(config.type == "video")
        #expect(config.participants.count == 2)
        #expect(config.channelId == "channel-123")
    }
    
    @Test("CallConfig default type")
    func callConfigDefaultType() {
        // Arrange & Act
        let config = CallConfig(participants: ["user1"])
        
        // Assert
        #expect(config.type == "video")
        #expect(config.channelId == nil)
    }
}

@Suite("Meeting Module Tests")
struct MeetingModuleTests {
    
    @Test("MeetingConfigInput initialization")
    func meetingConfigInit() {
        // Arrange & Act
        let config = MeetingConfigInput(
            title: "Test Meeting",
            description: "A test meeting",
            scheduledAt: "2026-03-02T10:00:00Z",
            durationMins: 60
        )
        
        // Assert
        #expect(config.title == "Test Meeting")
        #expect(config.description == "A test meeting")
        #expect(config.scheduledAt == "2026-03-02T10:00:00Z")
        #expect(config.durationMins == 60)
    }
    
    @Test("MeetingConfigInput default duration")
    func meetingConfigDefaultDuration() {
        // Arrange & Act
        let config = MeetingConfigInput(title: "Test")
        
        // Assert
        #expect(config.durationMins == 60)
    }
    
    @Test("BreakoutRoomInput initialization")
    func breakoutRoomInputInit() {
        // Arrange & Act
        let room = BreakoutRoomInput(
            name: "Room 1",
            participants: ["user1", "user2"]
        )
        
        // Assert
        #expect(room.name == "Room 1")
        #expect(room.participants.count == 2)
    }
}

@Suite("HTTP Client Error Tests")
struct HTTPClientErrorTests {
    
    @Test("RajutechieStreamKitError cases exist")
    func errorCasesExist() {
        let invalidURL = RajutechieStreamKitError.invalidURL("https://example.com")
        let apiError = RajutechieStreamKitError.apiError(statusCode: 404, body: "Not found")
        let unknown = RajutechieStreamKitError.unknown
        
        // These should compile and exist
        #expect(invalidURL is RajutechieStreamKitError)
        #expect(apiError is RajutechieStreamKitError)
        #expect(unknown is RajutechieStreamKitError)
    }
}

@Suite("Configuration Tests")
struct ConfigurationTests {
    
    @Test("Custom API and WebSocket URLs")
    func customURLs() {
        // Arrange
        let customAPIUrl = "https://custom-api.example.com/v1"
        let customWSUrl = "wss://custom-ws.example.com"
        
        // Act
        let config = RajutechieStreamKitConfig(
            apiKey: "test-key",
            region: .euWest1,
            apiUrl: customAPIUrl,
            wsUrl: customWSUrl
        )
        
        // Assert
        #expect(config.apiUrl == customAPIUrl)
        #expect(config.wsUrl == customWSUrl)
        #expect(config.region == .euWest1)
    }
    
    @Test("Default URLs")
    func defaultURLs() {
        // Arrange & Act
        let config = RajutechieStreamKitConfig(apiKey: "test-key")
        
        // Assert
        #expect(config.apiUrl == "https://api.rajutechie-streamkit.io/v1")
        #expect(config.wsUrl == "wss://ws.rajutechie-streamkit.io")
        #expect(config.region == .usEast1)
    }
}
