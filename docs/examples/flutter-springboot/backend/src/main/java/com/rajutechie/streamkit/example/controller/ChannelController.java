package com.rajutechie.streamkit.example.controller;

import com.rajutechie.streamkit.RajutechieStreamKitClient;
import com.rajutechie.streamkit.example.dto.ApiResponse;
import com.rajutechie.streamkit.example.dto.CreateChannelRequest;
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
@RequestMapping("/api/channels")
@RequiredArgsConstructor
public class ChannelController {

    private final RajutechieStreamKitClient rajutechieStreamKitClient;

    /**
     * In-memory store for demo purposes. In production the RajutechieStreamKit platform
     * manages channels and your backend just proxies the calls.
     */
    private final Map<String, Map<String, Object>> channels = new ConcurrentHashMap<>();

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createChannel(
            @Valid @RequestBody CreateChannelRequest request) {

        try {
            String channelId = UUID.randomUUID().toString();
            Instant now = Instant.now();

            Map<String, Object> channel = new LinkedHashMap<>();
            channel.put("id", channelId);
            channel.put("type", request.getType());
            channel.put("name", request.getName());
            channel.put("members", request.getMembers());
            channel.put("memberCount", request.getMembers().size());
            channel.put("createdAt", now.toString());
            channel.put("updatedAt", now.toString());
            channel.put("lastMessageAt", null);
            channel.put("metadata", Map.of());

            channels.put(channelId, channel);
            log.info("Channel created: {} (type={})", channelId, request.getType());

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.ok("Channel created", channel));
        } catch (Exception e) {
            log.error("Failed to create channel", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to create channel: " + e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listChannels() {
        List<Map<String, Object>> list = new ArrayList<>(channels.values());
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @GetMapping("/{channelId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getChannel(
            @PathVariable String channelId) {

        Map<String, Object> channel = channels.get(channelId);
        if (channel == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Channel not found"));
        }
        return ResponseEntity.ok(ApiResponse.ok(channel));
    }
}
