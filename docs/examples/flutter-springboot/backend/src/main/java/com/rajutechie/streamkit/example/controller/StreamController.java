package com.rajutechie.streamkit.example.controller;

import com.rajutechie.streamkit.RajutechieStreamKitClient;
import com.rajutechie.streamkit.example.dto.ApiResponse;
import com.rajutechie.streamkit.example.dto.CreateStreamRequest;
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
@RequestMapping("/api/streams")
@RequiredArgsConstructor
public class StreamController {

    private final RajutechieStreamKitClient rajutechieStreamKitClient;

    private final Map<String, Map<String, Object>> streams = new ConcurrentHashMap<>();

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createStream(
            @Valid @RequestBody CreateStreamRequest request) {

        try {
            String streamId = UUID.randomUUID().toString();
            String streamKey = "sk_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
            Instant now = Instant.now();

            Map<String, Object> stream = new LinkedHashMap<>();
            stream.put("id", streamId);
            stream.put("title", request.getTitle());
            stream.put("description", request.getDescription());
            stream.put("visibility", request.getVisibility());
            stream.put("status", "created");
            stream.put("streamKey", streamKey);
            stream.put("viewerCount", 0);
            stream.put("hostId", null);
            stream.put("hostName", null);
            stream.put("createdAt", now.toString());
            stream.put("startedAt", null);
            stream.put("endedAt", null);

            streams.put(streamId, stream);
            log.info("Stream created: {} (title={})", streamId, request.getTitle());

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.ok("Stream created", stream));
        } catch (Exception e) {
            log.error("Failed to create stream", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to create stream: " + e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listStreams() {
        List<Map<String, Object>> list = new ArrayList<>(streams.values());
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @GetMapping("/{streamId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStream(
            @PathVariable String streamId) {

        Map<String, Object> stream = streams.get(streamId);
        if (stream == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Stream not found"));
        }
        return ResponseEntity.ok(ApiResponse.ok(stream));
    }

    @PostMapping("/{streamId}/start")
    public ResponseEntity<ApiResponse<Map<String, Object>>> startStream(
            @PathVariable String streamId) {

        Map<String, Object> stream = streams.get(streamId);
        if (stream == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Stream not found"));
        }

        stream.put("status", "live");
        stream.put("startedAt", Instant.now().toString());
        log.info("Stream started: {}", streamId);

        return ResponseEntity.ok(ApiResponse.ok("Stream is live", stream));
    }

    @PostMapping("/{streamId}/stop")
    public ResponseEntity<ApiResponse<Map<String, Object>>> stopStream(
            @PathVariable String streamId) {

        Map<String, Object> stream = streams.get(streamId);
        if (stream == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Stream not found"));
        }

        stream.put("status", "ended");
        stream.put("endedAt", Instant.now().toString());
        log.info("Stream stopped: {}", streamId);

        return ResponseEntity.ok(ApiResponse.ok("Stream ended", stream));
    }
}
