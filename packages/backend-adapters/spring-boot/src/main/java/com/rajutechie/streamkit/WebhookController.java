package com.rajutechie.streamkit;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@RestController
@RequestMapping("/webhooks")
public class WebhookController {

    private final String webhookSecret;

    public WebhookController(@org.springframework.beans.factory.annotation.Value("${rajutechie-streamkit.webhook-secret:}") String webhookSecret) {
        this.webhookSecret = webhookSecret;
    }

    @PostMapping("/rajutechie-streamkit")
    public ResponseEntity<Void> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("X-RajutechieStreamKit-Signature") String signature) {

        if (!verifySignature(payload, signature)) {
            return ResponseEntity.badRequest().build();
        }

        // Process webhook event
        return ResponseEntity.ok().build();
    }

    private boolean verifySignature(String payload, String signature) {
        try {
            String[] parts = signature.split(",");
            String timestamp = null;
            String sig = null;
            for (String part : parts) {
                if (part.startsWith("t=")) timestamp = part.substring(2);
                if (part.startsWith("v1=")) sig = part.substring(3);
            }
            if (timestamp == null || sig == null) return false;

            long ts = Long.parseLong(timestamp);
            long now = System.currentTimeMillis() / 1000;
            if (Math.abs(now - ts) > 300) return false;

            String signedPayload = timestamp + "." + payload;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(signedPayload.getBytes(StandardCharsets.UTF_8));
            String computed = bytesToHex(hash);

            return MessageDigest.isEqual(computed.getBytes(), sig.getBytes());
        } catch (Exception e) {
            return false;
        }
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
