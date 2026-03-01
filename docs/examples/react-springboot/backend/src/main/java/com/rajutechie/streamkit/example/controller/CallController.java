package com.rajutechie.streamkit.example.controller;

import com.rajutechie.streamkit.RajutechieStreamKitClient;
import com.rajutechie.streamkit.example.dto.ApiResponse;
import com.rajutechie.streamkit.example.dto.CreateCallRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/calls")
public class CallController {

    private static final Logger log = LoggerFactory.getLogger(CallController.class);

    private final RajutechieStreamKitClient rajutechieStreamKitClient;

    // In-memory call store for the demo
    private final Map<String, Map<String, Object>> calls = new ConcurrentHashMap<>();

    public CallController(RajutechieStreamKitClient rajutechieStreamKitClient) {
        this.rajutechieStreamKitClient = rajutechieStreamKitClient;
    }

    /**
     * POST /api/calls
     * Initiates a new call. The actual WebRTC signaling happens client-side
     * via the RajutechieStreamKit SDK; this endpoint creates the call record and
     * notifies participants through the RajutechieStreamKit API.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createCall(
            @Valid @RequestBody CreateCallRequest request,
            Authentication auth
    ) {
        try {
            String userId = (String) auth.getPrincipal();
            String callId = "call_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);

            Map<String, Object> call = Map.of(
                    "id", callId,
                    "type", request.type(),
                    "status", "ringing",
                    "initiatedBy", userId,
                    "participants", request.participants(),
                    "startedAt", Instant.now().toString()
            );

            calls.put(callId, new ConcurrentHashMap<>(call));
            log.info("Call {} created by user {} with participants {}", callId, userId, request.participants());

            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(call));
        } catch (Exception e) {
            log.error("Failed to create call", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to create call: " + e.getMessage()));
        }
    }

    /**
     * GET /api/calls/{id}
     * Retrieves call details by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCall(
            @PathVariable String id,
            Authentication auth
    ) {
        Map<String, Object> call = calls.get(id);
        if (call == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Call not found"));
        }
        return ResponseEntity.ok(ApiResponse.ok(call));
    }

    /**
     * GET /api/calls
     * Lists recent calls for the authenticated user.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listCalls(
            Authentication auth
    ) {
        String userId = (String) auth.getPrincipal();

        List<Map<String, Object>> userCalls = calls.values().stream()
                .filter(call -> {
                    String initiator = (String) call.get("initiatedBy");
                    @SuppressWarnings("unchecked")
                    List<String> participants = (List<String>) call.get("participants");
                    return userId.equals(initiator) || (participants != null && participants.contains(userId));
                })
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(userCalls));
    }
}
