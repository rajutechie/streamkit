package com.rajutechie.streamkit.example.controller;

import com.rajutechie.streamkit.RajutechieStreamKitClient;
import com.rajutechie.streamkit.example.dto.ApiResponse;
import com.rajutechie.streamkit.example.dto.CreateStreamRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/streams")
public class StreamController {

    private static final Logger log = LoggerFactory.getLogger(StreamController.class);

    private final RajutechieStreamKitClient rajutechieStreamKitClient;

    // In-memory stream store for the demo
    private final Map<String, Map<String, Object>> streams = new ConcurrentHashMap<>();

    public StreamController(RajutechieStreamKitClient rajutechieStreamKitClient) {
        this.rajutechieStreamKitClient = rajutechieStreamKitClient;
    }

    /**
     * POST /api/streams
     * Creates a new live stream.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createStream(
            @Valid @RequestBody CreateStreamRequest request,
            Authentication auth
    ) {
        try {
            String userId = (String) auth.getPrincipal();
            String streamId = "stream_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
            String streamKey = "sk_" + UUID.randomUUID().toString().replace("-", "");

            Map<String, Object> stream = new ConcurrentHashMap<>(Map.of(
                    "id", streamId,
                    "title", request.title(),
                    "hostId", userId,
                    "streamKey", streamKey,
                    "status", "idle",
                    "visibility", request.visibility() != null ? request.visibility() : "public",
                    "viewerCount", 0,
                    "peakViewers", 0,
                    "createdAt", Instant.now().toString()
            ));

            streams.put(streamId, stream);
            log.info("Stream {} created by user {}: {}", streamId, userId, request.title());

            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(stream));
        } catch (Exception e) {
            log.error("Failed to create stream", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to create stream: " + e.getMessage()));
        }
    }

    /**
     * GET /api/streams
     * Lists all streams. Optionally filter by status query parameter.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listStreams(
            @RequestParam(required = false) String status
    ) {
        List<Map<String, Object>> result;

        if (status != null && !status.isBlank()) {
            result = streams.values().stream()
                    .filter(s -> status.equals(s.get("status")))
                    .toList();
        } else {
            result = new ArrayList<>(streams.values());
        }

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /**
     * GET /api/streams/{id}
     * Retrieves stream details.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStream(
            @PathVariable String id
    ) {
        Map<String, Object> stream = streams.get(id);
        if (stream == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Stream not found"));
        }
        return ResponseEntity.ok(ApiResponse.ok(stream));
    }

    /**
     * POST /api/streams/{id}/start
     * Transitions the stream to "live" status.
     */
    @PostMapping("/{id}/start")
    public ResponseEntity<ApiResponse<Map<String, Object>>> startStream(
            @PathVariable String id,
            Authentication auth
    ) {
        Map<String, Object> stream = streams.get(id);
        if (stream == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Stream not found"));
        }

        String userId = (String) auth.getPrincipal();
        if (!userId.equals(stream.get("hostId"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Only the host can start the stream"));
        }

        stream.put("status", "live");
        stream.put("startedAt", Instant.now().toString());
        log.info("Stream {} started by user {}", id, userId);

        return ResponseEntity.ok(ApiResponse.ok(stream));
    }

    /**
     * POST /api/streams/{id}/stop
     * Ends the stream.
     */
    @PostMapping("/{id}/stop")
    public ResponseEntity<ApiResponse<Map<String, Object>>> stopStream(
            @PathVariable String id,
            Authentication auth
    ) {
        Map<String, Object> stream = streams.get(id);
        if (stream == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Stream not found"));
        }

        String userId = (String) auth.getPrincipal();
        if (!userId.equals(stream.get("hostId"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Only the host can stop the stream"));
        }

        stream.put("status", "ended");
        stream.put("endedAt", Instant.now().toString());
        log.info("Stream {} stopped by user {}", id, userId);

        return ResponseEntity.ok(ApiResponse.ok(stream));
    }
}
