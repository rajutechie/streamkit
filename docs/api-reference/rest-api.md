# RajutechieStreamKit REST API Reference

**Base URL:** `https://api.rajutechie-streamkit.io/v1`

All requests must include the `Content-Type: application/json` header for request bodies and authenticate with either a Bearer token or an API key, as described in the Authentication section below.

---

## Table of Contents

- [Authentication](#authentication)
- [Users](#users)
- [Channels](#channels)
- [Messages](#messages)
- [Calls](#calls)
- [Meetings](#meetings)
- [Live Streams](#live-streams)
- [Media](#media)
- [Webhooks](#webhooks)
- [Pagination](#pagination)
- [Rate Limiting](#rate-limiting)
- [Error Format](#error-format)

---

## Authentication

RajutechieStreamKit uses JWT-based authentication. Obtain a token pair by exchanging your API key and secret, then include the access token as a Bearer token in subsequent requests.

### Common Headers

| Header          | Description                              | Required |
|-----------------|------------------------------------------|----------|
| `Authorization` | `Bearer <access_token>`                  | Yes (most endpoints) |
| `X-API-Key`     | Your application API key                 | Alternative to Bearer |
| `Content-Type`  | `application/json`                       | Yes (for request bodies) |
| `X-User-Id`     | The acting user's ID (server-side calls) | Conditional |

---

### POST /auth/token

Generate a JWT access token and refresh token pair.

**Request Body:**

```json
{
  "apiKey": "sk_dev_rajutechie-streamkit_001",
  "apiSecret": "dev_secret_001_change_me_in_production",
  "userId": "user_abc123",
  "role": "admin",
  "grants": {
    "canPublish": true,
    "canSubscribe": true,
    "canModerate": false
  }
}
```

| Field       | Type   | Required | Description                                  |
|-------------|--------|----------|----------------------------------------------|
| `apiKey`    | string | Yes      | Your application API key                     |
| `apiSecret` | string | Yes      | Your application API secret                  |
| `userId`    | string | Yes      | The user ID to associate with the token      |
| `role`      | string | No       | Role claim embedded in the token             |
| `grants`    | object | No       | Key-value permissions embedded in the token  |

**Response `200 OK`:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "1h",
  "tokenType": "Bearer"
}
```

**Error Responses:**

| Status | Body                                      | Condition                    |
|--------|-------------------------------------------|------------------------------|
| 400    | `{ "error": "apiKey is required" }`       | Missing required fields      |
| 401    | `{ "error": "Invalid API key" }`          | API key not recognized       |
| 401    | `{ "error": "Invalid API secret" }`       | Secret does not match        |
| 403    | `{ "error": "API key is deactivated" }`   | Key has been disabled        |

---

### POST /auth/refresh

Exchange a valid refresh token for a new access/refresh token pair. The old refresh token is blacklisted upon successful exchange.

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `200 OK`:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "1h",
  "tokenType": "Bearer"
}
```

**Error Responses:**

| Status | Body                                                    | Condition                        |
|--------|---------------------------------------------------------|----------------------------------|
| 400    | `{ "error": "Provided token is not a refresh token" }`  | Access token submitted instead   |
| 401    | `{ "error": "Invalid or expired refresh token" }`       | Token malformed or expired       |
| 401    | `{ "error": "Refresh token has been revoked" }`         | Token previously revoked/used    |

---

### POST /auth/revoke

Revoke a token by adding its JTI to the blacklist. Works with both access and refresh tokens, including already-expired tokens.

**Request Body:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `200 OK`:**

```json
{
  "revoked": true
}
```

**Error Responses:**

| Status | Body                               | Condition                 |
|--------|------------------------------------|---------------------------|
| 400    | `{ "error": "Malformed token" }`   | Token cannot be decoded   |
| 400    | `{ "error": "token is required" }` | Missing token field       |

---

### POST /auth/oauth/authorize

Initiate an OAuth2 authorization flow. Redirects the user to the identity provider.

**Query Parameters:**

| Parameter       | Type   | Required | Description                          |
|-----------------|--------|----------|--------------------------------------|
| `response_type` | string | Yes      | Must be `code`                       |
| `client_id`     | string | Yes      | Your OAuth2 client ID                |
| `redirect_uri`  | string | Yes      | Callback URL after authorization     |
| `scope`         | string | No       | Space-separated list of scopes       |
| `state`         | string | Yes      | CSRF protection token                |

**Response `302 Found`:** Redirects to the identity provider login page.

---

### POST /auth/oauth/token

Exchange an OAuth2 authorization code for a RajutechieStreamKit token pair.

**Request Body:**

```json
{
  "grant_type": "authorization_code",
  "code": "auth_code_from_redirect",
  "redirect_uri": "https://yourapp.com/callback",
  "client_id": "your_oauth_client_id",
  "client_secret": "your_oauth_client_secret"
}
```

**Response `200 OK`:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "1h",
  "tokenType": "Bearer"
}
```

---

## Users

Manage user profiles and their devices. Users are identified by an internal `id` (UUID) and can be looked up or upserted via an `externalId` you provide.

### POST /users

Create a new user or update an existing user by `externalId` (upsert). Returns `201` for creation, `200` for update.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "externalId": "external_user_42",
  "displayName": "Jane Doe",
  "avatarUrl": "https://cdn.example.com/avatars/jane.png",
  "metadata": {
    "department": "engineering",
    "timezone": "America/New_York"
  },
  "role": "admin"
}
```

| Field         | Type   | Required | Description                                |
|---------------|--------|----------|--------------------------------------------|
| `externalId`  | string | Yes      | Your application's unique user identifier  |
| `displayName` | string | No       | Display name (max 256 chars). Defaults to `externalId` |
| `avatarUrl`   | string | No       | URL to the user's avatar image             |
| `metadata`    | object | No       | Arbitrary key-value pairs                  |
| `role`        | string | No       | User role (max 64 chars). Defaults to `"user"` |

**Response `201 Created` (new user):**

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "externalId": "external_user_42",
  "displayName": "Jane Doe",
  "avatarUrl": "https://cdn.example.com/avatars/jane.png",
  "metadata": {
    "department": "engineering",
    "timezone": "America/New_York"
  },
  "role": "admin",
  "isActive": true,
  "lastActiveAt": null,
  "createdAt": "2026-02-12T10:30:00.000Z",
  "updatedAt": "2026-02-12T10:30:00.000Z"
}
```

**Response `200 OK` (updated existing user):** Same shape as above with updated fields.

**Error Responses:**

| Status | Body                                        | Condition                   |
|--------|---------------------------------------------|-----------------------------|
| 400    | `{ "error": "externalId is required" }`     | Missing `externalId`        |
| 401    | `{ "error": "Unauthorized" }`               | Invalid or missing token    |

---

### GET /users/:id

Retrieve a user profile by internal ID. Returns `404` for inactive (deactivated) users.

**Response `200 OK`:**

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "externalId": "external_user_42",
  "displayName": "Jane Doe",
  "avatarUrl": "https://cdn.example.com/avatars/jane.png",
  "metadata": {
    "department": "engineering",
    "timezone": "America/New_York"
  },
  "role": "admin",
  "isActive": true,
  "lastActiveAt": "2026-02-12T10:45:00.000Z",
  "createdAt": "2026-02-12T10:30:00.000Z",
  "updatedAt": "2026-02-12T10:45:00.000Z"
}
```

**Error Responses:**

| Status | Body                             | Condition                           |
|--------|----------------------------------|-------------------------------------|
| 404    | `{ "error": "User not found" }`  | User does not exist or is inactive  |

---

### PATCH /users/:id

Partially update a user profile. Only provided fields are updated.

**Request Body:**

```json
{
  "displayName": "Jane D.",
  "avatarUrl": null,
  "metadata": { "timezone": "Europe/London" },
  "role": "moderator"
}
```

| Field         | Type          | Required | Description                      |
|---------------|---------------|----------|----------------------------------|
| `displayName` | string        | No       | Updated display name             |
| `avatarUrl`   | string\|null  | No       | Updated avatar URL or `null` to clear |
| `metadata`    | object        | No       | Merged with existing metadata    |
| `role`        | string        | No       | Updated role                     |

**Response `200 OK`:** Returns the full updated user object.

**Error Responses:**

| Status | Body                             | Condition                |
|--------|----------------------------------|--------------------------|
| 404    | `{ "error": "User not found" }`  | User not found or inactive |

---

### DELETE /users/:id

Deactivate a user (soft delete). Sets `isActive` to `false`. The user cannot be retrieved via GET after deactivation.

**Response `200 OK`:**

```json
{
  "deleted": true
}
```

**Error Responses:**

| Status | Body                             | Condition                |
|--------|----------------------------------|--------------------------|
| 404    | `{ "error": "User not found" }`  | User not found or already inactive |

---

### GET /users/:id/devices

List all registered devices for a user.

**Response `200 OK`:**

```json
{
  "userId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "devices": [
    {
      "deviceId": "device_iphone_12",
      "userId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "platform": "ios",
      "pushToken": "apns_token_abc123...",
      "pushProvider": "apns",
      "createdAt": "2026-02-12T10:30:00.000Z",
      "updatedAt": "2026-02-12T10:30:00.000Z"
    },
    {
      "deviceId": "device_chrome_browser",
      "userId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "platform": "web",
      "pushToken": null,
      "pushProvider": null,
      "createdAt": "2026-02-12T11:00:00.000Z",
      "updatedAt": "2026-02-12T11:00:00.000Z"
    }
  ],
  "total": 2
}
```

---

### POST /users/:id/devices

Register a new device for a user, or update an existing one if a device with the same `deviceId` already exists.

**Request Body:**

```json
{
  "deviceId": "device_iphone_12",
  "platform": "ios",
  "pushToken": "apns_token_abc123...",
  "pushProvider": "apns"
}
```

| Field          | Type   | Required | Description                                      |
|----------------|--------|----------|--------------------------------------------------|
| `deviceId`     | string | Yes      | Unique device identifier                         |
| `platform`     | string | Yes      | One of: `ios`, `android`, `web`, `desktop`       |
| `pushToken`    | string | No       | Push notification token                          |
| `pushProvider` | string | No       | One of: `apns`, `fcm`, `hms`, `webpush`         |

**Response `201 Created` (new device) / `200 OK` (updated existing):**

```json
{
  "deviceId": "device_iphone_12",
  "userId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "platform": "ios",
  "pushToken": "apns_token_abc123...",
  "pushProvider": "apns",
  "createdAt": "2026-02-12T10:30:00.000Z",
  "updatedAt": "2026-02-12T10:30:00.000Z"
}
```

---

### DELETE /users/:id/devices/:deviceId

Remove a registered device.

**Response `200 OK`:**

```json
{
  "deleted": true
}
```

**Error Responses:**

| Status | Body                               | Condition            |
|--------|------------------------------------|----------------------|
| 404    | `{ "error": "Device not found" }`  | Device does not exist |

---

## Channels

Channels are the containers for messaging. Supported types are `direct`, `group`, `public`, and `private`.

### POST /channels

Create a new channel.

**Request Body:**

```json
{
  "type": "group",
  "name": "Engineering Team",
  "description": "Channel for engineering discussions",
  "members": ["user_001", "user_002", "user_003"],
  "metadata": {
    "team": "platform"
  },
  "settings": {
    "readOnly": false,
    "maxMembers": 200
  }
}
```

| Field         | Type     | Required | Description                                           |
|---------------|----------|----------|-------------------------------------------------------|
| `type`        | string   | Yes      | One of: `direct`, `group`, `public`, `private`        |
| `name`        | string   | No       | Channel name (1-100 chars)                            |
| `description` | string   | No       | Channel description (max 500 chars)                   |
| `members`     | string[] | No       | Array of initial member user IDs. Defaults to `[]`    |
| `metadata`    | object   | No       | Custom metadata key-value pairs                       |
| `settings`    | object   | No       | Channel-level settings                                |

**Response `201 Created`:**

```json
{
  "id": "a1b2c3d4-5678-9012-3456-789abcdef012",
  "type": "group",
  "name": "Engineering Team",
  "description": "Channel for engineering discussions",
  "members": ["user_001", "user_002", "user_003"],
  "memberCount": 3,
  "metadata": { "team": "platform" },
  "settings": { "readOnly": false, "maxMembers": 200 },
  "createdBy": "user_001",
  "createdAt": "2026-02-12T10:30:00.000Z",
  "updatedAt": "2026-02-12T10:30:00.000Z"
}
```

---

### GET /channels

List channels with optional filters. Uses cursor-based pagination.

**Query Parameters:**

| Parameter  | Type   | Default | Description                                |
|------------|--------|---------|--------------------------------------------|
| `type`     | string | --      | Filter by channel type                     |
| `memberId` | string | --      | Filter channels containing this member     |
| `limit`    | number | 25      | Results per page (1-100)                   |
| `after`    | string | --      | Cursor: channel ID to start after          |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "a1b2c3d4-5678-9012-3456-789abcdef012",
      "type": "group",
      "name": "Engineering Team",
      "description": "Channel for engineering discussions",
      "members": ["user_001", "user_002", "user_003"],
      "memberCount": 3,
      "metadata": { "team": "platform" },
      "settings": {},
      "createdBy": "user_001",
      "createdAt": "2026-02-12T10:30:00.000Z",
      "updatedAt": "2026-02-12T10:30:00.000Z"
    }
  ],
  "total": 42,
  "hasNext": true,
  "cursors": {
    "after": "a1b2c3d4-5678-9012-3456-789abcdef012"
  }
}
```

---

### GET /channels/:id

Get a single channel by ID.

**Response `200 OK`:** Returns the full channel object.

**Error Responses:**

| Status | Body                                  | Condition             |
|--------|---------------------------------------|-----------------------|
| 404    | `{ "error": "Channel not found" }`    | Channel does not exist |

---

### PATCH /channels/:id

Update channel properties. Only provided fields are modified. Metadata and settings are shallowly merged with existing values.

**Request Body:**

```json
{
  "name": "Engineering & DevOps",
  "description": "Updated description",
  "metadata": { "priority": "high" },
  "settings": { "readOnly": true }
}
```

**Response `200 OK`:** Returns the full updated channel object.

---

### DELETE /channels/:id

Permanently delete a channel and all its member associations.

**Response `204 No Content`:** Empty body on success.

**Error Responses:**

| Status | Body                                  | Condition             |
|--------|---------------------------------------|-----------------------|
| 404    | `{ "error": "Channel not found" }`    | Channel does not exist |

---

### POST /channels/:id/members

Add one or more members to a channel. Duplicate members are silently skipped.

**Request Body:**

```json
{
  "members": [
    { "userId": "user_004", "role": "member" },
    { "userId": "user_005", "role": "admin" }
  ]
}
```

| Field                | Type   | Required | Description                                        |
|----------------------|--------|----------|----------------------------------------------------|
| `members`            | array  | Yes      | At least one member entry                          |
| `members[].userId`   | string | Yes      | User ID to add                                     |
| `members[].role`     | string | No       | One of: `owner`, `admin`, `moderator`, `member`. Defaults to `member` |

**Response `201 Created`:**

```json
[
  {
    "userId": "user_004",
    "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
    "role": "member",
    "muted": false,
    "banned": false,
    "joinedAt": "2026-02-12T11:00:00.000Z",
    "updatedAt": "2026-02-12T11:00:00.000Z"
  },
  {
    "userId": "user_005",
    "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
    "role": "admin",
    "muted": false,
    "banned": false,
    "joinedAt": "2026-02-12T11:00:00.000Z",
    "updatedAt": "2026-02-12T11:00:00.000Z"
  }
]
```

---

### GET /channels/:id/members

List members of a channel with cursor-based pagination.

**Query Parameters:**

| Parameter | Type   | Default | Description                         |
|-----------|--------|---------|-------------------------------------|
| `limit`   | number | 25      | Results per page (1-100)            |
| `after`   | string | --      | Cursor: user ID to start after      |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "userId": "user_001",
      "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
      "role": "owner",
      "muted": false,
      "banned": false,
      "joinedAt": "2026-02-12T10:30:00.000Z",
      "updatedAt": "2026-02-12T10:30:00.000Z"
    }
  ],
  "total": 5,
  "hasNext": true,
  "cursors": {
    "after": "user_001"
  }
}
```

---

### PATCH /channels/:id/members/:uid

Update a channel member's role, mute, or ban status.

**Request Body:**

```json
{
  "role": "moderator",
  "muted": true,
  "banned": false
}
```

| Field    | Type    | Required | Description                                         |
|----------|---------|----------|-----------------------------------------------------|
| `role`   | string  | No       | One of: `owner`, `admin`, `moderator`, `member`     |
| `muted`  | boolean | No       | Whether the member is muted                         |
| `banned` | boolean | No       | Whether the member is banned                        |

**Response `200 OK`:** Returns the updated member object.

**Error Responses:**

| Status | Body                                | Condition           |
|--------|-------------------------------------|---------------------|
| 404    | `{ "error": "Channel not found" }`  | Channel does not exist |
| 404    | `{ "error": "Member not found" }`   | User is not a member  |

---

### DELETE /channels/:id/members/:uid

Remove a member from the channel.

**Response `204 No Content`:** Empty body on success.

**Error Responses:**

| Status | Body                                | Condition           |
|--------|-------------------------------------|---------------------|
| 404    | `{ "error": "Channel not found" }`  | Channel does not exist |
| 404    | `{ "error": "Member not found" }`   | User is not a member  |

---

## Messages

Send, receive, search, and manage messages within channels.

### POST /channels/:id/messages

Send a message to a channel. Must contain either `text` or at least one attachment.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
X-User-Id: user_001
```

**Request Body:**

```json
{
  "text": "Hello everyone! Here's the design spec.",
  "attachments": [
    {
      "type": "file",
      "url": "https://cdn.rajutechie-streamkit.io/files/design_spec.pdf",
      "name": "design_spec.pdf",
      "size": 2048576,
      "mimeType": "application/pdf"
    }
  ],
  "replyTo": "msg_previous_id",
  "threadId": "thread_parent_id",
  "mentions": ["user_002", "user_003"]
}
```

| Field          | Type     | Required | Description                                 |
|----------------|----------|----------|---------------------------------------------|
| `text`         | string   | No       | Message text (max 5000 chars)               |
| `attachments`  | array    | No       | File attachments (defaults to `[]`)         |
| `replyTo`      | string   | No       | UUID of the message being replied to        |
| `threadId`     | string   | No       | UUID of the parent thread message           |
| `mentions`     | string[] | No       | User IDs mentioned in the message           |

**Attachment Object:**

| Field      | Type   | Required | Description            |
|------------|--------|----------|------------------------|
| `type`     | string | Yes      | Attachment type (e.g., `file`, `image`, `video`) |
| `url`      | string | Yes      | Valid URL to the attachment |
| `name`     | string | No       | Filename               |
| `size`     | number | No       | File size in bytes     |
| `mimeType` | string | No       | MIME type              |

**Response `201 Created`:**

```json
{
  "id": "b2c3d4e5-6789-0123-4567-89abcdef0123",
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
  "senderId": "user_001",
  "text": "Hello everyone! Here's the design spec.",
  "attachments": [
    {
      "type": "file",
      "url": "https://cdn.rajutechie-streamkit.io/files/design_spec.pdf",
      "name": "design_spec.pdf",
      "size": 2048576,
      "mimeType": "application/pdf"
    }
  ],
  "replyTo": "msg_previous_id",
  "threadId": "thread_parent_id",
  "mentions": ["user_002", "user_003"],
  "reactions": [],
  "readBy": ["user_001"],
  "isEdited": false,
  "isDeleted": false,
  "createdAt": "2026-02-12T10:30:00.000Z",
  "updatedAt": "2026-02-12T10:30:00.000Z"
}
```

**Error Responses:**

| Status | Body                                                              | Condition                         |
|--------|-------------------------------------------------------------------|-----------------------------------|
| 400    | `{ "error": "Message must have text or at least one attachment" }`| Both text and attachments empty   |

---

### GET /channels/:id/messages

List messages in a channel with cursor-based pagination. Soft-deleted messages are excluded.

**Query Parameters:**

| Parameter | Type   | Default | Description                                |
|-----------|--------|---------|--------------------------------------------|
| `limit`   | number | 25      | Results per page (1-100)                   |
| `after`   | string | --      | Message ID cursor: return messages after this ID |
| `before`  | string | --      | Message ID cursor: return messages before this ID |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "b2c3d4e5-6789-0123-4567-89abcdef0123",
      "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
      "senderId": "user_001",
      "text": "Hello everyone!",
      "attachments": [],
      "mentions": [],
      "reactions": [
        { "emoji": "thumbsup", "users": ["user_002"], "count": 1 }
      ],
      "readBy": ["user_001", "user_002"],
      "isEdited": false,
      "isDeleted": false,
      "createdAt": "2026-02-12T10:30:00.000Z",
      "updatedAt": "2026-02-12T10:30:00.000Z"
    }
  ],
  "total": 150,
  "hasNext": true,
  "cursors": {
    "before": "b2c3d4e5-6789-0123-4567-89abcdef0123",
    "after": "b2c3d4e5-6789-0123-4567-89abcdef0123"
  }
}
```

---

### GET /channels/:id/messages/:mid

Get a single message by ID.

**Response `200 OK`:** Returns the full message object.

**Error Responses:**

| Status | Body                                 | Condition              |
|--------|--------------------------------------|------------------------|
| 404    | `{ "error": "Message not found" }`   | Message does not exist |

---

### PATCH /channels/:id/messages/:mid

Edit a message's text. Sets `isEdited` to `true` and records `editedAt`.

**Request Body:**

```json
{
  "text": "Updated message content"
}
```

| Field  | Type   | Required | Description                          |
|--------|--------|----------|--------------------------------------|
| `text` | string | Yes      | New message text (1-5000 chars)      |

**Response `200 OK`:**

```json
{
  "id": "b2c3d4e5-6789-0123-4567-89abcdef0123",
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
  "senderId": "user_001",
  "text": "Updated message content",
  "attachments": [],
  "mentions": [],
  "reactions": [],
  "readBy": ["user_001"],
  "isEdited": true,
  "editedAt": "2026-02-12T11:00:00.000Z",
  "isDeleted": false,
  "createdAt": "2026-02-12T10:30:00.000Z",
  "updatedAt": "2026-02-12T11:00:00.000Z"
}
```

**Error Responses:**

| Status | Body                                                  | Condition              |
|--------|-------------------------------------------------------|------------------------|
| 400    | `{ "error": "Cannot edit a deleted message" }`        | Message is soft-deleted |
| 404    | `{ "error": "Message not found" }`                    | Message does not exist |

---

### DELETE /channels/:id/messages/:mid

Soft-delete a message. Sets `isDeleted` to `true` and records `deletedAt`. The message is excluded from list queries but the record is retained.

**Response `204 No Content`:** Empty body on success.

**Error Responses:**

| Status | Body                                 | Condition              |
|--------|--------------------------------------|------------------------|
| 404    | `{ "error": "Message not found" }`   | Message does not exist |

---

### POST /channels/:id/messages/:mid/reactions

Add a reaction emoji to a message. Each user can only add each emoji once.

**Request Body:**

```json
{
  "emoji": "thumbsup"
}
```

**Response `200 OK`:** Returns the full message object with the updated `reactions` array.

**Error Responses:**

| Status | Body                                                    | Condition              |
|--------|---------------------------------------------------------|------------------------|
| 400    | `{ "error": "Cannot react to a deleted message" }`     | Message is soft-deleted |
| 404    | `{ "error": "Message not found" }`                     | Message does not exist |

---

### DELETE /channels/:id/messages/:mid/reactions/:emoji

Remove the current user's reaction for the specified emoji.

**Response `200 OK`:** Returns the full message object with the updated `reactions` array. Empty reactions are automatically removed.

**Error Responses:**

| Status | Body                                 | Condition              |
|--------|--------------------------------------|------------------------|
| 404    | `{ "error": "Message not found" }`   | Message does not exist |

---

### POST /channels/:id/messages/:mid/read

Mark a message as read by the current user. The user is added to the `readBy` array if not already present.

**Response `200 OK`:**

```json
{
  "read": true
}
```

---

### GET /channels/:id/messages/search

Search messages within a channel by text content. Case-insensitive. Returns results sorted newest first.

**Query Parameters:**

| Parameter | Type   | Required | Description        |
|-----------|--------|----------|--------------------|
| `query`   | string | Yes      | Search query text  |

Alternative parameter name: `q`

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "b2c3d4e5-6789-0123-4567-89abcdef0123",
      "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
      "senderId": "user_001",
      "text": "Here is the design spec we discussed",
      "attachments": [],
      "mentions": [],
      "reactions": [],
      "readBy": ["user_001"],
      "isEdited": false,
      "isDeleted": false,
      "createdAt": "2026-02-12T10:30:00.000Z",
      "updatedAt": "2026-02-12T10:30:00.000Z"
    }
  ],
  "total": 3,
  "query": "design spec"
}
```

**Error Responses:**

| Status | Body                                                          | Condition           |
|--------|---------------------------------------------------------------|---------------------|
| 400    | `{ "error": "Search query is required (use ?query=...)" }`   | Missing query param |

---

## Calls

Initiate and manage audio/video calls between users.

### POST /calls

Initiate a new call. The initiator is automatically added as a connected participant with the `caller` role.

**Request Body:**

```json
{
  "type": "video",
  "participants": ["user_002", "user_003"],
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
  "metadata": {
    "source": "channel_header_button"
  }
}
```

| Field          | Type     | Required | Description                                    |
|----------------|----------|----------|------------------------------------------------|
| `type`         | string   | Yes      | One of: `audio`, `video`                       |
| `participants` | string[] | Yes      | User IDs to invite (minimum 1)                 |
| `channelId`    | string   | No       | UUID of the associated channel                 |
| `metadata`     | object   | No       | Custom metadata                                |

**Response `201 Created`:**

```json
{
  "id": "c3d4e5f6-7890-1234-5678-9abcdef01234",
  "type": "video",
  "status": "ringing",
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
  "initiatedBy": "user_001",
  "metadata": { "source": "channel_header_button" },
  "recordingStatus": "none",
  "startedAt": "2026-02-12T10:30:00.000Z",
  "createdAt": "2026-02-12T10:30:00.000Z",
  "updatedAt": "2026-02-12T10:30:00.000Z",
  "participants": [
    {
      "id": "p_001",
      "callId": "c3d4e5f6-7890-1234-5678-9abcdef01234",
      "userId": "user_001",
      "status": "connected",
      "role": "caller",
      "joinedAt": "2026-02-12T10:30:00.000Z",
      "updatedAt": "2026-02-12T10:30:00.000Z"
    },
    {
      "id": "p_002",
      "callId": "c3d4e5f6-7890-1234-5678-9abcdef01234",
      "userId": "user_002",
      "status": "ringing",
      "role": "callee",
      "joinedAt": "2026-02-12T10:30:00.000Z",
      "updatedAt": "2026-02-12T10:30:00.000Z"
    }
  ]
}
```

---

### GET /calls/:id

Get call details including all participants.

**Response `200 OK`:** Returns the call object with the `participants` array.

**Error Responses:**

| Status | Body                             | Condition           |
|--------|----------------------------------|---------------------|
| 404    | `{ "error": "Call not found" }`  | Call does not exist  |

---

### POST /calls/:id/accept

Accept an incoming call. Transitions the call from `ringing` to `active` and the accepting participant's status to `connected`.

**Response `200 OK`:** Returns the updated call object with participants.

**Error Responses:**

| Status | Body                                       | Condition            |
|--------|--------------------------------------------|----------------------|
| 400    | `{ "error": "Call has already ended" }`    | Call already ended   |
| 400    | `{ "error": "Call is already active" }`    | Call already accepted |
| 404    | `{ "error": "Call not found" }`            | Call does not exist  |

---

### POST /calls/:id/reject

Reject an incoming call. Ends the call with reason `declined` and marks all participants as `left`.

**Response `200 OK`:** Returns the updated call object with participants.

**Error Responses:**

| Status | Body                                       | Condition           |
|--------|--------------------------------------------|---------------------|
| 400    | `{ "error": "Call has already ended" }`    | Call already ended  |
| 404    | `{ "error": "Call not found" }`            | Call does not exist |

---

### POST /calls/:id/end

End an active call. Sets the call status to `ended` with reason `completed` and marks all remaining participants as `left`.

**Response `200 OK`:** Returns the updated call object.

**Error Responses:**

| Status | Body                                       | Condition           |
|--------|--------------------------------------------|---------------------|
| 400    | `{ "error": "Call has already ended" }`    | Call already ended  |
| 404    | `{ "error": "Call not found" }`            | Call does not exist |

---

### POST /calls/:id/recording/start

Start recording an active call. The call must be in `active` status.

**Response `200 OK`:**

```json
{
  "recording": true
}
```

**Error Responses:**

| Status | Body                                                      | Condition                  |
|--------|-----------------------------------------------------------|----------------------------|
| 400    | `{ "error": "Call must be active to start recording" }`   | Call not in active status  |
| 400    | `{ "error": "Recording is already in progress" }`        | Already recording          |
| 404    | `{ "error": "Call not found" }`                           | Call does not exist        |

---

### POST /calls/:id/recording/stop

Stop recording. Transitions recording status from `recording` to `processing`.

**Response `200 OK`:**

```json
{
  "recording": false
}
```

**Error Responses:**

| Status | Body                                            | Condition             |
|--------|-------------------------------------------------|-----------------------|
| 400    | `{ "error": "No recording in progress" }`       | Not currently recording |
| 404    | `{ "error": "Call not found" }`                  | Call does not exist   |

---

### GET /calls/:id/stats

Get statistics for a call including duration, participant counts, and recording status.

**Response `200 OK`:**

```json
{
  "callId": "c3d4e5f6-7890-1234-5678-9abcdef01234",
  "type": "video",
  "status": "active",
  "duration": 342,
  "participantsCount": 3,
  "connectedCount": 2,
  "recordingStatus": "recording",
  "startedAt": "2026-02-12T10:30:00.000Z",
  "answeredAt": "2026-02-12T10:30:05.000Z",
  "endedAt": null
}
```

---

## Meetings

Schedule and manage video meetings with features like waiting rooms, polls, breakout rooms, and participant management.

### POST /meetings

Schedule a new meeting.

**Request Body:**

```json
{
  "title": "Weekly Engineering Standup",
  "description": "Review progress and blockers",
  "password": "standup2026",
  "hostUserId": "user_001",
  "scheduledAt": "2026-02-13T09:00:00Z",
  "durationMins": 30,
  "settings": {
    "waitingRoom": true,
    "muteOnEntry": true,
    "allowScreenShare": true,
    "allowRecording": false,
    "maxParticipants": 50
  }
}
```

| Field            | Type    | Required | Description                                 |
|------------------|---------|----------|---------------------------------------------|
| `title`          | string  | Yes      | Meeting title (1-200 chars)                 |
| `description`    | string  | No       | Description (max 2000 chars)                |
| `password`       | string  | No       | Meeting password (4-50 chars)               |
| `hostUserId`     | string  | Yes      | User ID of the meeting host                 |
| `scheduledAt`    | string  | No       | ISO 8601 datetime for the scheduled start   |
| `durationMins`   | number  | No       | Expected duration in minutes (1-1440)       |
| `settings`       | object  | No       | Meeting settings (see defaults below)       |

**Default Settings:**

| Setting              | Default | Description                      |
|----------------------|---------|----------------------------------|
| `waitingRoom`        | `false` | Require host approval to join    |
| `muteOnEntry`        | `false` | Auto-mute on join                |
| `allowScreenShare`   | `true`  | Allow screen sharing             |
| `allowRecording`     | `false` | Allow recording                  |
| `maxParticipants`    | `100`   | Maximum participant count (2-1000) |

**Response `201 Created`:**

```json
{
  "data": {
    "id": "d4e5f6a7-8901-2345-6789-abcdef012345",
    "meetingCode": "AbCdEf1234",
    "title": "Weekly Engineering Standup",
    "description": "Review progress and blockers",
    "password": "standup2026",
    "hostUserId": "user_001",
    "status": "scheduled",
    "scheduledAt": "2026-02-13T09:00:00.000Z",
    "durationMins": 30,
    "settings": {
      "waitingRoom": true,
      "muteOnEntry": true,
      "allowScreenShare": true,
      "allowRecording": false,
      "maxParticipants": 50
    },
    "startedAt": null,
    "endedAt": null,
    "createdAt": "2026-02-12T10:30:00.000Z",
    "updatedAt": "2026-02-12T10:30:00.000Z"
  }
}
```

---

### GET /meetings/:id

Get meeting details including the current participant list.

**Response `200 OK`:**

```json
{
  "data": {
    "id": "d4e5f6a7-8901-2345-6789-abcdef012345",
    "meetingCode": "AbCdEf1234",
    "title": "Weekly Engineering Standup",
    "description": "Review progress and blockers",
    "password": "standup2026",
    "hostUserId": "user_001",
    "status": "active",
    "scheduledAt": "2026-02-13T09:00:00.000Z",
    "durationMins": 30,
    "settings": {
      "waitingRoom": true,
      "muteOnEntry": true,
      "allowScreenShare": true,
      "allowRecording": false,
      "maxParticipants": 50
    },
    "startedAt": "2026-02-13T09:00:05.000Z",
    "endedAt": null,
    "createdAt": "2026-02-12T10:30:00.000Z",
    "updatedAt": "2026-02-13T09:00:05.000Z",
    "participants": [
      {
        "id": "p_abc123",
        "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345",
        "userId": "user_001",
        "displayName": "Jane Doe",
        "role": "host",
        "status": "joined",
        "isMuted": false,
        "isVideoOff": false,
        "joinedAt": "2026-02-13T09:00:05.000Z",
        "leftAt": null
      }
    ]
  }
}
```

**Error Responses:**

| Status | Body                                  | Condition              |
|--------|---------------------------------------|------------------------|
| 404    | `{ "error": "Meeting not found" }`    | Meeting does not exist |

---

### PATCH /meetings/:id

Update meeting details. Cannot update cancelled or ended meetings.

**Request Body:**

```json
{
  "title": "Updated Standup Title",
  "scheduledAt": "2026-02-13T10:00:00Z",
  "settings": {
    "maxParticipants": 100
  }
}
```

**Response `200 OK`:** Returns `{ "data": <updated meeting> }`.

**Error Responses:**

| Status | Body                                                          | Condition                   |
|--------|---------------------------------------------------------------|-----------------------------|
| 400    | `{ "error": "Cannot update a cancelled meeting" }`           | Meeting is cancelled        |
| 400    | `{ "error": "Cannot update a ended meeting" }`               | Meeting has ended           |
| 404    | `{ "error": "Meeting not found" }`                           | Meeting does not exist      |

---

### DELETE /meetings/:id

Cancel a meeting. Sets the status to `cancelled`.

**Response `200 OK`:** Returns `{ "data": <cancelled meeting> }`.

**Error Responses:**

| Status | Body                                                      | Condition                |
|--------|-----------------------------------------------------------|--------------------------|
| 400    | `{ "error": "Meeting is already cancelled" }`             | Already cancelled        |
| 400    | `{ "error": "Cannot cancel an ended meeting" }`          | Meeting has ended        |
| 404    | `{ "error": "Meeting not found" }`                        | Meeting does not exist   |

---

### POST /meetings/:id/join

Join a meeting. If the meeting has a waiting room and the user is not the host, their status is set to `waiting`. The meeting auto-activates when the first participant joins.

**Request Body:**

```json
{
  "userId": "user_002",
  "displayName": "John Smith",
  "password": "standup2026"
}
```

| Field         | Type   | Required | Description                                 |
|---------------|--------|----------|---------------------------------------------|
| `userId`      | string | Yes      | User ID of the joining participant          |
| `displayName` | string | Yes      | Display name in the meeting (1-100 chars)   |
| `password`    | string | No       | Meeting password if password-protected      |

**Response `201 Created`:**

```json
{
  "data": {
    "id": "p_def456",
    "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345",
    "userId": "user_002",
    "displayName": "John Smith",
    "role": "participant",
    "status": "joined",
    "isMuted": true,
    "isVideoOff": false,
    "joinedAt": "2026-02-13T09:01:00.000Z",
    "leftAt": null
  }
}
```

**Error Responses:**

| Status | Body                                                              | Condition                    |
|--------|-------------------------------------------------------------------|------------------------------|
| 400    | `{ "error": "Meeting has been cancelled" }`                       | Meeting cancelled            |
| 400    | `{ "error": "Meeting has ended" }`                                | Meeting ended                |
| 403    | `{ "error": "Incorrect meeting password" }`                      | Wrong password               |
| 403    | `{ "error": "Meeting has reached maximum participant capacity" }` | At max participants          |
| 409    | `{ "error": "User has already joined this meeting" }`            | Already joined/waiting       |

---

### POST /meetings/:id/leave

Leave a meeting. Sets the participant's status to `left`.

**Request Body:**

```json
{
  "userId": "user_002"
}
```

**Response `200 OK`:** Returns `{ "data": <participant with status "left"> }`.

**Error Responses:**

| Status | Body                                                                      | Condition               |
|--------|---------------------------------------------------------------------------|-------------------------|
| 404    | `{ "error": "Participant not found or not currently in meeting" }`        | Not a joined participant |

---

### POST /meetings/:id/end

End a meeting (host only). All active participants are marked as `left`.

**Request Body:**

```json
{
  "userId": "user_001"
}
```

**Response `200 OK`:** Returns `{ "data": <meeting with status "ended"> }`.

**Error Responses:**

| Status | Body                                               | Condition                |
|--------|----------------------------------------------------|--------------------------|
| 400    | `{ "error": "Meeting has already ended" }`         | Already ended            |
| 400    | `{ "error": "Meeting has been cancelled" }`        | Already cancelled        |
| 403    | `{ "error": "Only the host can end the meeting" }` | Non-host user attempted  |
| 404    | `{ "error": "Meeting not found" }`                 | Meeting does not exist   |

---

### POST /meetings/:id/participants/:uid/mute

Mute or unmute a specific participant.

**Request Body:**

```json
{
  "muted": true
}
```

**Response `200 OK`:** Returns `{ "data": <updated participant> }`.

**Error Responses:**

| Status | Body                                                                      | Condition                |
|--------|---------------------------------------------------------------------------|--------------------------|
| 404    | `{ "error": "Meeting not found" }`                                        | Meeting does not exist   |
| 404    | `{ "error": "Participant not found or not currently in meeting" }`        | Not a joined participant |

---

### POST /meetings/:id/participants/:uid/remove

Remove a participant from the meeting. Sets their status to `removed`.

**Response `200 OK`:** Returns `{ "data": <participant with status "removed"> }`.

**Error Responses:**

| Status | Body                                                                      | Condition                |
|--------|---------------------------------------------------------------------------|--------------------------|
| 404    | `{ "error": "Meeting not found" }`                                        | Meeting does not exist   |
| 404    | `{ "error": "Participant not found or not currently in meeting" }`        | Not a joined participant |

---

### POST /meetings/:id/mute-all

Mute or unmute all currently joined participants.

**Request Body:**

```json
{
  "muted": true
}
```

**Response `200 OK`:**

```json
{
  "data": {
    "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345",
    "muted": true,
    "affectedCount": 12
  }
}
```

---

### POST /meetings/:id/polls

Create a poll within a meeting.

**Request Body:**

```json
{
  "question": "Should we extend the sprint by one day?",
  "options": ["Yes", "No", "Abstain"],
  "isAnonymous": false
}
```

| Field         | Type     | Required | Description                                |
|---------------|----------|----------|--------------------------------------------|
| `question`    | string   | Yes      | Poll question (1-500 chars)                |
| `options`     | string[] | Yes      | Option texts (2-20 items, each max 200 chars) |
| `isAnonymous` | boolean  | No       | Anonymous voting. Defaults to `false`      |

**Response `201 Created`:**

```json
{
  "data": {
    "id": "poll_abc123",
    "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345",
    "question": "Should we extend the sprint by one day?",
    "options": [
      { "id": "opt_001", "text": "Yes", "votes": 0 },
      { "id": "opt_002", "text": "No", "votes": 0 },
      { "id": "opt_003", "text": "Abstain", "votes": 0 }
    ],
    "isAnonymous": false,
    "totalVotes": 0,
    "status": "active",
    "createdAt": "2026-02-13T09:15:00.000Z"
  }
}
```

---

### POST /meetings/:id/polls/:pid/vote

Vote on an active poll. Each user can vote only once per poll.

**Request Body:**

```json
{
  "optionId": "opt_001",
  "userId": "user_002"
}
```

**Response `200 OK`:** Returns `{ "data": <updated poll with vote counts> }`.

**Error Responses:**

| Status | Body                                                  | Condition                  |
|--------|-------------------------------------------------------|----------------------------|
| 400    | `{ "error": "Poll is closed" }`                       | Poll no longer active      |
| 400    | `{ "error": "Invalid option ID" }`                    | Option ID does not exist   |
| 404    | `{ "error": "Poll not found" }`                       | Poll does not exist        |
| 409    | `{ "error": "User has already voted on this poll" }`  | Duplicate vote             |

---

### POST /meetings/:id/breakout-rooms

Create breakout rooms within a meeting.

**Request Body:**

```json
{
  "rooms": [
    { "name": "Room A", "participants": ["user_001", "user_002"] },
    { "name": "Room B", "participants": ["user_003", "user_004"] },
    { "name": "Room C" }
  ]
}
```

| Field                    | Type     | Required | Description                             |
|--------------------------|----------|----------|-----------------------------------------|
| `rooms`                  | array    | Yes      | 1-50 breakout rooms                     |
| `rooms[].name`           | string   | Yes      | Room name (1-100 chars)                 |
| `rooms[].participants`   | string[] | No       | User IDs assigned to this room          |

**Response `201 Created`:**

```json
{
  "data": [
    {
      "id": "room_001",
      "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345",
      "name": "Room A",
      "participants": ["user_001", "user_002"],
      "createdAt": "2026-02-13T09:20:00.000Z"
    },
    {
      "id": "room_002",
      "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345",
      "name": "Room B",
      "participants": ["user_003", "user_004"],
      "createdAt": "2026-02-13T09:20:00.000Z"
    },
    {
      "id": "room_003",
      "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345",
      "name": "Room C",
      "participants": [],
      "createdAt": "2026-02-13T09:20:00.000Z"
    }
  ]
}
```

---

### GET /meetings/join/:code

Look up a meeting by its meeting code. Returns minimal details needed to join. Returns `410 Gone` for ended or cancelled meetings.

**Response `200 OK`:**

```json
{
  "data": {
    "id": "d4e5f6a7-8901-2345-6789-abcdef012345",
    "meetingCode": "AbCdEf1234",
    "title": "Weekly Engineering Standup",
    "status": "scheduled",
    "hasPassword": true,
    "settings": {
      "waitingRoom": true
    }
  }
}
```

**Error Responses:**

| Status | Body                                                      | Condition                  |
|--------|-----------------------------------------------------------|----------------------------|
| 404    | `{ "error": "Meeting not found for the given code" }`     | Invalid code               |
| 410    | `{ "error": "Meeting has been cancelled" }`               | Meeting cancelled          |
| 410    | `{ "error": "Meeting has ended" }`                        | Meeting ended              |

---

## Live Streams

Create and manage live streaming sessions.

### POST /streams

Create a new live stream. Generates a unique stream key for RTMP ingest.

**Request Body:**

```json
{
  "title": "Product Launch Keynote",
  "description": "Live launch event for RajutechieStreamKit v2.0",
  "hostUserId": "user_001",
  "visibility": "public",
  "settings": {
    "chatEnabled": true,
    "lowLatency": true,
    "dvr": false,
    "maxBitrate": 8000,
    "recordStream": true
  }
}
```

| Field        | Type   | Required | Description                                       |
|--------------|--------|----------|---------------------------------------------------|
| `title`      | string | Yes      | Stream title (1-200 chars)                        |
| `description`| string | No       | Description (max 2000 chars)                      |
| `hostUserId` | string | Yes      | User ID of the stream host                        |
| `visibility` | string | No       | One of: `public`, `private`, `unlisted`. Default: `public` |
| `settings`   | object | No       | Stream settings (see defaults below)              |

**Default Settings:**

| Setting          | Default | Description                           |
|------------------|---------|---------------------------------------|
| `chatEnabled`    | `true`  | Enable live chat during stream        |
| `lowLatency`     | `false` | Enable low-latency mode               |
| `dvr`            | `false` | Enable DVR (rewind during live)       |
| `maxBitrate`     | `6000`  | Max bitrate in kbps (500-50000)       |
| `recordStream`   | `false` | Record the stream for VOD             |

**Response `201 Created`:**

```json
{
  "data": {
    "id": "e5f6a7b8-9012-3456-7890-bcdef0123456",
    "title": "Product Launch Keynote",
    "description": "Live launch event for RajutechieStreamKit v2.0",
    "streamKey": "a3f8c1e9d4b7...64_hex_chars",
    "hostUserId": "user_001",
    "visibility": "public",
    "status": "idle",
    "settings": {
      "chatEnabled": true,
      "lowLatency": true,
      "dvr": false,
      "maxBitrate": 8000,
      "recordStream": true
    },
    "hlsUrl": null,
    "rtmpUrl": null,
    "viewerCount": 0,
    "peakViewerCount": 0,
    "startedAt": null,
    "endedAt": null,
    "createdAt": "2026-02-12T10:30:00.000Z",
    "updatedAt": "2026-02-12T10:30:00.000Z"
  }
}
```

---

### GET /streams/:id

Get stream details including current viewer count.

**Response `200 OK`:**

```json
{
  "data": {
    "id": "e5f6a7b8-9012-3456-7890-bcdef0123456",
    "title": "Product Launch Keynote",
    "description": "Live launch event for RajutechieStreamKit v2.0",
    "streamKey": "a3f8c1e9d4b7...64_hex_chars",
    "hostUserId": "user_001",
    "visibility": "public",
    "status": "live",
    "settings": { "chatEnabled": true, "lowLatency": true, "dvr": false, "maxBitrate": 8000, "recordStream": true },
    "hlsUrl": "https://cdn.rajutechie-streamkit.io/live/e5f6a7b8-9012-3456-7890-bcdef0123456/index.m3u8",
    "rtmpUrl": "rtmp://ingest.rajutechie-streamkit.io/live/a3f8c1e9d4b7...64_hex_chars",
    "viewerCount": 1247,
    "peakViewerCount": 2300,
    "startedAt": "2026-02-12T14:00:00.000Z",
    "endedAt": null,
    "createdAt": "2026-02-12T10:30:00.000Z",
    "updatedAt": "2026-02-12T14:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Body                                | Condition             |
|--------|-------------------------------------|-----------------------|
| 404    | `{ "error": "Stream not found" }`   | Stream does not exist |

---

### POST /streams/:id/start

Start streaming (go live). Generates HLS and RTMP URLs. The stream must be in `idle` status.

**Response `200 OK`:** Returns `{ "data": <stream with status "live"> }`.

**Error Responses:**

| Status | Body                                                                      | Condition              |
|--------|---------------------------------------------------------------------------|------------------------|
| 400    | `{ "error": "Stream is already live" }`                                   | Already streaming      |
| 400    | `{ "error": "Stream has ended. Create a new stream to go live again" }`   | Stream already ended   |
| 404    | `{ "error": "Stream not found" }`                                         | Stream does not exist  |

---

### POST /streams/:id/stop

Stop a live stream. Resets the viewer count to 0 and sets the status to `ended`.

**Response `200 OK`:** Returns `{ "data": <stream with status "ended"> }`.

**Error Responses:**

| Status | Body                                                    | Condition                |
|--------|---------------------------------------------------------|--------------------------|
| 400    | `{ "error": "Stream has already ended" }`               | Already ended            |
| 400    | `{ "error": "Stream has not been started yet" }`        | Stream still idle        |
| 404    | `{ "error": "Stream not found" }`                       | Stream does not exist    |

---

### GET /streams/:id/viewers

Get current and peak viewer counts for a stream.

**Response `200 OK`:**

```json
{
  "data": {
    "streamId": "e5f6a7b8-9012-3456-7890-bcdef0123456",
    "count": 1247,
    "peakCount": 2300
  }
}
```

---

### POST /streams/:id/moderate

Perform a moderation action on a live stream.

**Request Body:**

```json
{
  "type": "ban_viewer",
  "targetUserId": "user_toxic_123"
}
```

| Field          | Type   | Required | Description                                        |
|----------------|--------|----------|----------------------------------------------------|
| `type`         | string | Yes      | One of: `ban_viewer`, `disable_chat`               |
| `targetUserId` | string | Conditional | Required for `ban_viewer`; not needed for `disable_chat` |

**Response `200 OK`:**

```json
{
  "data": {
    "success": true,
    "action": {
      "id": "mod_001",
      "streamId": "e5f6a7b8-9012-3456-7890-bcdef0123456",
      "type": "ban_viewer",
      "targetUserId": "user_toxic_123",
      "performedAt": "2026-02-12T14:30:00.000Z"
    }
  }
}
```

**Error Responses:**

| Status | Body                                                              | Condition                          |
|--------|-------------------------------------------------------------------|------------------------------------|
| 400    | `{ "error": "targetUserId is required for ban_viewer action" }`   | Missing target for ban_viewer      |
| 404    | `{ "error": "Stream not found" }`                                 | Stream does not exist              |

---

## Media

Upload and manage media files using presigned S3 URLs.

### POST /media/upload

Get a presigned upload URL. The client uploads the file directly to S3 using the returned URL.

**Request Body:**

```json
{
  "filename": "presentation.pdf",
  "mimeType": "application/pdf",
  "size": 10485760
}
```

| Field      | Type   | Required | Description                                 |
|------------|--------|----------|---------------------------------------------|
| `filename` | string | Yes      | Original filename (1-255 chars)             |
| `mimeType` | string | Yes      | MIME type (1-127 chars)                     |
| `size`     | number | Yes      | File size in bytes (max 500 MB)             |

**Response `201 Created`:**

```json
{
  "mediaId": "f6a7b8c9-0123-4567-8901-cdef01234567",
  "uploadUrl": "https://s3.amazonaws.com/rajutechie-streamkit-media/f6a7b8c9.../presentation.pdf?X-Amz-Signature=...",
  "key": "f6a7b8c9-0123-4567-8901-cdef01234567/presentation.pdf"
}
```

After receiving the response, upload the file using an HTTP `PUT` request to the `uploadUrl`.

---

### GET /media/:id

Get media metadata and a presigned download URL. Returns `404` for soft-deleted media.

**Response `200 OK`:**

```json
{
  "id": "f6a7b8c9-0123-4567-8901-cdef01234567",
  "filename": "presentation.pdf",
  "mimeType": "application/pdf",
  "size": 10485760,
  "key": "f6a7b8c9-0123-4567-8901-cdef01234567/presentation.pdf",
  "uploadUrl": "https://s3.amazonaws.com/...",
  "downloadUrl": "https://s3.amazonaws.com/rajutechie-streamkit-media/f6a7b8c9.../presentation.pdf?X-Amz-Signature=...",
  "deleted": false,
  "createdAt": "2026-02-12T10:30:00.000Z",
  "updatedAt": "2026-02-12T10:30:00.000Z"
}
```

**Error Responses:**

| Status | Body                               | Condition                         |
|--------|-------------------------------------|-----------------------------------|
| 404    | `{ "error": "Media not found" }`   | Media does not exist or is deleted |

---

### DELETE /media/:id

Soft-delete a media entry. The S3 object is retained for auditing; a background job handles hard deletes.

**Response `204 No Content`:** Empty body on success.

**Error Responses:**

| Status | Body                               | Condition                         |
|--------|-------------------------------------|-----------------------------------|
| 404    | `{ "error": "Media not found" }`   | Media does not exist or is deleted |

---

## Webhooks

Register HTTP endpoints to receive real-time event notifications. See the [Webhook Reference](./webhooks.md) for payload formats and signature verification.

### POST /webhooks

Register a new webhook endpoint.

**Request Body:**

```json
{
  "url": "https://yourapp.com/webhooks/rajutechie-streamkit",
  "events": ["message.new", "call.ended", "meeting.started"],
  "secret": "whsec_your_webhook_secret"
}
```

**Response `201 Created`:**

```json
{
  "id": "wh_abc123",
  "url": "https://yourapp.com/webhooks/rajutechie-streamkit",
  "events": ["message.new", "call.ended", "meeting.started"],
  "status": "active",
  "createdAt": "2026-02-12T10:30:00.000Z"
}
```

---

### GET /webhooks

List all registered webhooks.

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "wh_abc123",
      "url": "https://yourapp.com/webhooks/rajutechie-streamkit",
      "events": ["message.new", "call.ended", "meeting.started"],
      "status": "active",
      "createdAt": "2026-02-12T10:30:00.000Z"
    }
  ]
}
```

---

### DELETE /webhooks/:id

Delete a webhook registration.

**Response `204 No Content`:** Empty body on success.

---

### GET /webhooks/:id/logs

Get delivery logs for a specific webhook.

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "log_001",
      "webhookId": "wh_abc123",
      "eventType": "message.new",
      "status": "delivered",
      "statusCode": 200,
      "responseTime": 142,
      "attemptNumber": 1,
      "sentAt": "2026-02-12T10:31:00.000Z"
    },
    {
      "id": "log_002",
      "webhookId": "wh_abc123",
      "eventType": "call.ended",
      "status": "failed",
      "statusCode": 500,
      "responseTime": 30012,
      "attemptNumber": 3,
      "sentAt": "2026-02-12T10:35:00.000Z",
      "error": "Timeout after 30s"
    }
  ]
}
```

---

## Pagination

All list endpoints use cursor-based pagination for consistent, efficient traversal of large datasets.

### Request Parameters

| Parameter | Type   | Default | Description                                     |
|-----------|--------|---------|-------------------------------------------------|
| `limit`   | number | 25      | Number of items to return (1-100)               |
| `after`   | string | --      | Cursor value to fetch the next page             |
| `before`  | string | --      | Cursor value to fetch the previous page (messages only) |

### Response Format

```json
{
  "data": [
    { "...": "..." }
  ],
  "total": 150,
  "hasNext": true,
  "cursors": {
    "before": "id_of_first_item_or_null",
    "after": "id_of_last_item_or_null"
  }
}
```

### Usage Example

**First page:**
```
GET /channels?limit=10
```

**Next page (use the `after` cursor from the previous response):**
```
GET /channels?limit=10&after=a1b2c3d4-5678-9012-3456-789abcdef012
```

---

## Rate Limiting

All API endpoints are subject to rate limiting. Rate limit information is included in every response via HTTP headers.

### Rate Limit Headers

| Header                 | Description                                              |
|------------------------|----------------------------------------------------------|
| `X-RateLimit-Limit`    | Maximum number of requests allowed in the current window |
| `X-RateLimit-Remaining`| Number of requests remaining in the current window       |
| `X-RateLimit-Reset`    | Unix timestamp (seconds) when the window resets          |

### Default Limits

| Tier         | Requests per Minute | Burst Limit |
|--------------|---------------------|-------------|
| Free         | 60                  | 10          |
| Pro          | 600                 | 50          |
| Enterprise   | 6000                | 200         |

### Rate Limit Exceeded

When the rate limit is exceeded, the API returns `429 Too Many Requests`:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Retry after 1707739860",
    "status": 429
  }
}
```

The `Retry-After` header is included with the number of seconds to wait before retrying.

---

## Error Format

All API errors follow a consistent structure.

### Error Response Schema

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description of the error",
    "status": 400
  }
}
```

