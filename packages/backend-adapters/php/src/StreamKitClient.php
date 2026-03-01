<?php

namespace RajutechieStreamKit;

use GuzzleHttp\Client;

class RajutechieStreamKitClient
{
    private string $apiKey;
    private string $apiSecret;
    private Client $http;

    public function __construct(string $apiKey, string $apiSecret, string $baseUrl = 'https://api.rajutechie-streamkit.io/v1')
    {
        $this->apiKey = $apiKey;
        $this->apiSecret = $apiSecret;
        $this->http = new Client([
            'base_uri' => rtrim($baseUrl, '/') . '/',
            'headers' => [
                'Content-Type' => 'application/json',
                'X-API-Key' => $apiKey,
                'X-API-Secret' => $apiSecret,
            ],
            'timeout' => 30,
        ]);
    }

    public function generateToken(string $userId, string $role = 'user', int $expiresIn = 3600, ?array $grants = null): string
    {
        $generator = new TokenGenerator($this->apiKey, $this->apiSecret);
        return $generator->generate($userId, $role, $expiresIn, $grants);
    }

    public function chat(): ChatApi
    {
        return new ChatApi($this->http);
    }

    public function users(): UserApi
    {
        return new UserApi($this->http);
    }
}

class ChatApi
{
    private Client $http;

    public function __construct(Client $http)
    {
        $this->http = $http;
    }

    public function createChannel(string $type, ?string $name = null, ?array $members = null): array
    {
        $payload = ['type' => $type];
        if ($name) $payload['name'] = $name;
        if ($members) $payload['members'] = $members;

        $response = $this->http->post('channels', ['json' => $payload]);
        return json_decode($response->getBody()->getContents(), true);
    }

    public function sendMessage(string $channelId, ?string $text = null, ?array $attachments = null): array
    {
        $payload = [];
        if ($text) $payload['text'] = $text;
        if ($attachments) $payload['attachments'] = $attachments;

        $response = $this->http->post("channels/{$channelId}/messages", ['json' => $payload]);
        return json_decode($response->getBody()->getContents(), true);
    }
}

class UserApi
{
    private Client $http;

    public function __construct(Client $http)
    {
        $this->http = $http;
    }

    public function create(string $externalId, ?string $displayName = null): array
    {
        $payload = ['externalId' => $externalId];
        if ($displayName) $payload['displayName'] = $displayName;

        $response = $this->http->post('users', ['json' => $payload]);
        return json_decode($response->getBody()->getContents(), true);
    }

    public function get(string $userId): array
    {
        $response = $this->http->get("users/{$userId}");
        return json_decode($response->getBody()->getContents(), true);
    }
}
