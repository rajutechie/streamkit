# Backend Adapters Guide

RajutechieStreamKit provides official backend adapters for popular server frameworks. Each adapter wraps the RajutechieStreamKit REST API and provides framework-idiomatic patterns for token generation, webhook handling, and resource management.

---

## Table of Contents

- [Available Adapters](#available-adapters)
- [Django Adapter](#django-adapter)
- [FastAPI Adapter](#fastapi-adapter)
- [Spring Boot Adapter](#spring-boot-adapter)
- [Express Adapter](#express-adapter)
- [PHP Adapter](#php-adapter)

---

## Available Adapters

| Adapter | Language | Package |
|---------|----------|---------|
| Django | Python | `rajutechie-streamkit-django` |
| FastAPI | Python | `rajutechie-streamkit-fastapi` |
| Spring Boot | Java | `com.rajutechie.streamkit:rajutechie-streamkit-spring-boot` |
| Express | Node.js | `@rajutechie-streamkit/express` |
| PHP | PHP | `rajutechie-streamkit/rajutechie-streamkit-php` |

---

## Django Adapter

### Installation

```bash
pip install rajutechie-streamkit-django
```

### Configuration

Add to `settings.py`:

```python
RAJUTECHIE_STREAMKIT_API_KEY = "sk_live_xxxxx"
RAJUTECHIE_STREAMKIT_API_SECRET = "secret_xxxxx"
RAJUTECHIE_STREAMKIT_API_URL = "https://your-streamkit-domain.com"
```

### Client Usage

```python
from rajutechie_streamkit_django import RajutechieStreamKitClient

client = RajutechieStreamKitClient()
# Reads credentials from Django settings automatically

# Or pass credentials explicitly
client = RajutechieStreamKitClient(
    api_key="sk_live_xxxxx",
    api_secret="secret_xxxxx"
)
```

### Token Generation

```python
from rajutechie_streamkit_django.token import generate_user_token

token = generate_user_token(
    user_id="user_001",
    name="Alice",
    role="user",
    expires_in=3600  # seconds
)
```

### Chat Operations

```python
# Create a channel
channel = client.chat.create_channel(
    type="group",
    name="Team Alpha",
    members=["user_001", "user_002"],
    created_by="user_001"
)

# Send a message
message = client.chat.send_message(
    channel_id="ch_abc123",
    text="Hello from the server!"
)
```

### User Operations

```python
# Create a user
user = client.users.create(
    external_id="your-user-id",
    display_name="Alice Johnson",
    metadata={"department": "Engineering"}
)

# Get a user
user = client.users.get("user_001")
```

### Webhook Handling

```python
# views.py
from rajutechie_streamkit_django.webhooks import verify_webhook
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def webhook_handler(request):
    signature = request.headers.get("X-RajutechieStreamKit-Signature", "")
    event = verify_webhook(request.body, signature, "whsec_your_secret")

    if event["type"] == "message.new":
        process_message(event["data"])

    return JsonResponse({"status": "ok"})
```

### Django View Example

```python
# views.py
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from rajutechie_streamkit_django import RajutechieStreamKitClient
from rajutechie_streamkit_django.token import generate_user_token

client = RajutechieStreamKitClient()

@login_required
def get_token(request):
    token = generate_user_token(
        user_id=str(request.user.id),
        name=request.user.get_full_name(),
        role="user"
    )
    return JsonResponse({"token": token})

@login_required
def create_channel(request):
    import json
    body = json.loads(request.body)
    channel = client.chat.create_channel(
        type=body["type"],
        name=body.get("name"),
        members=body["members"],
        created_by=str(request.user.id)
    )
    return JsonResponse(channel)
```

### Middleware

```python
# middleware.py - Token validation middleware
from rajutechie_streamkit_django.middleware import RajutechieStreamKitAuthMiddleware

# Add to MIDDLEWARE in settings.py
MIDDLEWARE = [
    # ...
    'rajutechie_streamkit_django.middleware.RajutechieStreamKitAuthMiddleware',
]
```

---

## FastAPI Adapter

### Installation

```bash
pip install rajutechie-streamkit-fastapi
```

### Client Setup

```python
from rajutechie_streamkit_fastapi import RajutechieStreamKitClient

client = RajutechieStreamKitClient(
    api_key="sk_live_xxxxx",
    api_secret="secret_xxxxx"
)
```

### Token Generation

```python
from fastapi import FastAPI

app = FastAPI()

@app.post("/api/token")
async def generate_token(user_id: str):
    token = client.generate_token(user_id=user_id, role="user")
    return {"token": token}
```

### Dependency Injection

```python
from rajutechie_streamkit_fastapi import get_streamkit_client
from fastapi import Depends

@app.post("/api/channels")
async def create_channel(
    name: str,
    members: list[str],
    sk: RajutechieStreamKitClient = Depends(get_streamkit_client)
):
    channel = await sk.chat.create_channel(
        type="group", name=name, members=members
    )
    return channel
```

### Webhook Handling

```python
from fastapi import Request, HTTPException
from rajutechie_streamkit_fastapi.webhooks import verify_webhook

@app.post("/webhooks/rajutechie-streamkit")
async def handle_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("X-RajutechieStreamKit-Signature", "")

    try:
        event = verify_webhook(body, signature, "whsec_your_secret")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    match event["type"]:
        case "message.new":
            await handle_message(event["data"])
        case "call.ended":
            await handle_call_ended(event["data"])

    return {"status": "ok"}
```

---

## Spring Boot Adapter

### Installation

Add to `pom.xml`:

```xml
<dependency>
    <groupId>com.rajutechie.streamkit</groupId>
    <artifactId>rajutechie-streamkit-spring-boot</artifactId>
    <version>1.0.0</version>
</dependency>
```

Or `build.gradle.kts`:

```kotlin
implementation("com.rajutechie.streamkit:rajutechie-streamkit-spring-boot:1.0.0")
```

### Configuration

Add to `application.properties`:

```properties
rajutechie-streamkit.api-key=sk_live_xxxxx
rajutechie-streamkit.api-secret=secret_xxxxx
rajutechie-streamkit.api-url=https://your-streamkit-domain.com
rajutechie-streamkit.webhook-secret=whsec_your_secret
```

### Auto-Configuration

The adapter includes Spring Boot auto-configuration. The `RajutechieStreamKitClient` bean is automatically registered:

```java
@Configuration
public class RajutechieStreamKitConfig {
    @Bean
    public RajutechieStreamKitClient streamKitClient() {
        return RajutechieStreamKitClient.builder()
            .apiKey("sk_live_xxxxx")
            .apiSecret("secret_xxxxx")
            .apiUrl("https://your-streamkit-domain.com")
            .build();
    }
}
```

### Token Generation

```java
@RestController
@RequestMapping("/api")
public class AuthController {

    @Autowired
    private RajutechieStreamKitClient streamKit;

    @PostMapping("/token")
    public ResponseEntity<Map<String, String>> generateToken(
            @RequestParam String userId) {
        String token = streamKit.generateToken(userId, "user", Duration.ofHours(1));
        return ResponseEntity.ok(Map.of("token", token));
    }
}
```

### Token Verification

```java
Map<String, Object> claims = streamKit.verifyToken(token);
String userId = (String) claims.get("sub");
String role = (String) claims.get("role");
```

### Chat Operations

```java
@PostMapping("/channels")
public ResponseEntity<String> createChannel(@RequestBody CreateChannelRequest req) {
    String channel = streamKit.chat().createChannel(
        RajutechieStreamKitClient.ChannelConfig.group(req.getName(), req.getMembers())
    );
    return ResponseEntity.ok(channel);
}
```

### Webhook Handling

```java
@RestController
@RequestMapping("/webhooks")
public class WebhookController {

    @Value("${rajutechie-streamkit.webhook-secret}")
    private String webhookSecret;

    @PostMapping("/rajutechie-streamkit")
    public ResponseEntity<Void> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("X-RajutechieStreamKit-Signature") String signature) {

        // Verify and parse
        WebhookEvent event = RajutechieStreamKitWebhook.verify(payload, signature, webhookSecret);

        switch (event.getType()) {
            case "message.new" -> handleNewMessage(event.getData());
            case "call.ended" -> handleCallEnded(event.getData());
        }

        return ResponseEntity.ok().build();
    }
}
```

---

## Express Adapter

### Installation

```bash
npm install @rajutechie-streamkit/express
# or
pnpm add @rajutechie-streamkit/express
```

### Setup

```typescript
import express from 'express';
import { streamkitRouter, webhookMiddleware } from '@rajutechie-streamkit/express';

const app = express();

// Auto-configure routes for token generation and webhooks
app.use('/streamkit', streamkitRouter({
  apiKey:         process.env.RAJUTECHIE_STREAMKIT_API_KEY!,
  apiSecret:      process.env.RAJUTECHIE_STREAMKIT_API_SECRET!,
  apiUrl:         process.env.STREAMKIT_API_URL!,
  webhookSecret:  process.env.WEBHOOK_SECRET!,
}));
```

### Custom Routes

```typescript
import { RajutechieStreamKitServer } from '@rajutechie-streamkit/server-sdk';

const streamkit = new RajutechieStreamKitServer({
  apiKey:    process.env.RAJUTECHIE_STREAMKIT_API_KEY!,
  apiSecret: process.env.RAJUTECHIE_STREAMKIT_API_SECRET!,
  apiUrl:    process.env.STREAMKIT_API_URL!,
});

app.post('/api/token', (req, res) => {
  const token = streamkit.generateToken({
    userId: req.body.userId,
    role: 'user',
    expiresIn: '1h',
  });
  res.json({ token });
});
```

### Auth Middleware

```typescript
import { createAuthMiddleware } from '@rajutechie-streamkit/express';

const authMiddleware = createAuthMiddleware({
  apiKey: process.env.RAJUTECHIE_STREAMKIT_API_KEY!,
  apiSecret: process.env.RAJUTECHIE_STREAMKIT_API_SECRET!,
});

app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ userId: req.userId });
});
```

---

## PHP Adapter

### Installation

```bash
composer require rajutechie-streamkit/rajutechie-streamkit-php
```

### Client Setup

```php
use RajutechieStreamKit\RajutechieStreamKitClient;
use RajutechieStreamKit\TokenGenerator;

$client = new RajutechieStreamKitClient(
    apiKey: 'sk_live_xxxxx',
    apiSecret: 'secret_xxxxx'
);
```

### Token Generation

```php
$tokenGen = new TokenGenerator(
    apiKey: 'sk_live_xxxxx',
    apiSecret: 'secret_xxxxx'
);

$token = $tokenGen->generate(
    userId: 'user_001',
    role: 'user',
    expiresIn: 3600
);
```

### Webhook Verification

```php
use RajutechieStreamKit\WebhookHandler;

$handler = new WebhookHandler(secret: 'whsec_your_secret');

$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_RAJUTECHIE_STREAMKIT_SIGNATURE'] ?? '';

try {
    $event = $handler->verify($payload, $signature);
    // Process $event['type'] and $event['data']
    http_response_code(200);
    echo json_encode(['status' => 'ok']);
} catch (\Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
```

### Laravel Integration

```php
// routes/api.php
Route::post('/webhooks/rajutechie-streamkit', function (Request $request) {
    $handler = new WebhookHandler(secret: config('services.rajutechie-streamkit.webhook_secret'));
    $event = $handler->verify(
        $request->getContent(),
        $request->header('X-RajutechieStreamKit-Signature')
    );

    match ($event['type']) {
        'message.new' => ProcessMessage::dispatch($event['data']),
        'call.ended' => ProcessCallEnd::dispatch($event['data']),
        default => null,
    };

    return response()->json(['status' => 'ok']);
});
```
