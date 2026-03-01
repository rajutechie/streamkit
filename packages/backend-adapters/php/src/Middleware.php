<?php

namespace RajutechieStreamKit;

class Middleware
{
    private TokenGenerator $tokenGenerator;

    public function __construct(string $apiKey, string $apiSecret)
    {
        $this->tokenGenerator = new TokenGenerator($apiKey, $apiSecret);
    }

    public function authenticate(callable $next): callable
    {
        return function ($request) use ($next) {
            $authHeader = $request->getHeaderLine('Authorization');
            if (str_starts_with($authHeader, 'Bearer ')) {
                $token = substr($authHeader, 7);
                try {
                    $decoded = $this->tokenGenerator->verify($token);
                    $request = $request->withAttribute('rajutechie-streamkit_user', $decoded);
                } catch (\Exception $e) {
                    // Invalid token — continue without user
                }
            }
            return $next($request);
        };
    }
}
