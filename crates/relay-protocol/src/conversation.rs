use chrono::{DateTime, Utc};
use emberchamber_domain::{AccountId, ConversationId};
use serde::{Deserialize, Serialize};

pub type GroupEpoch = u32;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConversationKind {
    DirectMessage,
    Group,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationDescriptor {
    pub id: ConversationId,
    pub kind: ConversationKind,
    pub title: Option<String>,
    pub epoch: GroupEpoch,
    pub member_account_ids: Vec<AccountId>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockRule {
    pub account_id: AccountId,
    pub blocked_account_id: AccountId,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SafetyEvent {
    pub account_id: AccountId,
    pub event_type: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyResetEvent {
    pub account_id: AccountId,
    pub previous_device_count: usize,
    pub created_at: DateTime<Utc>,
}
