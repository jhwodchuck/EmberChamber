use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MailboxCursor {
    pub last_seen_envelope_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MailboxAck {
    pub envelope_ids: Vec<String>,
    pub acknowledged_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvelopeBatch {
    pub cursor: MailboxCursor,
    pub envelopes: Vec<crate::CipherEnvelope>,
}
