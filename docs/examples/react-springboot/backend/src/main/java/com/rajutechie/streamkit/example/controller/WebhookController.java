package com.rajutechie.streamkit.example.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rajutechie.streamkit.example.dto.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Handles incoming webhooks from the RajutechieStreamKit platform.
 *
 * Webhook events are used for server-side processing of real-time events
 * such as message moderation, call recording completion, and stream status changes.
 */
@RestController
@RequestMapping("/api/webhooks")
public class WebhookController {

    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    private final String webhookSecret;
    private final ObjectMapper objectMapper;

    public WebhookController(
            @Value("${rajutechie-streamkit.webhook-secret}") String webhookSecret,
            ObjectMapper objectMapper
    ) {
        this.webhookSecret = webhookSecret;
        this.objectMapper = objectMapper;
    }

    /**
     * POST /api/webhooks/rajutechie-streamkit
     * Receives and processes RajutechieStreamKit webhook events.
     * Verifies the signature before processing.
     */
    @PostMapping("/rajutechie-streamkit")
    public ResponseEntity<ApiResponse<String>> handleWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "X-RajutechieStreamKit-Signature", required = false) String signature
    ) {
        // Verify webhook signature
        if (signature == null || !verifySignature(payload, signature)) {
            log.warn("Webhook received with invalid signature");
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Invalid webhook signature"));
        }

        try {
            JsonNode event = objectMapper.readTree(payload);
            String eventType = event.has("type") ? event.get("type").asText() : "unknown";

            log.info("Webhook received: type={}", eventType);

            switch (eventType) {
                case "message.new" -> handleNewMessage(event);
                case "message.updated" -> handleMessageUpdated(event);
                case "message.deleted" -> handleMessageDeleted(event);
                case "call.started" -> handleCallStarted(event);
                case "call.ended" -> handleCallEnded(event);
                case "call.recording.ready" -> handleRecordingReady(event);
                case "stream.started" -> handleStreamStarted(event);
                case "stream.ended" -> handleStreamEnded(event);
                case "user.presence.changed" -> handlePresenceChanged(event);
                case "meeting.started" -> handleMeetingStarted(event);
                case "meeting.ended" -> handleMeetingEnded(event);
                case "meeting.participant.joined" -> handleMeetingParticipantJoined(event);
                case "meeting.participant.left" -> handleMeetingParticipantLeft(event);
                default -> log.debug("Unhandled webhook event type: {}", eventType);
            }

            return ResponseEntity.ok(ApiResponse.ok("Event processed"));
        } catch (Exception e) {
            log.error("Failed to process webhook", e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Failed to process webhook"));
        }
    }

    // ── Event Handlers ──────────────────────────────────────────────

    private void handleNewMessage(JsonNode event) {
        String channelId = event.path("data").path("channelId").asText();
        String senderId = event.path("data").path("senderId").asText();
        String text = event.path("data").path("content").path("text").asText();
        log.info("New message in channel {}: {} says '{}'", channelId, senderId, text);

        // In production: run moderation, update analytics, send push notifications
    }

    private void handleMessageUpdated(JsonNode event) {
        String messageId = event.path("data").path("id").asText();
        log.info("Message updated: {}", messageId);
    }

    private void handleMessageDeleted(JsonNode event) {
        String messageId = event.path("data").path("messageId").asText();
        log.info("Message deleted: {}", messageId);
    }

    private void handleCallStarted(JsonNode event) {
        String callId = event.path("data").path("id").asText();
        String type = event.path("data").path("type").asText();
        log.info("Call started: {} ({})", callId, type);

        // In production: update call analytics, check rate limits
    }

    private void handleCallEnded(JsonNode event) {
        String callId = event.path("data").path("id").asText();
        long duration = event.path("data").path("duration").asLong();
        log.info("Call ended: {} (duration: {}s)", callId, duration);

        // In production: log call records, update billing
    }

    private void handleRecordingReady(JsonNode event) {
        String callId = event.path("data").path("callId").asText();
        String recordingUrl = event.path("data").path("recordingUrl").asText();
        log.info("Recording ready for call {}: {}", callId, recordingUrl);

        // In production: store recording URL, notify participants
    }

    private void handleStreamStarted(JsonNode event) {
        String streamId = event.path("data").path("id").asText();
        String hostId = event.path("data").path("hostId").asText();
        log.info("Stream started: {} by {}", streamId, hostId);
    }

    private void handleStreamEnded(JsonNode event) {
        String streamId = event.path("data").path("id").asText();
        int peakViewers = event.path("data").path("peakViewers").asInt();
        log.info("Stream ended: {} (peak viewers: {})", streamId, peakViewers);
    }

    private void handlePresenceChanged(JsonNode event) {
        String userId = event.path("data").path("userId").asText();
        String status = event.path("data").path("status").asText();
        log.debug("Presence changed: {} -> {}", userId, status);
    }

    private void handleMeetingStarted(JsonNode event) {
        String meetingId = event.path("data").path("id").asText();
        String title = event.path("data").path("title").asText();
        String hostId = event.path("data").path("hostId").asText();
        log.info("Meeting started: {} '{}' hosted by {}", meetingId, title, hostId);
        // In production: notify invitees, start recording if configured
    }

    private void handleMeetingEnded(JsonNode event) {
        String meetingId = event.path("data").path("id").asText();
        int durationMins = event.path("data").path("durationMins").asInt();
        int peakParticipants = event.path("data").path("peakParticipants").asInt();
        log.info("Meeting ended: {} (duration: {}min, peak: {} participants)",
                meetingId, durationMins, peakParticipants);
        // In production: finalize recordings, send meeting summaries, update analytics
    }

    private void handleMeetingParticipantJoined(JsonNode event) {
        String meetingId = event.path("data").path("meetingId").asText();
        String userId = event.path("data").path("userId").asText();
        log.info("User {} joined meeting {}", userId, meetingId);
    }

    private void handleMeetingParticipantLeft(JsonNode event) {
        String meetingId = event.path("data").path("meetingId").asText();
        String userId = event.path("data").path("userId").asText();
        log.info("User {} left meeting {}", userId, meetingId);
    }

    // ── Signature Verification ──────────────────────────────────────

    private boolean verifySignature(String payload, String signature) {
        try {
            // Signature format: "t=<timestamp>,v1=<hex_hash>"
            String[] parts = signature.split(",");
            String timestamp = null;
            String sig = null;
            for (String part : parts) {
                String trimmed = part.trim();
                if (trimmed.startsWith("t=")) timestamp = trimmed.substring(2);
                if (trimmed.startsWith("v1=")) sig = trimmed.substring(3);
            }
            if (timestamp == null || sig == null) return false;

            // Reject events older than 5 minutes
            long ts = Long.parseLong(timestamp);
            long now = System.currentTimeMillis() / 1000;
            if (Math.abs(now - ts) > 300) return false;

            // Compute HMAC-SHA256
            String signedPayload = timestamp + "." + payload;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(
                    webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"
            ));
            byte[] hash = mac.doFinal(signedPayload.getBytes(StandardCharsets.UTF_8));
            String computed = bytesToHex(hash);

            return MessageDigest.isEqual(
                    computed.getBytes(StandardCharsets.UTF_8),
                    sig.getBytes(StandardCharsets.UTF_8)
            );
        } catch (Exception e) {
            log.error("Webhook signature verification failed", e);
            return false;
        }
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
