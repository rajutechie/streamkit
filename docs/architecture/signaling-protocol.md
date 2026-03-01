# RajutechieStreamKit WebRTC Signaling Protocol

This document describes the WebRTC signaling protocol used by RajutechieStreamKit for real-time audio, video, screen sharing, and live streaming. The signaling layer is built on raw WebSocket connections to the Signaling Server (port 3030) and uses mediasoup as the Selective Forwarding Unit (SFU).

---

## Table of Contents

- [SFU Architecture](#sfu-architecture)
  - [SFU vs MCU vs P2P](#sfu-vs-mcu-vs-p2p)
  - [Why mediasoup](#why-mediasoup)
  - [mediasoup Object Model](#mediasoup-object-model)
- [Signaling Flow](#signaling-flow)
  - [Connection and Authentication](#connection-and-authentication)
  - [Room Join and Router Creation](#room-join-and-router-creation)
  - [Transport Negotiation](#transport-negotiation)
  - [Producing Media](#producing-media)
  - [Consuming Media](#consuming-media)
  - [Complete Signaling Sequence](#complete-signaling-sequence)
- [Message Types](#message-types)
  - [Client to Server](#client-to-server)
  - [Server to Client](#server-to-client)
- [ICE, DTLS, and SRTP](#ice-dtls-and-srtp)
  - [STUN](#stun)
  - [TURN](#turn)
  - [DTLS](#dtls)
  - [SRTP](#srtp)
- [Multi-Party Rooms](#multi-party-rooms)
  - [Transport Topology](#transport-topology)
  - [Producer and Consumer Mapping](#producer-and-consumer-mapping)
  - [Pipe Transports](#pipe-transports)
- [Scalability](#scalability)
  - [Worker Allocation](#worker-allocation)
  - [Cross-Server Signaling](#cross-server-signaling)
  - [Room Migration](#room-migration)
- [Codec Configuration](#codec-configuration)

---

## SFU Architecture

### SFU vs MCU vs P2P

There are three primary architectures for multi-party real-time communication:

| Architecture | Description | CPU Load | Latency | Scalability |
|-------------|-------------|----------|---------|-------------|
| **P2P (Peer-to-Peer)** | Each participant sends media directly to every other participant. N participants require N-1 upload streams per client. | Minimal server load | Lowest (direct) | Poor: client bandwidth scales as O(N) |
| **MCU (Multipoint Control Unit)** | Server receives all streams, decodes, composites into a single mixed stream, re-encodes, and sends one stream per participant. | Very high (transcode) | Higher (encode/decode) | Moderate: server CPU-bound |
| **SFU (Selective Forwarding Unit)** | Server receives streams from producers and selectively forwards them to consumers without transcoding. | Low (packet routing) | Low (no transcode) | High: scales with I/O, not CPU |

RajutechieStreamKit uses the **SFU** architecture for all real-time media (calls, meetings, and live streams).

### Why mediasoup

RajutechieStreamKit uses [mediasoup](https://mediasoup.org/) (v3) as its SFU engine for the following reasons:

- **C++ media workers**: Media processing runs in native C++ worker processes, providing high performance and efficient memory usage. Each worker runs in its own process, isolated from the Node.js signaling layer.
- **Fine-grained control**: mediasoup exposes a low-level API for Routers, Transports, Producers, and Consumers, allowing RajutechieStreamKit to implement custom room logic, recording pipelines, and simulcast strategies.
- **Simulcast and SVC support**: Clients can send multiple quality layers (spatial and temporal); the SFU selects the best layer for each consumer based on available bandwidth.
- **No external dependencies**: mediasoup is a library, not a standalone server. It runs within the RajutechieStreamKit Signaling Server process, eliminating external service coordination.
- **Supported codecs**: Opus (audio), VP8, VP9, H.264 (video) with configurable parameters.

### mediasoup Object Model

```
Worker (one per CPU core)
  └── Router (one per room)
        ├── WebRtcTransport (send) ── Producer (audio)
        │                           ── Producer (video)
        │                           ── Producer (screen)
        │
        ├── WebRtcTransport (recv) ── Consumer (audio from Peer B)
        │                           ── Consumer (video from Peer B)
        │
        ├── WebRtcTransport (send) ── Producer (audio)   [Peer B]
        │                           ── Producer (video)
        │
        ├── WebRtcTransport (recv) ── Consumer (audio from Peer A)  [Peer B]
        │                           ── Consumer (video from Peer A)
        │
        └── PlainTransport ── Consumer (for recording via FFmpeg)
```

| Object | Description |
|--------|-------------|
| **Worker** | A native C++ process that handles media packet routing. One worker per CPU core. |
| **Router** | A routing table for media within a room. Each room gets one Router. Routers can be linked via PipeTransports for cross-worker routing. |
| **WebRtcTransport** | A WebRTC connection (ICE + DTLS) between a client and the SFU. Each participant gets a send transport and a receive transport. |
| **Producer** | A media source (audio track, video track, or screen share) being sent from a client to the SFU. |
| **Consumer** | A media sink that forwards a Producer's media to a receiving client. One Consumer is created per Producer per receiving participant. |
| **PlainTransport** | A raw RTP transport used for recording (SFU to FFmpeg) or for bridging to external systems. |

---

## Signaling Flow

### Connection and Authentication

The client connects to the Signaling Server via raw WebSocket with a JWT token in the query string:

```
ws://signaling.rajutechie-streamkit.io:3030?token=<jwt_access_token>
```

The server verifies the JWT using the shared `JWT_SECRET`. On success, the server assigns a unique `peerId` and sends a `welcome` message. On failure, the connection is closed with code `4001` (missing token) or `4003` (invalid token).

### Room Join and Router Creation

When the first participant joins a room, the server creates a mediasoup Router on the next available Worker (round-robin). Subsequent participants joining the same room reuse the existing Router.

### Transport Negotiation

Each participant creates two WebRtcTransports:

1. **Send transport**: For uploading the participant's audio/video/screen to the SFU.
2. **Receive transport**: For downloading other participants' media from the SFU.

Each transport goes through ICE candidate gathering and DTLS handshake before media can flow.

### Producing Media

After the send transport is connected (DTLS complete), the client creates one or more Producers by providing RTP parameters for each media track (audio, video, screen).

### Consuming Media

When a new Producer is created, all other participants in the room are notified via `new_producer`. Each participant then creates a Consumer on their receive transport to subscribe to that Producer's media.

### Complete Signaling Sequence

```
Client A              Signaling Server              mediasoup Worker
   |                        |                              |
   |== CONNECT ============================================|
   |                        |                              |
   |-- ws://host:3030?token=jwt --------------------------->|
   |<-- welcome { peerId } -|                              |
   |                        |                              |
   |== JOIN ROOM ===========================================|
   |                        |                              |
   |-- join_room ------------->|                              |
   |   { roomId, roomType }  |                              |
   |                        |-- createRouter() ------------>|
   |                        |<-- router { rtpCapabilities } |
   |<-- room_joined ---------|                              |
   |   { routerRtpCaps,     |                              |
   |     existingPeers }     |                              |
   |                        |                              |
   |== CREATE SEND TRANSPORT ===============================|
   |                        |                              |
   |-- create_transport ----->|                              |
   |   { direction: 'send' } |                              |
   |                        |-- createWebRtcTransport() --->|
   |                        |<-- transport params ---------|
   |<-- transport_created ---|                              |
   |   { transportId,       |                              |
   |     iceParameters,      |                              |
   |     iceCandidates,      |                              |
   |     dtlsParameters }    |                              |
   |                        |                              |
   |== CONNECT TRANSPORT ===================================|
   |                        |                              |
   |-- connect_transport ---->|                              |
   |   { transportId,       |                              |
   |     dtlsParameters }    |                              |
   |                        |-- transport.connect() ------->|
   |                        |<-- connected ----------------|
   |<-- transport_connected -|                              |
   |                        |                              |
   |== PRODUCE AUDIO =======================================|
   |                        |                              |
   |-- produce -------------->|                              |
   |   { transportId,       |                              |
   |     kind: 'audio',      |                              |
   |     rtpParameters }      |                              |
   |                        |-- transport.produce() ------->|
   |                        |<-- producer { id } ----------|
   |<-- producer_created ----|                              |
   |   { producerId, kind }  |                              |
   |                        |                              |
   |                        |-- broadcast to other peers -->|
   |                        |   new_producer { peerId,      |
   |                        |     producerId, kind }        |
   |                        |                              |
   |== PRODUCE VIDEO =======================================|
   |                        |                              |
   |-- produce -------------->|  (same flow as audio)       |
   |   { kind: 'video' }    |                              |
   |                        |                              |
   |== CREATE RECV TRANSPORT ===============================|
   |                        |                              |
   |-- create_transport ----->|                              |
   |   { direction: 'recv' } |                              |
   |<-- transport_created ---|                              |
   |                        |                              |
   |-- connect_transport ---->|                              |
   |<-- transport_connected -|                              |
   |                        |                              |
   |== CONSUME (subscribe to Peer B's audio) ===============|
   |                        |                              |
   |-- consume --------------->|                              |
   |   { transportId,        |                              |
   |     producerId,          |                              |
   |     rtpCapabilities }    |                              |
   |                        |-- transport.consume() ------->|
   |                        |<-- consumer { id, params } --|
   |<-- consumer_created ----|                              |
   |   { consumerId,        |                              |
   |     producerId,          |                              |
   |     kind,                |                              |
   |     rtpParameters }      |                              |
   |                        |                              |
   |== MEDIA FLOWS =========================================|
   |                        |                              |
   |  Audio/Video RTP <======================================>
   |  (encrypted via SRTP)  |                              |
   |                        |                              |
   |== LEAVE ROOM ==========================================|
   |                        |                              |
   |-- leave_room ------------>|                              |
   |                        |-- close producers ----------->|
   |                        |-- close consumers ----------->|
   |                        |-- close transports ---------->|
   |                        |-- broadcast peer_left ------->|
   |<-- room_left -----------|                              |
   |                        |                              |
   |                        |  (if room is empty:           |
   |                        |   close router, delete room)  |
```

---

## Message Types

All messages are JSON objects with a `type` field. An optional `requestId` field enables request-response correlation.

### Client to Server

#### join_room

Join a mediasoup room. Creates the room and Router if they do not exist.

```json
{
  "type": "join_room",
  "requestId": "req_001",
  "roomId": "c3d4e5f6-7890-1234-5678-9abcdef01234",
  "roomType": "call"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `roomId` | string | Yes | Room identifier (typically a call, meeting, or stream ID) |
| `roomType` | string | No | One of: `call`, `meeting`, `stream`. Default: `meeting` |

#### create_transport

Request a new WebRtcTransport for sending or receiving media.

```json
{
  "type": "create_transport",
  "requestId": "req_002",
  "direction": "send"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `direction` | string | No | `send` or `recv`. Default: `send` |

#### connect_transport

Complete the DTLS handshake for a transport.

```json
{
  "type": "connect_transport",
  "requestId": "req_003",
  "transportId": "t_abc123",
  "dtlsParameters": {
    "role": "client",
    "fingerprints": [
      {
        "algorithm": "sha-256",
        "value": "D2:FA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:..."
      }
    ]
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transportId` | string | Yes | Transport ID from `transport_created` |
| `dtlsParameters` | object | Yes | Client DTLS parameters (role + fingerprints) |

#### produce

Start sending a media track to the SFU.

```json
{
  "type": "produce",
  "requestId": "req_004",
  "transportId": "t_abc123",
  "kind": "audio",
  "rtpParameters": {
    "codecs": [
      {
        "mimeType": "audio/opus",
        "payloadType": 111,
        "clockRate": 48000,
        "channels": 2,
        "parameters": {
          "minptime": 10,
          "useinbandfec": 1
        }
      }
    ],
    "encodings": [
      { "ssrc": 12345678 }
    ]
  },
  "appData": {
    "source": "microphone"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transportId` | string | Yes | Send transport ID |
| `kind` | string | Yes | `audio` or `video` |
| `rtpParameters` | object | Yes | RTP parameters from the client's media track |
| `appData` | object | No | Arbitrary metadata (e.g., `source: "screen"` for screen share) |

#### consume

Subscribe to another participant's media track.

```json
{
  "type": "consume",
  "requestId": "req_005",
  "transportId": "t_recv_456",
  "producerId": "p_abc123",
  "rtpCapabilities": {
    "codecs": [
      {
        "mimeType": "audio/opus",
        "kind": "audio",
        "clockRate": 48000,
        "channels": 2
      },
      {
        "mimeType": "video/VP8",
        "kind": "video",
        "clockRate": 90000
      }
    ],
    "headerExtensions": []
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transportId` | string | Yes | Receive transport ID |
| `producerId` | string | Yes | Producer ID to consume (from `new_producer` notification) |
| `rtpCapabilities` | object | Yes | Client's RTP capabilities (from `routerRtpCapabilities` intersection) |

#### pause_producer / resume_producer

Pause or resume a media producer (e.g., mute microphone, disable camera).

```json
{
  "type": "pause_producer",
  "requestId": "req_006",
  "producerId": "p_abc123"
}
```

```json
{
  "type": "resume_producer",
  "requestId": "req_007",
  "producerId": "p_abc123"
}
```

#### leave_room

Leave the current room and clean up all associated resources.

```json
{
  "type": "leave_room",
  "requestId": "req_008"
}
```

#### ping

Application-level keepalive.

```json
{
  "type": "ping"
}
```

### Server to Client

#### welcome

Sent immediately after successful authentication.

```json
{
  "type": "welcome",
  "peerId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user_001"
}
```

#### room_joined

Response to `join_room` with router capabilities and existing peers.

```json
{
  "type": "room_joined",
  "requestId": "req_001",
  "roomId": "c3d4e5f6-7890-1234-5678-9abcdef01234",
  "roomType": "call",
  "peerId": "550e8400-e29b-41d4-a716-446655440000",
  "routerRtpCapabilities": {
    "codecs": [
      {
        "kind": "audio",
        "mimeType": "audio/opus",
        "clockRate": 48000,
        "channels": 2,
        "parameters": { "minptime": 10, "useinbandfec": 1 }
      },
      {
        "kind": "video",
        "mimeType": "video/VP8",
        "clockRate": 90000,
        "parameters": { "x-google-start-bitrate": 1000 }
      },
      {
        "kind": "video",
        "mimeType": "video/VP9",
        "clockRate": 90000,
        "parameters": { "profile-id": 2, "x-google-start-bitrate": 1000 }
      },
      {
        "kind": "video",
        "mimeType": "video/H264",
        "clockRate": 90000,
        "parameters": {
          "packetization-mode": 1,
          "profile-level-id": "4d0032",
          "level-asymmetry-allowed": 1,
          "x-google-start-bitrate": 1000
        }
      }
    ],
    "headerExtensions": [
      { "kind": "audio", "uri": "urn:ietf:params:rtp-hdrext:sdes:mid", "preferredId": 1 },
      { "kind": "video", "uri": "urn:ietf:params:rtp-hdrext:sdes:mid", "preferredId": 1 },
      { "kind": "video", "uri": "urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id", "preferredId": 2 },
      { "kind": "audio", "uri": "urn:ietf:params:rtp-hdrext:ssrc-audio-level", "preferredId": 10 }
    ]
  },
  "existingPeers": [
    {
      "peerId": "peer_002",
      "userId": "user_002",
      "displayName": "Jane Doe",
      "producerIds": ["p_audio_002", "p_video_002"]
    }
  ]
}
```

#### transport_created

Response to `create_transport` with ICE and DTLS parameters.

```json
{
  "type": "transport_created",
  "requestId": "req_002",
  "transportId": "t_abc123",
  "iceParameters": {
    "usernameFragment": "abcdefgh",
    "password": "ijklmnopqrstuvwxyz123456",
    "iceLite": true
  },
  "iceCandidates": [
    {
      "foundation": "udpcandidate",
      "priority": 1076302079,
      "ip": "192.168.1.100",
      "port": 44444,
      "type": "host",
      "protocol": "udp"
    }
  ],
  "dtlsParameters": {
    "role": "auto",
    "fingerprints": [
      {
        "algorithm": "sha-256",
        "value": "A1:B2:C3:D4:E5:F6:..."
      }
    ]
  },
  "direction": "send"
}
```

#### transport_connected

Confirmation that the DTLS handshake completed.

```json
{
  "type": "transport_connected",
  "requestId": "req_003",
  "transportId": "t_abc123",
  "connected": true
}
```

#### producer_created

Response to `produce` confirming the producer was created.

```json
{
  "type": "producer_created",
  "requestId": "req_004",
  "producerId": "p_abc123",
  "kind": "audio"
}
```

#### new_producer

Broadcast notification to other peers when a new producer is created.

```json
{
  "type": "new_producer",
  "peerId": "peer_001",
  "userId": "user_001",
  "displayName": "John Smith",
  "producerId": "p_abc123",
  "kind": "audio",
  "appData": {
    "source": "microphone"
  }
}
```

#### consumer_created

Response to `consume` with RTP parameters for playback.

```json
{
  "type": "consumer_created",
  "requestId": "req_005",
  "consumerId": "c_xyz789",
  "producerId": "p_abc123",
  "kind": "audio",
  "rtpParameters": {
    "codecs": [
      {
        "mimeType": "audio/opus",
        "payloadType": 100,
        "clockRate": 48000,
        "channels": 2,
        "parameters": { "minptime": 10, "useinbandfec": 1 }
      }
    ],
    "encodings": [
      { "ssrc": 87654321 }
    ]
  }
}
```

#### producer_paused / producer_resumed

Broadcast when a peer pauses or resumes a producer.

```json
{
  "type": "producer_paused",
  "peerId": "peer_001",
  "producerId": "p_abc123"
}
```

```json
{
  "type": "producer_resumed",
  "peerId": "peer_001",
  "producerId": "p_abc123"
}
```

#### peer_joined / peer_left

Broadcast when a peer joins or leaves the room.

```json
{
  "type": "peer_joined",
  "peerId": "peer_003",
  "userId": "user_003",
  "displayName": "Alice",
  "timestamp": "2026-02-13T10:30:00.000Z"
}
```

```json
{
  "type": "peer_left",
  "peerId": "peer_003",
  "userId": "user_003",
  "displayName": "Alice",
  "timestamp": "2026-02-13T10:35:00.000Z"
}
```

#### room_left

Confirmation that the client has left the room.

```json
{
  "type": "room_left",
  "requestId": "req_008",
  "roomId": "c3d4e5f6-7890-1234-5678-9abcdef01234"
}
```

#### pong

Response to `ping`.

```json
{
  "type": "pong",
  "requestId": "req_009"
}
```

#### error

Error response for any failed request.

```json
{
  "type": "error",
  "requestId": "req_010",
  "message": "transportId and dtlsParameters are required"
}
```

---

## ICE, DTLS, and SRTP

WebRTC requires a multi-layer security and connectivity stack to establish a media connection between a client and the SFU.

### STUN

**Session Traversal Utilities for NAT** (STUN) is used during ICE candidate gathering to discover the client's public IP address and port when behind a NAT.

| Property | Value |
|----------|-------|
| Default server | `stun:stun.l.google.com:19302` |
| Configurable via | `STUN_SERVER_URL` environment variable |
| Protocol | UDP (port 3478 or 19302) |

STUN works by sending a binding request to the STUN server, which responds with the public IP and port observed for the client's packet. This information is included as an ICE candidate of type `srflx` (server reflexive).

### TURN

**Traversal Using Relays around NAT** (TURN) is a relay server used when direct peer-to-SFU connectivity fails (e.g., symmetric NATs, restrictive firewalls).

| Property | Value |
|----------|-------|
| Implementation | [coturn](https://github.com/coturn/coturn) |
| Protocols | UDP, TCP, TLS |
| Ports | 3478 (UDP/TCP), 5349 (TLS) |
| Authentication | Long-term credentials or time-limited HMAC tokens |

TURN adds latency because media packets are relayed through the TURN server instead of flowing directly between the client and the SFU. RajutechieStreamKit generates time-limited TURN credentials via the REST API so clients can authenticate with the TURN server without exposing static secrets.

### DTLS

**Datagram Transport Layer Security** (DTLS 1.2) is used to secure the WebRTC transport. DTLS performs a handshake over UDP to establish encryption keys, which are then used for SRTP.

The DTLS handshake occurs during `connect_transport`:

1. The client sends its DTLS fingerprint (from its self-signed certificate) to the server.
2. The server sends its DTLS fingerprint to the client (in `transport_created`).
3. Both sides verify the peer's fingerprint during the DTLS handshake.
4. The handshake produces shared SRTP keying material.

mediasoup uses ICE-Lite mode, meaning the server does not gather ICE candidates. Instead, it provides a fixed set of candidates (the server's listening addresses), and the client drives ICE connectivity checks.

### SRTP

**Secure Real-time Transport Protocol** (SRTP) encrypts all audio and video RTP packets flowing between the client and the SFU. SRTP keys are derived from the DTLS handshake, so no additional key exchange is needed.

```
Client                         SFU (mediasoup)
   |                              |
   |-- ICE connectivity check --->|
   |<-- ICE binding response -----|
   |                              |
   |-- DTLS ClientHello -------->|
   |<-- DTLS ServerHello --------|
   |<-- DTLS Certificate --------|
   |<-- DTLS ServerHelloDone ----|
   |-- DTLS Certificate -------->|
   |-- DTLS ClientKeyExchange -->|
   |-- DTLS ChangeCipherSpec --->|
   |-- DTLS Finished ----------->|
   |<-- DTLS ChangeCipherSpec ---|
   |<-- DTLS Finished ----------|
   |                              |
   |  SRTP keys derived from      |
   |  DTLS master secret          |
   |                              |
   |== Encrypted SRTP media =====>|
   |<== Encrypted SRTP media =====|
```

---

## Multi-Party Rooms

### Transport Topology

In a multi-party room (calls, meetings, or streams with multiple participants), each participant maintains exactly two transports:

```
Peer A (send transport) -----> SFU Router -----> (recv transport) Peer B
Peer A (send transport) -----> SFU Router -----> (recv transport) Peer C
Peer B (send transport) -----> SFU Router -----> (recv transport) Peer A
Peer B (send transport) -----> SFU Router -----> (recv transport) Peer C
Peer C (send transport) -----> SFU Router -----> (recv transport) Peer A
Peer C (send transport) -----> SFU Router -----> (recv transport) Peer B
```

Each participant creates:

- **1 send transport**: Carries all of the participant's Producers (audio, video, screen share).
- **1 receive transport**: Carries all Consumers for remote Producers the participant is subscribed to.

This topology means each participant has exactly 2 WebRTC connections regardless of the number of participants in the room.

### Producer and Consumer Mapping

For a room with N participants, each producing audio and video:

| Resource | Count per Participant | Total in Room |
|----------|----------------------|---------------|
| Send transport | 1 | N |
| Receive transport | 1 | N |
| Audio producer | 1 | N |
| Video producer | 1 | N |
| Audio consumers | N - 1 | N * (N - 1) |
| Video consumers | N - 1 | N * (N - 1) |

Screen share adds one additional Producer for the sharing participant and one additional Consumer for each other participant.

### Pipe Transports

When a room spans multiple mediasoup Workers (e.g., when a single Worker's capacity is exceeded), PipeTransports are used to relay media between Routers on different Workers.

```
Worker 1 (Router A)                    Worker 2 (Router B)
   |                                      |
   | Peer A's producers                   | Peer D's producers
   | Peer B's producers                   | Peer E's producers
   | Peer C's producers                   | Peer F's producers
   |                                      |
   |<======= PipeTransport =============>|
   |  (internal RTP relay between         |
   |   Routers on different Workers)      |
```

PipeTransports use plain RTP (not encrypted) since they operate within the server's trusted internal network.

---

## Scalability

### Worker Allocation

mediasoup Workers are CPU-bound processes. RajutechieStreamKit allocates Workers using the following strategy:

| Property | Value |
|----------|-------|
| Workers per instance | 1 per CPU core |
| Room assignment | Round-robin across Workers |
| Max consumers per Worker | ~500 (recommended) |
| RTC port range | 40000--49999 (configurable via `RTC_MIN_PORT` / `RTC_MAX_PORT`) |

```
Signaling Server Instance
   |
   |-- Worker 0 (PID 1001) -- Router (Room A), Router (Room D)
   |-- Worker 1 (PID 1002) -- Router (Room B), Router (Room E)
   |-- Worker 2 (PID 1003) -- Router (Room C), Router (Room F)
   |-- Worker 3 (PID 1004) -- Router (Room G)
```

Workers are assigned to new rooms via round-robin. The `routerCount` per Worker is tracked to enable more sophisticated load balancing (e.g., least-loaded) in future versions.

### Cross-Server Signaling

When RajutechieStreamKit runs multiple Signaling Server instances behind a load balancer, rooms are pinned to a single instance. Cross-server coordination uses Redis Pub/Sub:

| Channel | Purpose |
|---------|---------|
| `signaling:room:{roomId}` | Room-level event broadcasting across instances |
| `signaling:peer:{peerId}` | Targeted peer messaging across instances |
| `signaling:migration` | Room migration coordination |

For most deployments, rooms are small enough (< 500 participants) to be handled by a single Signaling Server instance. Large meetings or live streams with many consumers may require cross-instance PipeTransport coordination.

### Room Migration

When a Signaling Server instance needs to be drained (for deployment or scaling), rooms can be migrated:

1. The draining instance publishes a `room:migrating` event to Redis.
2. A healthy instance picks up the room and creates a new Router.
3. Clients receive a `room:reconnect` message with the new Signaling Server URL.
4. Clients disconnect from the old instance and reconnect to the new one.
5. Clients re-negotiate transports and re-create Producers/Consumers.

This process causes a brief media interruption (typically 1-3 seconds) but preserves the room's logical state.

---

## Codec Configuration

RajutechieStreamKit configures the following media codecs on every Router:

### Audio Codecs

| Codec | MIME Type | Clock Rate | Channels | Parameters |
|-------|-----------|------------|----------|------------|
| Opus | `audio/opus` | 48000 | 2 | `minptime=10, useinbandfec=1` |

Opus is the only supported audio codec. It provides high-quality audio at low bitrates (6-510 kbps) with built-in forward error correction (FEC) and dynamic bitrate adaptation.

### Video Codecs

| Codec | MIME Type | Clock Rate | Parameters |
|-------|-----------|------------|------------|
| VP8 | `video/VP8` | 90000 | `x-google-start-bitrate=1000` |
| VP9 | `video/VP9` | 90000 | `profile-id=2, x-google-start-bitrate=1000` |
| H.264 | `video/H264` | 90000 | `packetization-mode=1, profile-level-id=4d0032, level-asymmetry-allowed=1, x-google-start-bitrate=1000` |

VP8 is the default video codec for broad compatibility. VP9 provides better compression at the same quality. H.264 is included for hardware acceleration on mobile devices. The client and SFU negotiate the best codec during the `produce` / `consume` exchange based on the intersection of capabilities.

### RTP Header Extensions

| Extension URI | Kind | Description |
|---------------|------|-------------|
| `urn:ietf:params:rtp-hdrext:sdes:mid` | audio, video | Media identification for BUNDLE |
| `urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id` | video | Stream identification for simulcast |
| `urn:ietf:params:rtp-hdrext:ssrc-audio-level` | audio | Audio level indication for active speaker detection |
| `urn:ietf:params:rtp-hdrext:toffset` | video | Transmission time offset for jitter buffer |
| `http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time` | video | Absolute send time for bandwidth estimation |
