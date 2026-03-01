package com.rajutechie.streamkit;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

public class RajutechieStreamKitClient {
    private final String apiKey;
    private final String apiSecret;
    private final String baseUrl;
    private final HttpClient httpClient;
    private final SecretKey signingKey;

    private RajutechieStreamKitClient(Builder builder) {
        this.apiKey = builder.apiKey;
        this.apiSecret = builder.apiSecret;
        this.baseUrl = builder.baseUrl != null ? builder.baseUrl : "https://api.rajutechie-streamkit.io/v1";
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(30)).build();
        this.signingKey = Keys.hmacShaKeyFor(apiSecret.getBytes(StandardCharsets.UTF_8));
    }

    public static Builder builder() {
        return new Builder();
    }

    public String generateToken(String userId, String role, Duration expiresIn) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId)
                .issuer(apiKey)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expiresIn)))
                .claim("role", role)
                .signWith(signingKey)
                .compact();
    }

    public Map<String, Object> verifyToken(String token) {
        var claims = Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(apiKey)
                .build()
                .parseSignedClaims(token);
        return claims.getPayload();
    }

    public ChatApi chat() {
        return new ChatApi(this);
    }

    String request(String method, String path, String body) throws Exception {
        var builder = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + path))
                .header("Content-Type", "application/json")
                .header("X-API-Key", apiKey)
                .header("X-API-Secret", apiSecret);

        HttpRequest request;
        if ("POST".equals(method)) {
            request = builder.POST(HttpRequest.BodyPublishers.ofString(body != null ? body : "")).build();
        } else if ("GET".equals(method)) {
            request = builder.GET().build();
        } else if ("DELETE".equals(method)) {
            request = builder.DELETE().build();
        } else {
            request = builder.method(method, HttpRequest.BodyPublishers.ofString(body != null ? body : "")).build();
        }

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            throw new RuntimeException("RajutechieStreamKit API error: " + response.body());
        }
        return response.body();
    }

    public static class Builder {
        private String apiKey;
        private String apiSecret;
        private String baseUrl;
        private Region region;

        public Builder apiKey(String apiKey) { this.apiKey = apiKey; return this; }
        public Builder apiSecret(String apiSecret) { this.apiSecret = apiSecret; return this; }
        public Builder baseUrl(String baseUrl) { this.baseUrl = baseUrl; return this; }
        public Builder region(Region region) { this.region = region; return this; }

        public RajutechieStreamKitClient build() {
            if (apiKey == null || apiSecret == null) {
                throw new IllegalArgumentException("apiKey and apiSecret are required");
            }
            return new RajutechieStreamKitClient(this);
        }
    }

    public enum Region {
        US_EAST_1, US_WEST_2, EU_WEST_1, AP_SOUTHEAST_1
    }

    public static class ChatApi {
        private final RajutechieStreamKitClient client;
        ChatApi(RajutechieStreamKitClient client) { this.client = client; }

        public String createChannel(ChannelConfig config) throws Exception {
            String json = String.format(
                "{\"type\":\"%s\",\"name\":\"%s\",\"members\":%s}",
                config.type(), config.name(), config.membersJson()
            );
            return client.request("POST", "/channels", json);
        }
    }

    public record ChannelConfig(String type, String name, java.util.List<String> members) {
        public static ChannelConfig group(String name, java.util.List<String> members) {
            return new ChannelConfig("group", name, members);
        }
        String membersJson() {
            return "[" + String.join(",", members.stream().map(m -> "\"" + m + "\"").toList()) + "]";
        }
    }
}
