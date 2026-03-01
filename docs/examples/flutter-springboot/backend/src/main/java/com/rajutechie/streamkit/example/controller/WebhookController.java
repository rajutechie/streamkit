package com.rajutechie.streamkit.example.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Receives webhook events from the RajutechieStreamKit platform.
 *
 * RajutechieStreamKit sends events like message.new, call.started, stream.started, etc.
 * The signature header is verified before processing to ensure authenticity.
 */
@Slf4j
@RestController
@RequestMapping("/api/webhooks")
public class WebhookController {

    private final String webhookSecret;
    private final ObjectMapper objectMapper;

    public WebhookController(
            @Value("${rajutechie-streamkit.webhook-secret}") String webhookSecret,
            ObjectMapper objectMapper) {
        this.webhookSecret = webhookSecret;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/rajutechie-streamkit")
    public ResponseEntity<Void> handleWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "X-RajutechieStreamKit-Signature", required = false) String signature) {

        // Verify signature if present
        if (signature != null && !signature.isEmpty()) {
            if (!verifySignature(payload, signature)) {
                log.warn("Webhook signature verification failed");
                return ResponseEntity.badRequest().build();
            }
        }

        try {
            JsonNode event = objectMapper.readTree(payload);
            String eventType = event.has("type") ? event.get("type").asText() : "unknown";

            log.info("Received webhook event: {}", eventType);

            switch (eventType) {
                case "message.new" -> handleNewMessage(event);
                case "call.started" -> handleCallStarted(event);
                case "call.ended" -> handleCallEnded(event);
                case "stream.started" -> handleStreamStarted(event);
                case "stream.ended" -> handleStreamEnded(event);
                case "user.online" -> handleUserOnline(event);
                case "user.offline" -> handleUserOffline(event);
                case "meeting.started" -> handleMeetingStarted(event);
                case "meeting.ended" -> handleMeetingEnded(event);
                case "meeting.participant.joined" -> handleMeetingParticipantJoined(event);
                case "meeting.participant.left" -> handleMeetingParticipantLeft(event);
                default -> log.debug("Unhandled webhook event type: {}", eventType);
            }

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error processing webhook", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ------------------------------------------------------------------ //

    private void handleNewMessage(JsonNode event) {
        String channelId = event.path("data").path("channelId").asText("");
        String senderId = event.path("data").path("senderId").asText("");
        log.info("New message in channel {} from user {}", channelId, senderId);
    }

    private void handleCallStarted(JsonNode event) {
        String callId = event.path("data").path("callId").asText("");
        log.info("Call started: {}", callId);
    }

    private void handleCallEnded(JsonNode event) {
        String callId = event.path("data").path("callId").asText("");
        String reason = event.path("data").path("reason").asText("unknown");
        log.info("Call ended: {} (reason: {})", callId, reason);
    }

    private void handleStreamStarted(JsonNode event) {
        String streamId = event.path("data").path("streamId").asText("");
        log.info("Stream started: {}", streamId);
    }

    private void handleStreamEnded(JsonNode event) {
        String streamId = event.path("data").path("streamId").asText("");
        log.info("Stream ended: {}", streamId);
    }

    private void handleUserOnline(JsonNode event) {
        String userId = event.path("data").path("userId").asText("");
        log.info("User online: {}", userId);
    }

    private void handleUserOffline(JsonNode event) {
        String userId = event.path("data").path("userId").asText("");
        log.info("User offline: {}", userId);
    }

    // ------------------------------------------------------------------ //

    private boolean verifySignature(String payload, String signature) {
        try {
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

            String signedPayload = timestamp + "." + payload;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(
                    webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(signedPayload.getBytes(StandardCharsets.UTF_8));
            String computed = bytesToHex(hash);

            return MessageDigest.isEqual(computed.getBytes(), sig.getBytes());
        } catch (Exception e) {
            log.error("Signature verification error", e);
            return false;
        }
    }

    private void handleMeetingStarted(JsonNode event) {
        String meetingId = event.path("data").path("id").asText("");
        String title = event.path("data").path("title").asText("");
        log.info("Meeting started: {} '{}'", meetingId, title);
    }

    private void handleMeetingEnded(JsonNode event) {
        String meetingId = event.path("data").path("id").asText("");
        int durationMins = event.path("data").path("durationMins").asInt();
        log.info("Meeting ended: {} ({}min)", meetingId, durationMins);
    }

    private void handleMeetingParticipantJoined(JsonNode event) {
        String meetingId = event.path("data").path("meetingId").asText("");
        String userId = event.path("data").path("userId").asText("");
        log.info("User {} joined meeting {}", userId, meetingId);
    }

    private void handleMeetingParticipantLeft(JsonNode event) {
        String meetingId = event.path("data").path("meetingId").asText("");
        String userId = event.path("data").path("userId").asText("");
        log.info("User {} left meeting {}", userId, meetingId);
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
