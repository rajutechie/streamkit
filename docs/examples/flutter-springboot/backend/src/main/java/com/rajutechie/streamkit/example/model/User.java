package com.rajutechie.streamkit.example.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * In-memory user model for the demo.
 *
 * In a real application this would be backed by a database entity.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    private String id;
    private String username;
    private String displayName;
    private String avatarUrl;

    @JsonIgnore
    private String password;

    private boolean online;
    private Instant createdAt;
    private Instant lastSeenAt;
}
