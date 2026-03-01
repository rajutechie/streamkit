package com.rajutechie.streamkit.example.controller;

import com.rajutechie.streamkit.RajutechieStreamKitClient;
import com.rajutechie.streamkit.example.dto.ApiResponse;
import com.rajutechie.streamkit.example.dto.CreateCallRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@RestController
@RequestMapping("/api/calls")
@RequiredArgsConstructor
public class CallController {

    private final RajutechieStreamKitClient rajutechieStreamKitClient;

    private final Map<String, Map<String, Object>> calls = new ConcurrentHashMap<>();

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createCall(
            @Valid @RequestBody CreateCallRequest request) {

        try {
            String callId = UUID.randomUUID().toString();
            Instant now = Instant.now();

            List<Map<String, Object>> participants = new ArrayList<>();
            for (String userId : request.getParticipants()) {
                Map<String, Object> participant = new LinkedHashMap<>();
                participant.put("id", UUID.randomUUID().toString());
                participant.put("userId", userId);
                participant.put("role", "participant");
                participant.put("status", "invited");
                participant.put("hasAudio", true);
                participant.put("hasVideo", "video".equals(request.getType()));
                participant.put("hasScreen", false);
                participants.add(participant);
            }

            Map<String, Object> call = new LinkedHashMap<>();
            call.put("id", callId);
            call.put("type", request.getType());
            call.put("status", "ringing");
            call.put("initiatedBy", request.getParticipants().get(0));
            call.put("participants", participants);
            call.put("startedAt", now.toString());
            call.put("answeredAt", null);
            call.put("endedAt", null);
            call.put("endReason", null);
            call.put("recordingStatus", "none");

            calls.put(callId, call);
            log.info("Call created: {} (type={})", callId, request.getType());

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.ok("Call initiated", call));
        } catch (Exception e) {
            log.error("Failed to create call", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to create call: " + e.getMessage()));
        }
    }

    @GetMapping("/{callId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCall(
            @PathVariable String callId) {

        Map<String, Object> call = calls.get(callId);
        if (call == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Call not found"));
        }
        return ResponseEntity.ok(ApiResponse.ok(call));
    }
}
