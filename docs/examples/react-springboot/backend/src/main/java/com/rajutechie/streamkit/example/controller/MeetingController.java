package com.rajutechie.streamkit.example.controller;

import com.rajutechie.streamkit.example.dto.ApiResponse;
import com.rajutechie.streamkit.example.dto.CreateMeetingRequest;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * REST endpoints for meeting scheduling, joining, and management.
 *
 * Uses an in-memory store for the demo. In production, persist meetings to a
 * database via a repository and forward lifecycle events to the StreamKit
 * platform via {@code RajutechieStreamKitClient}.
 */
@Slf4j
@RestController
@RequestMapping("/api/meetings")
public class MeetingController {

    private final Map<String, Map<String, Object>> meetings = new ConcurrentHashMap<>();

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createMeeting(
            @Valid @RequestBody CreateMeetingRequest request) {

        try {
            String meetingId = UUID.randomUUID().toString();
            Instant now = Instant.now();

            Map<String, Object> settings = new LinkedHashMap<>();
            settings.put("muteOnJoin", request.getSettings().isMuteOnJoin());
            settings.put("waitingRoom", request.getSettings().isWaitingRoom());
            settings.put("maxParticipants", request.getSettings().getMaxParticipants());
            settings.put("recording", request.getSettings().isRecording());

            Map<String, Object> meeting = new LinkedHashMap<>();
            meeting.put("id", meetingId);
            meeting.put("title", request.getTitle());
            meeting.put("status", "scheduled");
            meeting.put("scheduledAt", request.getScheduledAt() != null
                    ? request.getScheduledAt() : now.toString());
            meeting.put("durationMins", request.getDurationMins());
            meeting.put("hasPassword", request.getPassword() != null
                    && !request.getPassword().isEmpty());
            meeting.put("_password", request.getPassword() != null
                    ? request.getPassword() : "");
            meeting.put("participants", new ArrayList<>());
            meeting.put("participantCount", 0);
            meeting.put("settings", settings);
            meeting.put("startedAt", null);
            meeting.put("endedAt", null);
            meeting.put("createdAt", now.toString());

            meetings.put(meetingId, meeting);
            log.info("Meeting scheduled: {} — '{}'", meetingId, request.getTitle());

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.ok("Meeting scheduled", sanitize(meeting)));
        } catch (Exception e) {
            log.error("Failed to create meeting", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to create meeting: " + e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listMeetings() {
        List<Map<String, Object>> result = meetings.values().stream()
                .map(this::sanitize)
                .sorted(Comparator.comparing(m -> m.get("scheduledAt").toString()))
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{meetingId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMeeting(
            @PathVariable String meetingId) {

        Map<String, Object> meeting = meetings.get(meetingId);
        if (meeting == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Meeting not found"));
        }
        return ResponseEntity.ok(ApiResponse.ok(sanitize(meeting)));
    }

    @PostMapping("/{meetingId}/join")
    public ResponseEntity<ApiResponse<Map<String, Object>>> joinMeeting(
            @PathVariable String meetingId,
            @RequestBody(required = false) Map<String, String> body) {

        Map<String, Object> meeting = meetings.get(meetingId);
        if (meeting == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Meeting not found"));
        }
        if ("ended".equals(meeting.get("status"))) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiResponse.error("Meeting has already ended"));
        }

        String password = (String) meeting.get("_password");
        if (password != null && !password.isEmpty()) {
            String provided = body != null ? body.getOrDefault("password", "") : "";
            if (!password.equals(provided)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("Incorrect meeting password"));
            }
        }

        String userId = body != null ? body.getOrDefault("userId", "anonymous") : "anonymous";
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> participants =
                (List<Map<String, Object>>) meeting.get("participants");

        Map<String, Object> participant = new LinkedHashMap<>();
        participant.put("userId", userId);
        participant.put("role", "participant");
        participant.put("joinedAt", Instant.now().toString());
        participants.add(participant);

        meeting.put("participantCount", participants.size());
        if ("scheduled".equals(meeting.get("status"))) {
            meeting.put("status", "active");
            meeting.put("startedAt", Instant.now().toString());
        }

        log.info("User {} joined meeting {}", userId, meetingId);
        return ResponseEntity.ok(ApiResponse.ok("Joined meeting", sanitize(meeting)));
    }

    @PostMapping("/{meetingId}/leave")
    public ResponseEntity<ApiResponse<Map<String, String>>> leaveMeeting(
            @PathVariable String meetingId,
            @RequestBody(required = false) Map<String, String> body) {

        Map<String, Object> meeting = meetings.get(meetingId);
        if (meeting == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Meeting not found"));
        }

        String userId = body != null ? body.getOrDefault("userId", "") : "";
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> participants =
                (List<Map<String, Object>>) meeting.get("participants");
        participants.removeIf(p -> userId.equals(p.get("userId")));
        meeting.put("participantCount", participants.size());

        log.info("User {} left meeting {}", userId, meetingId);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "left")));
    }

    @PostMapping("/{meetingId}/end")
    public ResponseEntity<ApiResponse<Map<String, Object>>> endMeeting(
            @PathVariable String meetingId) {

        Map<String, Object> meeting = meetings.get(meetingId);
        if (meeting == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Meeting not found"));
        }

        meeting.put("status", "ended");
        meeting.put("endedAt", Instant.now().toString());
        log.info("Meeting ended: {}", meetingId);

        return ResponseEntity.ok(ApiResponse.ok("Meeting ended", sanitize(meeting)));
    }

    private Map<String, Object> sanitize(Map<String, Object> meeting) {
        Map<String, Object> copy = new LinkedHashMap<>(meeting);
        copy.remove("_password");
        return copy;
    }
}
