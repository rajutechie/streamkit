package com.rajutechie.streamkit.example.controller;

import com.rajutechie.streamkit.RajutechieStreamKitClient;
import com.rajutechie.streamkit.example.dto.ApiResponse;
import com.rajutechie.streamkit.example.dto.CreateChannelRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/channels")
public class ChannelController {

    private static final Logger log = LoggerFactory.getLogger(ChannelController.class);

    private final RajutechieStreamKitClient rajutechieStreamKitClient;

    public ChannelController(RajutechieStreamKitClient rajutechieStreamKitClient) {
        this.rajutechieStreamKitClient = rajutechieStreamKitClient;
    }

    /**
     * POST /api/channels
     * Creates a new chat channel via the RajutechieStreamKit API.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createChannel(
            @Valid @RequestBody CreateChannelRequest request,
            Authentication auth
    ) {
        try {
            String userId = (String) auth.getPrincipal();

            // Ensure the creator is included in the members list
            List<String> members = new java.util.ArrayList<>(request.members());
            if (!members.contains(userId)) {
                members.add(userId);
            }

            String channelName = request.name();
            if (channelName == null || channelName.isBlank()) {
                channelName = "direct-" + String.join("-", members.stream().sorted().toList());
            }

            var config = new RajutechieStreamKitClient.ChannelConfig(
                    request.type(),
                    channelName,
                    members
            );

            String response = rajutechieStreamKitClient.chat().createChannel(config);
            log.info("Channel created for user {}: {}", userId, channelName);

            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(Map.of(
                    "channelId", channelName,
                    "type", request.type(),
                    "name", channelName,
                    "members", members,
                    "response", response
            )));
        } catch (Exception e) {
            log.error("Failed to create channel", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to create channel: " + e.getMessage()));
        }
    }

    /**
     * GET /api/channels
     * Lists channels for the authenticated user.
     * In the demo this returns a static list; in production the RajutechieStreamKit API
     * would return the user's actual channels.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listChannels(
            Authentication auth
    ) {
        String userId = (String) auth.getPrincipal();

        // In a real app, this would call rajutechieStreamKitClient to list channels.
        // For the demo, we return sample channels that the SDK will hydrate client-side.
        List<Map<String, Object>> channels = List.of(
                Map.of(
                        "id", "general",
                        "type", "group",
                        "name", "General",
                        "memberCount", 3,
                        "lastMessageAt", java.time.Instant.now().toString()
                ),
                Map.of(
                        "id", "random",
                        "type", "group",
                        "name", "Random",
                        "memberCount", 3,
                        "lastMessageAt", java.time.Instant.now().toString()
                )
        );

        return ResponseEntity.ok(ApiResponse.ok(channels));
    }
}
