package com.rajutechie.streamkit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RajutechieStreamKitAutoConfiguration {

    @Value("${rajutechie-streamkit.api-key:}")
    private String apiKey;

    @Value("${rajutechie-streamkit.api-secret:}")
    private String apiSecret;

    @Value("${rajutechie-streamkit.base-url:https://api.rajutechie-streamkit.io/v1}")
    private String baseUrl;

    @Bean
    @ConditionalOnMissingBean
    public RajutechieStreamKitClient streamKitClient() {
        return RajutechieStreamKitClient.builder()
                .apiKey(apiKey)
                .apiSecret(apiSecret)
                .baseUrl(baseUrl)
                .build();
    }

    @Bean
    @ConditionalOnMissingBean
    public TokenService tokenService() {
        return new TokenService(streamKitClient());
    }
}
