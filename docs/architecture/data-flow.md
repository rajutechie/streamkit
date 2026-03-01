# RajutechieStreamKit Data Flow Diagrams

This document provides detailed data flow diagrams for each major feature in RajutechieStreamKit. Each flow shows the complete path from client action to final delivery, including persistence, event propagation, and real-time notification.

---

## Table of Contents

1. [Chat Message Flow](#chat-message-flow)
2. [Call Flow](#call-flow)
3. [Meeting Flow](#meeting-flow)
4. [Live Stream Flow](#live-stream-flow)
5. [Presence Flow](#presence-flow)
6. [Authentication Flow](#authentication-flow)
7. [Typing Indicator Flow](#typing-indicator-flow)
8. [Read Receipt Flow](#read-receipt-flow)
9. [File Upload Flow](#file-upload-flow)

---

## Chat Message Flow

### Overview

Messages flow through a dual-path architecture: the WebSocket Gateway handles real-time delivery while Kafka provides reliable persistence and fan-out to auxiliary services.

### Flow Diagram

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Sender  │    │  WebSocket   │    │    Chat       │    │   MongoDB    │
│  Client  │    │   Gateway    │    │   Service     │    │  (messages)  │
└────┬─────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
     │                 │                   │                   │
     │ 1. emit('message.send', {          │                   │
     │    channelId, text,                │                   │
     │    attachments, replyTo })         │                   │
     │────────────────>│                  │                   │
     │                 │                  │                   │
     │                 │ 2. Validate payload (Zod schema)     │
     │                 │    Verify channel membership          │
     │                 │                  │                   │
     │                 │ 3. Kafka produce │                   │
     │                 │    topic: chat.messages               │
     │                 │    key: channelId │                   │
     │                 │──────────────────────────┐           │
     │                 │                  │       │           │
     │                 │                  │       ▼           │
     │                 │                  │  ┌─────────┐     │
     │                 │                  │  │  Kafka  │     │
     │                 │                  │  │ (chat.  │     │
     │                 │                  │  │messages)│     │
     │                 │                  │  └────┬────┘     │
     │                 │                  │       │           │
     │                 │                  │ 4. Consume        │
     │                 │                  │<──────┘           │
     │                 │                  │                   │
     │                 │                  │ 5. Persist        │
     │                 │                  │──────────────────>│
     │                 │                  │                   │
     │                 │                  │ 6. Return message │
     │                 │                  │   with id,        │
     │                 │                  │   createdAt       │
     │                 │                  │                   │
     │                 │ 7. Broadcast to channel room          │
     │                 │    (via Redis adapter, all instances) │
     │                 │                  │                   │
     │ 8. emit('message.new', message)   │                   │
     │<────────────────│                  │                   │
     │                 │                  │                   │
     │                 │                  │                   │
┌────▼─────┐    ┌──────▼───────┐    ┌────▼────────┐         │
│Recipient │    │  Recipient   │    │Notification │         │
│ Client   │    │  Client      │    │  Service    │         │
│ (online) │    │  (online,    │    │  (:3016)    │         │
│          │    │   other      │    │             │         │
│          │    │   instance)  │    │             │         │
└──────────┘    └──────────────┘    └──────┬──────┘         │
                                          │                  │
                                          │ 9. Check user    │
                                          │    online status │
                                          │    (Redis)       │
                                          │                  │
                                          │ 10. If offline:  │
                                          │    Push via      │
                                          │    FCM/APNs      │
                                          ▼
                                   ┌──────────────┐
                                   │   FCM/APNs   │
                                   │   Push       │
                                   │   Delivery   │
                                   └──────────────┘
```

### Message Schema

```json
{
  "id": "msg_01H8K3QWERTY",
  "channelId": "ch_01H8K3ABC",
  "senderId": "usr_01H8K3XYZ",
  "type": "text",
  "content": {
    "text": "Hello, world!",
    "attachments": []
  },
  "replyTo": null,
  "threadId": null,
  "reactions": {},
  "mentions": ["usr_01H8K3DEF"],
  "readBy": [],
  "metadata": {},
  "isEdited": false,
  "isDeleted": false,
  "createdAt": "2026-02-13T10:30:00.000Z",
  "updatedAt": "2026-02-13T10:30:00.000Z"
}
```

### Kafka Message Envelope

```json
{
  "topic": "chat.messages",
  "key": "ch_01H8K3ABC",
  "value": {
    "event": "message.new",
    "appId": "app_01H8K3",
    "channelId": "ch_01H8K3ABC",
    "message": { "...message object..." },
    "timestamp": "2026-02-13T10:30:00.000Z"
  },
  "headers": {
    "event-type": "message.new",
    "correlation-id": "req_01H8K3"
  }
}
```

### Message Delivery Guarantees

| Guarantee | Mechanism |
|-----------|-----------|
| At-least-once delivery | Kafka consumer with manual offset commit after persistence |
| Ordering within channel | Kafka partitioning by `channelId` ensures FIFO within a channel |
| Deduplication | Messages have UUIDs; consumers deduplicate on `INSERT ... ON CONFLICT DO NOTHING` |
| Offline delivery | Push notifications via FCM/APNs for offline users |
| Cross-instance delivery | Socket.IO Redis adapter broadcasts to all WebSocket Gateway instances |

---

## Call Flow

### Overview

Calls use a three-phase flow: signaling setup, WebRTC negotiation, and media streaming. The Signaling Server manages the mediasoup SFU, while the Call Service tracks call state in PostgreSQL.

### Flow Diagram

```
┌──────────┐      ┌───────────┐      ┌──────────────┐      ┌─────────────┐
│ Client A │      │  WS       │      │  Signaling   │      │  mediasoup  │
│ (Caller) │      │  Gateway  │      │   Server     │      │   SFU       │
└────┬─────┘      └─────┬─────┘      └──────┬───────┘      └──────┬──────┘
     │                  │                    │                     │
     │ ═══ PHASE 1: CALL INITIATION ═══     │                     │
     │                  │                    │                     │
     │ 1. emit('call.initiate', {            │                     │
     │    type: 'video',                     │                     │
     │    participants: ['userB'] })         │                     │
     │─────────────────>│                    │                     │
     │                  │                    │                     │
     │                  │ 2. Create call record (Call Service)     │
     │                  │    status: 'ringing'                     │
     │                  │                    │                     │
     │                  │ 3. emit('call.incoming') to Client B     │
     │                  │    (via Redis adapter)                   │
     │                  │                    │                     │
     │                  │                    │                     │
┌────▼─────┐      ┌─────▼─────┐             │                     │
│ Client A │      │ Client B  │             │                     │
│ (ringing)│      │ (ringing) │             │                     │
└────┬─────┘      └─────┬─────┘             │                     │
     │                  │                    │                     │
     │                  │ 4. emit('call.accept', { callId })       │
     │                  │─────────────────>│ │                     │
     │                  │                    │                     │
     │ ═══ PHASE 2: WebRTC NEGOTIATION ═══  │                     │
     │                  │                    │                     │
     │ 5. Connect to Signaling Server        │                     │
     │    ws://signaling:3030?token=<jwt>    │                     │
     │──────────────────────────────────────>│                     │
     │                  │                    │                     │
     │ 6. send({ type: 'join_room',          │                     │
     │    roomId: callId,                    │                     │
     │    roomType: 'call' })                │                     │
     │──────────────────────────────────────>│                     │
     │                  │                    │                     │
     │                  │                    │ 7. Create Router     │
     │                  │                    │────────────────────>│
     │                  │                    │                     │
     │                  │                    │ 8. Router created    │
     │                  │                    │    (rtpCapabilities) │
     │                  │                    │<────────────────────│
     │                  │                    │                     │
     │ 9. recv({ type: 'room_joined',        │                     │
     │    routerRtpCapabilities,             │                     │
     │    existingPeers: [] })               │                     │
     │<──────────────────────────────────────│                     │
     │                  │                    │                     │
     │ 10. send({ type: 'create_transport',  │                     │
     │     direction: 'send' })              │                     │
     │──────────────────────────────────────>│                     │
     │                  │                    │ 11. createWebRtcTransport
     │                  │                    │────────────────────>│
     │                  │                    │<────────────────────│
     │ 12. recv({ type: 'transport_created', │                     │
     │     iceParameters, iceCandidates,     │                     │
     │     dtlsParameters })                 │                     │
     │<──────────────────────────────────────│                     │
     │                  │                    │                     │
     │ 13. send({ type: 'connect_transport', │                     │
     │     transportId,                      │                     │
     │     dtlsParameters: clientDtls })     │                     │
     │──────────────────────────────────────>│                     │
     │                  │                    │ 14. DTLS handshake   │
     │                  │                    │────────────────────>│
     │                  │                    │<────────────────────│
     │                  │                    │                     │
     │ ═══ PHASE 3: MEDIA STREAMING ═══     │                     │
     │                  │                    │                     │
     │ 15. send({ type: 'produce',           │                     │
     │     kind: 'audio',                    │                     │
     │     rtpParameters })                  │                     │
     │──────────────────────────────────────>│                     │
     │                  │                    │ 16. transport.produce()
     │                  │                    │────────────────────>│
     │ 17. recv({ type: 'producer_created',  │                     │
     │     producerId })                     │                     │
     │<──────────────────────────────────────│                     │
     │                  │                    │                     │
     │                  │                    │ 18. Notify Client B: │
     │                  │                    │     'new_producer'   │
     │                  │                    │────────────────────>│
     │                  │                    │                     │ (Client B)
     │                  │                    │                     │
     │ Client B sends 'consume' request      │                     │
     │ for Client A's producer               │                     │
     │                  │                    │                     │
     │ ═══ MEDIA FLOWS THROUGH SFU ═══      │                     │
     │                  │                    │                     │
     │  Audio/Video RTP ◄═══════════════════════════════════════► │
     │  (encrypted SRTP)                     │                     │
     │                  │                    │                     │
     │ ═══ CALL END ═══                      │                     │
     │                  │                    │                     │
     │ send('leave_room')                    │                     │
     │──────────────────────────────────────>│                     │
     │                  │                    │ Cleanup:             │
     │                  │                    │ - Close producers    │
     │                  │                    │ - Close consumers    │
     │                  │                    │ - Close transports   │
     │                  │                    │ - Remove from room   │
     │                  │                    │ - Delete empty room  │
     │                  │                    │                     │
     │                  │ Update call record: status='ended'       │
     │                  │ endReason='completed', endedAt=now       │
```

### Call State Machine

```
           ┌───────────┐
           │           │
    ┌─────>│  ringing  │─────────────┐
    │      │           │             │
    │      └─────┬─────┘             │
    │            │                   │
    │       accepted              declined / timeout
    │            │                   │
    │      ┌─────▼─────┐      ┌─────▼─────┐
    │      │           │      │           │
    │      │  active   │      │  missed   │
    │      │           │      │           │
    │      └─────┬─────┘      └───────────┘
    │            │
    │       hangup / error
    │            │
    │      ┌─────▼─────┐
    │      │           │
    │      │  ended    │
    │      │           │
    │      └───────────┘
    │
 initiate
    │
┌───┴──────┐
│  (none)  │
└──────────┘
```

### Call Participant States

| State | Description |
|-------|-------------|
| `invited` | Participant has been invited but has not responded |
| `ringing` | Participant's device is ringing |
| `connected` | Participant is actively on the call |
| `left` | Participant has left the call |

---

## Meeting Flow

### Overview

Meetings support scheduled and instant creation, waiting rooms, multi-party video via mediasoup, polls, hand raising, breakout rooms, and recording.

### Flow Diagram

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Host   │    │  API Gateway │    │   Meeting    │    │  PostgreSQL  │
│  Client  │    │   (:3000)    │    │   Service    │    │  (meetings)  │
└────┬─────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
     │                 │                   │                   │
     │ ═══ CREATION ═══                    │                   │
     │                 │                   │                   │
     │ 1. POST /v1/meetings                │                   │
     │    { title, scheduledAt,            │                   │
     │      durationMins, settings: {      │                   │
     │        waitingRoom: true,           │                   │
     │        maxParticipants: 100 } }     │                   │
     │────────────────>│                   │                   │
     │                 │──────────────────>│                   │
     │                 │                   │ 2. Generate       │
     │                 │                   │    meetingCode     │
     │                 │                   │    (8-char unique) │
     │                 │                   │──────────────────>│
     │                 │                   │   INSERT meeting   │
     │                 │                   │                   │
     │ 3. Response: { id, meetingCode,     │                   │
     │    status: 'scheduled' }            │                   │
     │<────────────────│<──────────────────│                   │
     │                 │                   │                   │
     │ ═══ JOIN ═══    │                   │                   │
     │                 │                   │                   │
┌────┴──────┐          │                   │                   │
│Participant│          │                   │                   │
│  Client   │          │                   │                   │
└────┬──────┘          │                   │                   │
     │                 │                   │                   │
     │ 4. POST /v1/meetings/:id/join       │                   │
     │    { password? }                    │                   │
     │────────────────>│──────────────────>│                   │
     │                 │                   │                   │
     │                 │                   │ 5. Verify password │
     │                 │                   │    Check capacity  │
     │                 │                   │                   │
     │                 │                   │ 6. If waitingRoom: │
     │                 │                   │    status='waiting'│
     │                 │                   │    Notify host     │
     │                 │                   │                   │
     │ 7. emit('meeting.participant.joined')                   │
     │    via WS Gateway                   │                   │
     │                 │                   │                   │
     │ ═══ MEDIA (same as Call Flow) ═══   │                   │
     │                 │                   │                   │
     │ 8. Connect to Signaling Server      │                   │
     │    join_room(meetingId, 'meeting')   │                   │
     │    Create send + recv transports    │                   │
     │    Produce audio/video              │                   │
     │    Consume all other producers      │                   │
     │                 │                   │                   │
     │ ═══ INTERACTIVE FEATURES ═══        │                   │
     │                 │                   │                   │
     │ 9. emit('meeting.hand.raise')       │   ┌──────────┐   │
     │────────────────>│ ── via WS GW ──>│   │  Redis   │   │
     │                 │                   │──>│ ZADD     │   │
     │                 │                   │   │ meeting: │   │
     │                 │                   │   │ {id}:    │   │
     │                 │                   │   │ raised_  │   │
     │                 │                   │   │ hands    │   │
     │                 │                   │   └──────────┘   │
     │                 │                   │                   │
     │ 10. Broadcast 'meeting.hand.raised' │                   │
     │     to all participants             │                   │
     │<────────────────│                   │                   │
     │                 │                   │                   │
     │ 11. emit('meeting.poll.create', {   │                   │
     │     question: '...?',               │                   │
     │     options: ['A', 'B', 'C'] })     │                   │
     │────────────────>│──────────────────>│                   │
     │                 │                   │──────────────────>│
     │                 │                   │   INSERT poll      │
     │                 │                   │                   │
     │ 12. Broadcast 'meeting.poll.created'│                   │
     │     to all participants             │                   │
     │<────────────────│                   │                   │
     │                 │                   │                   │
     │ ═══ RECORDING ═══                   │                   │
     │                 │                   │                   │
     │ 13. emit('meeting.recording.start') │   ┌──────────┐   │
     │────────────────>│──────────────────>│   │  Media   │   │
     │                 │                   │──>│  Service  │   │
     │                 │                   │   │  (:3018)  │   │
     │                 │                   │   │          │   │
     │                 │                   │   │ Record   │   │
     │                 │                   │   │ via SFU  │   │
     │                 │                   │   │ plain RTP│   │
     │                 │                   │   │ -> S3    │   │
     │                 │                   │   └──────────┘   │
     │                 │                   │                   │
     │ ═══ END ═══     │                   │                   │
     │                 │                   │                   │
     │ 14. Host: POST /v1/meetings/:id/end │                   │
     │────────────────>│──────────────────>│                   │
     │                 │                   │──────────────────>│
     │                 │                   │  UPDATE status=    │
     │                 │                   │  'ended'           │
     │                 │                   │                   │
     │ 15. Broadcast 'meeting.ended'       │                   │
     │     All participants disconnect     │                   │
     │     Signaling Server cleans up room │                   │
```

### Meeting Settings Object

```json
{
  "waitingRoom": true,
  "allowScreenShare": true,
  "muteOnJoin": true,
  "recordingAutoStart": false,
  "maxParticipants": 100,
  "breakoutRoomsEnabled": true,
  "chatEnabled": true,
  "raiseHandEnabled": true,
  "pollingEnabled": true
}
```

### Meeting Redis State

During an active meeting, the following Redis keys are maintained:

| Key | Type | Purpose | TTL |
|-----|------|---------|-----|
| `meeting:{id}:participants` | SET | Active participant user IDs | None (cleared on end) |
| `meeting:{id}:raised_hands` | SORTED SET | Raised hands with timestamp as score | None |
| `meeting:{id}:active_poll` | HASH | Current active poll state | None |
| `meeting:{id}:breakout:{room}` | SET | Participants in breakout room | None |

---

## Live Stream Flow

### Overview

Live streaming uses mediasoup for low-latency ingestion from the host, FFmpeg for HLS transcoding, and CDN/S3 for scalable viewer delivery. Viewer counts use Redis HyperLogLog for memory-efficient approximate counting.

### Flow Diagram

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Host   │    │  Signaling   │    │   Stream     │    │  mediasoup   │
│  Client  │    │   Server     │    │   Service    │    │    SFU       │
└────┬─────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
     │                 │                   │                   │
     │ ═══ STREAM CREATION ═══             │                   │
     │                 │                   │                   │
     │ 1. POST /v1/streams                 │                   │
     │    { title, description }           │                   │
     │─────────────────────────────────────>│                   │
     │                 │                   │                   │
     │ 2. Response: { streamId,            │                   │
     │    signalingUrl, streamKey }         │                   │
     │<─────────────────────────────────────│                   │
     │                 │                   │                   │
     │ ═══ HOST PUBLISHES ═══              │                   │
     │                 │                   │                   │
     │ 3. WS connect to Signaling Server   │                   │
     │    join_room(streamId, 'stream')     │                   │
     │────────────────>│                   │                   │
     │                 │ 4. Create Router   │                   │
     │                 │──────────────────────────────────────>│
     │                 │                   │                   │
     │ 5. Create send transport            │                   │
     │    connect transport                │                   │
     │    produce audio + video            │                   │
     │────────────────>│──────────────────────────────────────>│
     │                 │                   │                   │
     │ ═══ HLS TRANSCODING ═══            │                   │
     │                 │                   │                   │
     │                 │                   │ 6. Start FFmpeg    │
     │                 │                   │    pipeline        │
     │                 │                   │                   │
     │                 │                   │    mediasoup       │
     │                 │                   │    RTP out ──────> FFmpeg
     │                 │                   │                    │
     │                 │                   │                    ▼
     │                 │                   │              ┌──────────┐
     │                 │                   │              │  FFmpeg  │
     │                 │                   │              │          │
     │                 │                   │              │ RTP ──>  │
     │                 │                   │              │ H.264    │
     │                 │                   │              │ ──> HLS  │
     │                 │                   │              │ .m3u8 +  │
     │                 │                   │              │ .ts segs │
     │                 │                   │              └────┬─────┘
     │                 │                   │                   │
     │                 │                   │              7. Upload segments
     │                 │                   │                   │
     │                 │                   │              ┌────▼─────┐
     │                 │                   │              │ MinIO/S3 │
     │                 │                   │              │          │
     │                 │                   │              │ /streams │
     │                 │                   │              │ /{id}/   │
     │                 │                   │              │ index.   │
     │                 │                   │              │ m3u8     │
     │                 │                   │              └────┬─────┘
     │                 │                   │                   │
     │                 │                   │              8. CDN edge cache
     │                 │                   │                   │
     │ ═══ VIEWER JOINS ═══               │              ┌────▼─────┐
     │                 │                   │              │   CDN    │
┌────┴──────┐          │                   │              │ (Cloud-  │
│  Viewer   │          │                   │              │  Front)  │
│  Client   │          │                   │              └────┬─────┘
└────┬──────┘          │                   │                   │
     │                 │                   │                   │
     │ 9. GET /v1/streams/:id              │                   │
     │─────────────────────────────────────>│                   │
     │                 │                   │                   │
     │ 10. Response: { hlsUrl,             │                   │
     │     viewerCount, status }           │                   │
     │<─────────────────────────────────────│                   │
     │                 │                   │                   │
     │ 11. HLS Player loads .m3u8          │                   │
     │     from CDN URL                    │                   │
     │─────────────────────────────────────────────────────────>│
     │                 │                   │                   │
     │ 12. Viewer count tracking           │                   │
     │     POST /v1/streams/:id/heartbeat  │                   │
     │─────────────────────────────────────>│                   │
     │                 │                   │   ┌──────────┐    │
     │                 │                   │──>│  Redis   │    │
     │                 │                   │   │ PFADD    │    │
     │                 │                   │   │ stream:  │    │
     │                 │                   │   │ {id}:    │    │
     │                 │                   │   │ viewers  │    │
     │                 │                   │   └──────────┘    │
     │                 │                   │                   │
     │ 13. Periodic viewer count broadcast │                   │
     │     emit('stream.viewer.count',     │                   │
     │      { count: PFCOUNT result })     │                   │
     │<────────────────│                   │                   │
     │                 │                   │                   │
     │ ═══ STREAM END ═══                 │                   │
     │                 │                   │                   │
     │ 14. Host: POST /v1/streams/:id/end  │                   │
     │                 │                   │                   │
     │ 15. Stop FFmpeg pipeline            │                   │
     │     Finalize HLS playlist           │                   │
     │     Save recording URL              │                   │
     │     Cleanup SFU room                │                   │
```

### HLS Transcoding Pipeline

```
mediasoup RTP output
    │
    ▼
FFmpeg process:
    -i rtp://0.0.0.0:{port}
    -c:v libx264 -preset veryfast -tune zerolatency
    -c:a aac -b:a 128k
    -f hls
    -hls_time 4                    (4-second segments)
    -hls_list_size 10              (keep 10 segments in playlist)
    -hls_flags delete_segments     (remove old segments)
    -hls_segment_filename 'seg_%05d.ts'
    output/index.m3u8
    │
    ▼
Upload to MinIO/S3:
    s3://recordings/streams/{streamId}/index.m3u8
    s3://recordings/streams/{streamId}/seg_00001.ts
    s3://recordings/streams/{streamId}/seg_00002.ts
    ...
```

### Viewer Count via HyperLogLog

Redis HyperLogLog provides approximate unique viewer counts with only 12 KB of memory per stream, regardless of the number of viewers:

```
PFADD stream:{streamId}:viewers {viewerId}    # Add viewer
PFCOUNT stream:{streamId}:viewers              # Get count (~0.81% error)
```

This allows tracking millions of unique viewers per stream without significant memory overhead.

---

## Presence Flow

### Overview

Presence uses Redis as the primary store with TTL-based expiry. Updates propagate across all WebSocket Gateway instances via Redis Pub/Sub through the Socket.IO Redis adapter. The Presence Service TTL defaults to 300 seconds (5 minutes).

### Flow Diagram

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Client  │    │  WebSocket   │    │  Presence    │    │    Redis     │
│   SDK    │    │   Gateway    │    │   Service    │    │              │
└────┬─────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
     │                 │                   │                   │
     │ ═══ CONNECT (GO ONLINE) ═══        │                   │
     │                 │                   │                   │
     │ 1. Socket.IO connect               │                   │
     │    (JWT in handshake)               │                   │
     │────────────────>│                   │                   │
     │                 │                   │                   │
     │                 │ 2. Auth middleware │                   │
     │                 │    verify JWT,    │                   │
     │                 │    attach user    │                   │
     │                 │                   │                   │
     │                 │ 3. registerPresenceHandler             │
     │                 │    emit status update                  │
     │                 │                   │                   │
     │                 │ 4. POST /presence/update               │
     │                 │    { userId, appId,                    │
     │                 │      status: 'online',                │
     │                 │      device: 'web' }                  │
     │                 │──────────────────>│                   │
     │                 │                   │                   │
     │                 │                   │ 5. Redis commands: │
     │                 │                   │                   │
     │                 │                   │ HSET presence:     │
     │                 │                   │   {appId}:{userId} │
     │                 │                   │   status "online"  │
     │                 │                   │   device "web"     │
     │                 │                   │   lastSeenAt <ts>  │
     │                 │                   │──────────────────>│
     │                 │                   │                   │
     │                 │                   │ SADD presence:     │
     │                 │                   │   {appId}:online   │
     │                 │                   │   {userId}         │
     │                 │                   │──────────────────>│
     │                 │                   │                   │
     │                 │                   │ EXPIRE presence:   │
     │                 │                   │   {appId}:{userId} │
     │                 │                   │   300              │
     │                 │                   │──────────────────>│
     │                 │                   │                   │
     │                 │ 6. Redis Pub/Sub: │                   │
     │                 │    PUBLISH presence:updates            │
     │                 │    { userId, status: 'online' }        │
     │                 │                   │                   │
     │                 │ 7. All WS Gateway instances receive    │
     │                 │    via presenceSubscriber Redis client  │
     │                 │                   │                   │
     │                 │ 8. Broadcast to subscribed clients:    │
     │                 │    emit('presence.changed', {          │
     │                 │      userId, status: 'online',         │
     │                 │      lastSeenAt, device })             │
     │                 │                   │                   │
     │ 9. Receive presence.changed event   │                   │
     │<────────────────│                   │                   │
     │                 │                   │                   │
     │ ═══ HEARTBEAT (KEEP ALIVE) ═══     │                   │
     │                 │                   │                   │
     │ 10. Socket.IO ping/pong             │                   │
     │     (every 25 seconds)              │                   │
     │<───────────────>│                   │                   │
     │                 │                   │                   │
     │                 │ 11. On each pong: │                   │
     │                 │     EXPIRE presence:                   │
     │                 │       {appId}:{userId} 300             │
     │                 │                   │──────────────────>│
     │                 │                   │   (refresh TTL)    │
     │                 │                   │                   │
     │ ═══ DISCONNECT (GO OFFLINE) ═══    │                   │
     │                 │                   │                   │
     │ 12. Socket.IO disconnect            │                   │
     │     (close / network error)         │                   │
     │──── X ──────────│                   │                   │
     │                 │                   │                   │
     │                 │ 13. disconnect handler:               │
     │                 │     POST /presence/update              │
     │                 │     { userId, appId,                   │
     │                 │       status: 'offline' }              │
     │                 │──────────────────>│                   │
     │                 │                   │                   │
     │                 │                   │ 14. Redis:         │
     │                 │                   │ HSET presence:     │
     │                 │                   │   {appId}:{userId} │
     │                 │                   │   status "offline" │
     │                 │                   │   lastSeenAt <ts>  │
     │                 │                   │──────────────────>│
     │                 │                   │                   │
     │                 │                   │ SREM presence:     │
     │                 │                   │   {appId}:online   │
     │                 │                   │   {userId}         │
     │                 │                   │──────────────────>│
     │                 │                   │                   │
     │                 │ 15. Publish + broadcast                │
     │                 │     'presence.changed'                 │
     │                 │     { status: 'offline',               │
     │                 │       lastSeenAt }                     │
     │                 │                   │                   │
     │ ═══ TTL EXPIRY (CRASH RECOVERY) ══ │                   │
     │                 │                   │                   │
     │                 │                   │ 16. If client      │
     │                 │                   │     crashes without│
     │                 │                   │     disconnect:    │
     │                 │                   │                   │
     │                 │                   │     Redis TTL      │
     │                 │                   │     expires after  │
     │                 │                   │     300 seconds    │
     │                 │                   │                   │
     │                 │                   │     Next query     │
     │                 │                   │     returns        │
     │                 │                   │     isExpired=true │
     │                 │                   │     -> 'offline'   │
```

### Presence Status Types

| Status | Description |
|--------|-------------|
| `online` | User is actively connected and interacting |
| `away` | User is connected but idle (set automatically after inactivity) |
| `dnd` | User has manually set Do Not Disturb |
| `offline` | User is disconnected or presence TTL has expired |

### Bulk Presence Query

```
GET /presence/bulk?userIds=usr_001,usr_002,usr_003,...,usr_100

Response:
[
  { "userId": "usr_001", "status": "online", "lastSeenAt": "...", "device": "web" },
  { "userId": "usr_002", "status": "offline", "lastSeenAt": "..." },
  { "userId": "usr_003", "status": "away", "lastSeenAt": "...", "device": "ios" }
]
```

Maximum 100 user IDs per bulk request.

---

## Authentication Flow

### Token Lifecycle

```
┌──────────┐          ┌──────────────┐          ┌──────────────┐
│  Server  │          │  API Gateway │          │ Auth Service │
│  (Your   │          │   (:3000)    │          │   (:3010)    │
│  Backend)│          │              │          │              │
└────┬─────┘          └──────┬───────┘          └──────┬───────┘
     │                       │                         │
     │ 1. POST /v1/auth/token                          │
     │    { apiKey, apiSecret,                         │
     │      userId: 'external_user_123',               │
     │      displayName: 'Alice' }                     │
     │──────────────────────>│────────────────────────>│
     │                       │                         │
     │                       │  2. Verify API key      │
     │                       │     Generate tokens:     │
     │                       │     - accessToken (15m)  │
     │                       │     - refreshToken (7d)  │
     │                       │                         │
     │ 3. { accessToken,     │                         │
     │      refreshToken,    │                         │
     │      expiresIn: 900 } │                         │
     │<──────────────────────│<────────────────────────│
     │                       │                         │
     │ 4. Pass accessToken   │                         │
     │    to Client SDK      │                         │
     │                       │                         │
┌────▼─────┐                 │                         │
│  Client  │                 │                         │
│   SDK    │                 │                         │
└────┬─────┘                 │                         │
     │                       │                         │
     │ 5. RajutechieStreamKit.init({   │                         │
     │      apiKey,          │                         │
     │      token })         │                         │
     │                       │                         │
     │ 6. TokenManager:      │                         │
     │    scheduleRefresh()  │                         │
     │    at 80% of expiry   │                         │
     │    (720 seconds)      │                         │
     │                       │                         │
     │ ... 720 seconds later ...                       │
     │                       │                         │
     │ 7. POST /v1/auth/refresh                        │
     │    { refreshToken }   │                         │
     │──────────────────────>│────────────────────────>│
     │                       │                         │
     │ 8. { accessToken (new),                         │
     │      expiresIn: 900 } │                         │
     │<──────────────────────│<────────────────────────│
```

---

## Typing Indicator Flow

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐
│ Client A │    │  WebSocket   │    │    Redis     │
│ (typing) │    │   Gateway    │    │              │
└────┬─────┘    └──────┬───────┘    └──────┬───────┘
     │                 │                   │
     │ 1. emit('typing.start',             │
     │    { channelId })                   │
     │────────────────>│                   │
     │                 │                   │
     │                 │ 2. HSET typing:{channelId}
     │                 │    {userId} {timestamp}
     │                 │    EXPIRE typing:{channelId} 5
     │                 │──────────────────>│
     │                 │                   │
     │                 │ 3. Broadcast to channel room:
     │                 │    'typing.start'
     │                 │    { channelId, userId,
     │                 │      isTyping: true }
     │                 │                   │
     │ ... 5 seconds without keystroke ... │
     │                 │                   │
     │ 4. emit('typing.stop',              │
     │    { channelId })                   │
     │────────────────>│                   │
     │                 │                   │
     │                 │ 5. HDEL typing:{channelId} {userId}
     │                 │──────────────────>│
     │                 │                   │
     │                 │ 6. Broadcast 'typing.stop'
```

The typing indicator TTL of 5 seconds ensures that if a client disconnects while typing, other participants will automatically stop seeing the indicator.

---

## Read Receipt Flow

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Client A │    │  WebSocket   │    │    Chat      │    │   MongoDB    │
│ (reader) │    │   Gateway    │    │   Service    │    │  (messages)  │
└────┬─────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
     │                 │                   │                   │
     │ 1. emit('message.read', {           │                   │
     │    channelId, messageId })          │                   │
     │────────────────>│                   │                   │
     │                 │                   │                   │
     │                 │ 2. Kafka: chat.messages                │
     │                 │    event: 'message.read'               │
     │                 │──────────────────────>                 │
     │                 │                   │                   │
     │                 │                   │ 3. Update message  │
     │                 │                   │    readBy array    │
     │                 │                   │──────────────────>│
     │                 │                   │                   │
     │                 │                   │ 4. Update member   │
     │                 │                   │    lastReadMsg     │
     │                 │                   │    unreadCount=0   │
     │                 │                   │                   │
     │                 │ 5. Broadcast 'message.read'            │
     │                 │    { channelId, messageId,             │
     │                 │      userId, readAt }                  │
     │                 │    to channel room                     │
```

---

## File Upload Flow

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Client  │    │  API Gateway │    │   Media      │    │   MinIO/S3   │
│   SDK    │    │   (:3000)    │    │   Service    │    │              │
└────┬─────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
     │                 │                   │                   │
     │ 1. POST /v1/media/upload            │                   │
     │    Content-Type: multipart/form-data│                   │
     │    file: <binary>                   │                   │
     │    channelId: 'ch_123'              │                   │
     │────────────────>│──────────────────>│                   │
     │                 │                   │                   │
     │                 │                   │ 2. Validate:       │
     │                 │                   │    - MIME type     │
     │                 │                   │    - File size     │
     │                 │                   │    - Virus scan    │
     │                 │                   │                   │
     │                 │                   │ 3. Upload to S3    │
     │                 │                   │    bucket: media   │
     │                 │                   │    key: {appId}/   │
     │                 │                   │         {uuid}.ext │
     │                 │                   │──────────────────>│
     │                 │                   │                   │
     │                 │                   │ 4. Generate        │
     │                 │                   │    thumbnail       │
     │                 │                   │    (if image/video)│
     │                 │                   │──────────────────>│
     │                 │                   │    bucket:         │
     │                 │                   │    thumbnails      │
     │                 │                   │                   │
     │ 5. Response:    │                   │                   │
     │    { url,       │                   │                   │
     │      thumbnailUrl,                  │                   │
     │      mimeType,  │                   │                   │
     │      size }     │                   │                   │
     │<────────────────│<──────────────────│                   │
     │                 │                   │                   │
     │ 6. Send message with attachment     │                   │
     │    (standard Chat Message Flow)     │                   │
```

---

## Event Topic Reference

| Kafka Topic | Key | Producers | Consumers |
|-------------|-----|-----------|-----------|
| `chat.messages` | `channelId` | WS Gateway | Chat Service, Notification Service, Analytics Service, Moderation Service |
| `chat.channels` | `channelId` | Chat Service | Notification Service, Analytics Service |
| `calls.events` | `callId` | WS Gateway, Call Service | Analytics Service, Notification Service |
| `meetings.events` | `meetingId` | Meeting Service | Analytics Service, Notification Service |
| `presence.updates` | `userId` | WS Gateway | Presence Service, Analytics Service |
| `streams.events` | `streamId` | Stream Service | Analytics Service, Notification Service |
| `analytics.events` | `appId` | All Services | Analytics Service |
| `notifications.outbound` | `userId` | All Services | Notification Service |
| `moderation.flags` | `channelId` | Moderation Service | Notification Service (admin alerts) |
