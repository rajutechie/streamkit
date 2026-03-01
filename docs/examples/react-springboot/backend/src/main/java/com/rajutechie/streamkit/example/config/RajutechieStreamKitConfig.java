package com.rajutechie.streamkit.example.config;

import com.rajutechie.streamkit.RajutechieStreamKitClient;
import com.rajutechie.streamkit.TokenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configures the RajutechieStreamKit client and token service beans.
 *
 * The API key and secret are read from application properties, which
 * default to development values but should be overridden via environment
 * variables in production.
 */
@Configuration
public class RajutechieStreamKitConfig {

    @Value("${rajutechie-streamkit.api-key}")
    private String apiKey;

    @Value("${rajutechie-streamkit.api-secret}")
    private String apiSecret;

    @Bean
    public RajutechieStreamKitClient rajutechieStreamKitClient() {
        return RajutechieStreamKitClient.builder()
                .apiKey(apiKey)
                .apiSecret(apiSecret)
                .build();
    }

    @Bean
    public TokenService rajutechieStreamKitTokenService(RajutechieStreamKitClient client) {
        return new TokenService(client);
    }
}
