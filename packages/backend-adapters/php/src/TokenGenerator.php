<?php

namespace RajutechieStreamKit;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class TokenGenerator
{
    private string $apiKey;
    private string $apiSecret;

    public function __construct(string $apiKey, string $apiSecret)
    {
        $this->apiKey = $apiKey;
        $this->apiSecret = $apiSecret;
    }

    public function generate(string $userId, string $role = 'user', int $expiresIn = 3600, ?array $grants = null): string
    {
        $now = time();
        $payload = [
            'sub' => $userId,
            'iss' => $this->apiKey,
            'iat' => $now,
            'exp' => $now + $expiresIn,
            'role' => $role,
        ];

        if ($grants) {
            $payload['grants'] = $grants;
        }

        return JWT::encode($payload, $this->apiSecret, 'HS256');
    }

    public function verify(string $token): object
    {
        return JWT::decode($token, new Key($this->apiSecret, 'HS256'));
    }
}
