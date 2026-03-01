<?php

namespace RajutechieStreamKit;

class WebhookHandler
{
    private string $secret;
    private int $tolerance;

    public function __construct(string $secret, int $tolerance = 300)
    {
        $this->secret = $secret;
        $this->tolerance = $tolerance;
    }

    public function verify(string $payload, string $signature): array
    {
        $parts = [];
        foreach (explode(',', $signature) as $part) {
            $kv = explode('=', $part, 2);
            if (count($kv) === 2) {
                $parts[$kv[0]] = $kv[1];
            }
        }

        $timestamp = $parts['t'] ?? '';
        $sig = $parts['v1'] ?? '';

        if (!$timestamp || !$sig) {
            throw new \InvalidArgumentException('Invalid webhook signature format');
        }

        $ts = (int) $timestamp;
        $now = time();
        if (abs($now - $ts) > $this->tolerance) {
            throw new \RuntimeException('Webhook timestamp outside tolerance');
        }

        $signedPayload = $timestamp . '.' . $payload;
        $expected = hash_hmac('sha256', $signedPayload, $this->secret);

        if (!hash_equals($expected, $sig)) {
            throw new \RuntimeException('Webhook signature verification failed');
        }

        return json_decode($payload, true);
    }
}
