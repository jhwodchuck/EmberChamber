use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MailboxCursor {
    pub last_seen_envelope_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MailboxAck {
    pub envelope_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MailboxStats {
    pub enqueued: u32,
    pub acknowledged: u32,
    pub expired: u32,
    pub rejected: u32,
    pub queued: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvelopeBatch {
    pub cursor: MailboxCursor,
    pub envelopes: Vec<crate::CipherEnvelope>,
    pub stats: Option<MailboxStats>,
}
