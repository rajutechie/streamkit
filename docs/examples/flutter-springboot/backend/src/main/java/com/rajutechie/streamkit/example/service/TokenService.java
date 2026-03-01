package com.rajutechie.streamkit.example.service;

import com.rajutechie.streamkit.RajutechieStreamKitClient;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;

/**
 * Generates and verifies RajutechieStreamKit user tokens via the platform SDK.
 *
 * The generated JWT is what the Flutter app passes to
 * {@code RajutechieStreamKit.connect(token)} so the user is authenticated with the
 * RajutechieStreamKit real-time infrastructure.
 */
@Service
public class TokenService {

    private final RajutechieStreamKitClient client;

    public TokenService(RajutechieStreamKitClient client) {
        this.client = client;
    }

    /**
     * Generate a RajutechieStreamKit token for a given user ID.
     * Default expiry: 24 hours.
     */
    public String generateUserToken(String userId) {
        return client.generateToken(userId, "user", Duration.ofHours(24));
    }

    /**
     * Generate a RajutechieStreamKit token with an explicit role and expiry.
     */
    public String generateUserToken(String userId, String role, Duration expiresIn) {
        return client.generateToken(userId, role, expiresIn);
    }

    /**
     * Verify and decode a RajutechieStreamKit token.
     */
    public Map<String, Object> verifyToken(String token) {
        return client.verifyToken(token);
    }
}
