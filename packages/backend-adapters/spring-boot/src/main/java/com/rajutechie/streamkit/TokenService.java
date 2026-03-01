package com.rajutechie.streamkit;

import java.time.Duration;
import java.util.Map;

public class TokenService {
    private final RajutechieStreamKitClient client;

    public TokenService(RajutechieStreamKitClient client) {
        this.client = client;
    }

    public String generateUserToken(String userId) {
        return client.generateToken(userId, "user", Duration.ofHours(1));
    }

    public String generateUserToken(String userId, String role, Duration expiresIn) {
        return client.generateToken(userId, role, expiresIn);
    }

    public Map<String, Object> verifyToken(String token) {
        return client.verifyToken(token);
    }
}
