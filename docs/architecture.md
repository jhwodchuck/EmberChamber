# PrivateMesh Architecture

## System Architecture Diagram

```mermaid
graph TB
    subgraph Client["Client Layer"]
        WEB["Next.js Web App\n(React + TypeScript)"]
        PWA["Progressive Web App"]
    end

    subgraph Gateway["API Gateway Layer"]
        API["REST API\n(Express/TypeScript)"]
        WS["WebSocket Gateway\n(ws library)"]
    end

    subgraph Data["Data Layer"]
        PG[("PostgreSQL\nPrimary Database")]
        RD[("Redis\nCache + Pub/Sub")]
        S3[("S3/MinIO\nObject Storage")]
    end

    subgraph Future["Future: Federation Layer"]
        RELAY["Relay Node Abstraction"]
        MESH["Mesh Transport"]
    end

    WEB --> API
    WEB --> WS
    API --> PG
    API --> RD
    API --> S3
    WS --> RD
    WS --> PG
    API -.->|future| RELAY
    RELAY -.->|future| MESH
```

## Database Schema Diagram

```mermaid
erDiagram
    users ||--o{ sessions : "has"
    users ||--o{ devices : "owns"
    users ||--o{ conversation_members : "joins"
    users ||--o{ channel_members : "subscribes"
    users ||--o{ messages : "sends"
    users ||--o{ channel_posts : "writes"
    users ||--o{ reports : "submits"
    users ||--|| user_privacy_settings : "has"

    conversations ||--o{ conversation_members : "includes"
    conversations ||--o{ messages : "contains"
    conversations ||--o{ invites : "has"

    channels ||--o{ channel_members : "has"
    channels ||--o{ channel_posts : "contains"
    channels ||--o{ invites : "has"

    messages ||--o{ message_reactions : "receives"
    messages ||--o{ message_read_receipts : "tracked"
    messages }o--|| attachments : "may_have"

    channel_posts }o--|| attachments : "may_have"
    channel_posts ||--o{ channel_post_reactions : "receives"

    devices ||--o{ encryption_keys : "registers"
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant DB as PostgreSQL

    C->>A: POST /auth/register {username, password}
    A->>A: Hash password (argon2id)
    A->>DB: Insert user + device + session
    A->>C: {accessToken (15m), refreshToken (30d)}

    Note over C,A: Normal request flow
    C->>A: GET /api/... Bearer: <accessToken>
    A->>A: Verify JWT signature
    A->>DB: Verify session is active
    A->>C: 200 Response

    Note over C,A: Token refresh flow
    C->>A: POST /auth/refresh {refreshToken}
    A->>DB: Verify refresh token + session
    A->>C: {accessToken (new 15m)}
```

## WebSocket Event Flow

```mermaid
sequenceDiagram
    participant C1 as Client 1 (Sender)
    participant API as REST API
    participant R as Redis Pub/Sub
    participant C2 as Client 2 (Receiver)
    participant WS as WebSocket Gateway

    C1->>API: POST /conversations/:id/messages
    API->>DB: Insert message
    API->>R: PUBLISH conv:{id} {type: "message.new", payload}
    API->>C1: 201 {message}

    R-->>WS: Message received from pub/sub
    WS->>C2: WebSocket frame: {type: "message.new", ...}
```

## E2EE Design (DM conversations)

For private one-to-one conversations, PrivateMesh implements a Signal Protocol-inspired design:

- Each device registers an identity key pair and pre-keys
- The server stores ONLY public key material (no private keys)
- Session keys are established client-side using X3DH key agreement
- Message content is encrypted client-side; server stores ciphertext only
- The `encrypted_content` field stores ciphertext when `is_encrypted=true`
- Server-managed group chat is acceptable for MVP; per-message E2EE is a roadmap item

**Trust assumptions:**
- The server cannot read E2EE message content
- The server can see metadata: who sent, when, conversation membership
- Users must verify device fingerprints out-of-band for strongest security

## Scaling Strategy

```mermaid
graph LR
    LB[Load Balancer] --> API1[API Instance 1]
    LB --> API2[API Instance 2]
    LB --> API3[API Instance N]

    API1 --> PG_PRIMARY[(PostgreSQL Primary)]
    API2 --> PG_PRIMARY
    API3 --> PG_PRIMARY

    PG_PRIMARY --> PG_REPLICA[(PostgreSQL Replica\nRead Replicas)]

    API1 --> REDIS_CLUSTER[(Redis Cluster)]
    API2 --> REDIS_CLUSTER
    API3 --> REDIS_CLUSTER

    REDIS_CLUSTER -->|pub/sub fan-out| WS1[WS Gateway 1]
    REDIS_CLUSTER -->|pub/sub fan-out| WS2[WS Gateway 2]
```

## Privacy Model

| Data Type | Visibility | Notes |
|-----------|-----------|-------|
| E2EE DM content | Client-only | Server stores ciphertext only |
| Group message content | Server-managed (MVP) | E2EE group planned for roadmap |
| Channel post content | Server-managed | Public channels indexed for search |
| Message metadata | Server operational | Who/when minimized; IPs not logged permanently |
| User profiles | Configurable per user | Privacy settings control visibility |
| Session data | 30-day retention | IP stored for security, not logged to analytics |
| Reports | 7-year retention | Legal compliance requirement |
| Moderation actions | Permanent | Legal/audit trail |

## Future Federation Architecture

The `relay_nodes` table and transport abstraction are designed to support:

1. **Self-hosting**: Deploy your own instance; users connect to it
2. **Federated relays**: Trusted relay nodes route messages between instances
3. **Mesh transport**: Intermittent connectivity via store-and-forward
4. **Node discovery**: Relay registry enables finding trusted nodes

This mirrors concepts from ActivityPub, Matrix, and Nostr but remains centralized-first for the MVP.