### Common Error Codes

| Code                     | Status | Description                                    |
|--------------------------|--------|------------------------------------------------|
| `INVALID_REQUEST`        | 400    | Request body validation failed                 |
| `UNAUTHORIZED`           | 401    | Missing or invalid authentication              |
| `FORBIDDEN`              | 403    | Insufficient permissions                       |
| `NOT_FOUND`              | 404    | Resource not found                             |
| `CONFLICT`               | 409    | Resource conflict (e.g., duplicate)            |
| `GONE`                   | 410    | Resource no longer available                   |
| `RATE_LIMIT_EXCEEDED`    | 429    | Too many requests                              |
| `INTERNAL_ERROR`         | 500    | Unexpected server error                        |
| `CHANNEL_NOT_FOUND`      | 404    | Specified channel does not exist               |
| `MESSAGE_NOT_FOUND`      | 404    | Specified message does not exist               |
| `USER_NOT_FOUND`         | 404    | Specified user does not exist or is inactive   |
| `CALL_NOT_FOUND`         | 404    | Specified call does not exist                  |
| `MEETING_NOT_FOUND`      | 404    | Specified meeting does not exist               |
| `STREAM_NOT_FOUND`       | 404    | Specified stream does not exist                |
| `INVALID_TOKEN`          | 401    | Token is malformed, expired, or revoked        |
| `DEVICE_NOT_FOUND`       | 404    | Specified device does not exist                |
| `POLL_NOT_FOUND`         | 404    | Specified poll does not exist                  |
| `SERVER_AT_CAPACITY`     | 503    | Server cannot accept new connections           |

### Validation Error Example

When request body validation fails, the error includes details about each invalid field:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Validation failed",
    "status": 400,
    "details": [
      {
        "field": "title",
        "message": "Title is required",
        "code": "too_small"
      },
      {
        "field": "hostUserId",
        "message": "Host user ID is required",
        "code": "too_small"
      }
    ]
  }
}
```
