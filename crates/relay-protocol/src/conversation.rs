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
    pub member_cap: Option<u32>,
    pub sensitive_media_default: Option<bool>,
    pub join_rule_text: Option<String>,
    pub allow_member_invites: Option<bool>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupInviteDescriptor {
    pub id: String,
    pub conversation_id: ConversationId,
    pub invite_token: String,
    pub invite_url: String,
    pub inviter_display_name: String,
    pub expires_at: Option<DateTime<Utc>>,
    pub max_uses: Option<u32>,
    pub use_count: u32,
    pub note: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupInvitePreview {
    pub invite: GroupInvitePreviewInvite,
    pub group: GroupInvitePreviewGroup,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupInvitePreviewInvite {
    pub id: String,
    pub status: String,
    pub inviter_display_name: String,
    pub expires_at: Option<DateTime<Utc>>,
    pub max_uses: Option<u32>,
    pub use_count: u32,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupInvitePreviewGroup {
    pub id: ConversationId,
    pub title: String,
    pub member_count: u32,
    pub member_cap: u32,
    pub join_rule_text: Option<String>,
    pub sensitive_media_default: bool,
}
