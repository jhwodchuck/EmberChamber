use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A signed relay envelope delivered between operators.
///
/// The `payload` is opaque bytes — either an encrypted DM envelope or a
/// hosted-content notification. Operators never decrypt DM payloads.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelayEnvelope {
    /// Globally unique, idempotency key for this delivery.
    pub id: Uuid,
    /// Originating operator node ID.
    pub origin_node_id: Uuid,
    /// Destination operator node ID.
    pub destination_node_id: Uuid,
    /// Recipient user ID on the destination node.
    pub recipient_user_id: Uuid,
    /// Base64url-encoded, sender-signed payload bytes.
    pub payload_b64: String,
    /// Detached Ed25519 signature over `id || origin_node_id || payload_b64`.
    pub signature_b64: String,
    /// When this envelope was created.
    pub created_at: DateTime<Utc>,
    /// Earliest retry time (exponential back-off managed by sender).
    pub not_before: Option<DateTime<Utc>>,
}

/// Delivery acknowledgement returned by the destination node.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelayReceipt {
    /// The envelope ID being acknowledged.
    pub envelope_id: Uuid,
    /// Receiving operator node ID.
    pub node_id: Uuid,
    /// When the envelope was accepted.
    pub accepted_at: DateTime<Utc>,
}
