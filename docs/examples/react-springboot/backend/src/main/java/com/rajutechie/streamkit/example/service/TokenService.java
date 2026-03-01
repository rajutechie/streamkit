package com.rajutechie.streamkit.example.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

/**
 * Generates and validates JWT tokens for both the application's own auth
 * and for RajutechieStreamKit user tokens.
 *
 * In this demo we use the RajutechieStreamKit API secret as the signing key so that
 * tokens are directly accepted by the RajutechieStreamKit SDK. In production you
 * would typically use the RajutechieStreamKit server SDK's TokenService for RajutechieStreamKit
 * tokens and a separate secret for application JWTs.
 */
@Service
public class TokenService {

    private final SecretKey signingKey;
    private final String apiKey;

    public TokenService(
            @Value("${rajutechie-streamkit.api-key}") String apiKey,
            @Value("${rajutechie-streamkit.api-secret}") String apiSecret
    ) {
        this.apiKey = apiKey;
        // Pad the secret to at least 32 bytes for HMAC-SHA256
        String paddedSecret = apiSecret;
        while (paddedSecret.getBytes(StandardCharsets.UTF_8).length < 32) {
            paddedSecret = paddedSecret + paddedSecret;
        }
        this.signingKey = Keys.hmacShaKeyFor(
                paddedSecret.substring(0, Math.max(32, paddedSecret.length()))
                        .getBytes(StandardCharsets.UTF_8)
        );
    }

    /**
     * Generate a RajutechieStreamKit-compatible user token.
     */
    public String generateRajutechieStreamKitToken(String userId, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId)
                .issuer(apiKey)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(Duration.ofHours(24))))
                .claim("role", role)
                .claim("grants", Map.of(
                        "chat", Map.of("read", true, "write", true),
                        "call", Map.of("start", true, "join", true),
                        "stream", Map.of("create", true, "watch", true)
                ))
                .signWith(signingKey)
                .compact();
    }

    /**
     * Generate an application-level auth token used for API requests.
     */
    public String generateAuthToken(String userId, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId)
                .issuer("rajutechie-streamkit-example")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(Duration.ofHours(24))))
                .claim("role", role)
                .claim("type", "auth")
                .signWith(signingKey)
                .compact();
    }

    /**
     * Validate an auth token and extract claims.
     */
    public TokenClaims validateToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            return new TokenClaims(
                    claims.getSubject(),
                    claims.get("role", String.class)
            );
        } catch (JwtException e) {
            throw new IllegalArgumentException("Invalid token: " + e.getMessage(), e);
        }
    }

    public record TokenClaims(String userId, String role) {}
}
