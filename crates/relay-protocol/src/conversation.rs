use chrono::{DateTime, Utc};
use emberchamber_domain::{AccountId, ConversationId};
use serde::{Deserialize, Serialize};

pub type GroupEpoch = u32;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConversationKind {
    DirectMessage,
    Group,
    Community,
    Room,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConversationHistoryMode {
    RelayHosted,
    DeviceEncrypted,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RoomAccessPolicy {
    AllMembers,
    Restricted,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConversationInviteScope {
    Conversation,
    Room,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationDescriptor {
    pub id: ConversationId,
    pub kind: ConversationKind,
    pub title: Option<String>,
    pub epoch: GroupEpoch,
    pub history_mode: ConversationHistoryMode,
    pub parent_conversation_id: Option<ConversationId>,
    pub member_account_ids: Vec<AccountId>,
    pub member_count: Option<u32>,
    pub room_count: Option<u32>,
    pub member_cap: Option<u32>,
    pub sensitive_media_default: Option<bool>,
    pub join_rule_text: Option<String>,
    pub allow_member_invites: Option<bool>,
    pub invite_freeze_enabled: Option<bool>,
    pub room_access_policy: Option<RoomAccessPolicy>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationCapabilities {
    pub relay_hosted_messages: bool,
    pub mailbox_transport: bool,
    pub encrypted_attachments: bool,
    pub can_create_invites: bool,
    pub can_manage_members: bool,
    pub can_manage_policies: bool,
    pub can_manage_rooms: bool,
    pub can_grant_room_access: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationMemberSummary {
    pub account_id: AccountId,
    pub username: String,
    pub display_name: String,
    pub role: String,
    pub joined_at: DateTime<Utc>,
    pub removed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationSummary {
    pub id: ConversationId,
    pub kind: ConversationKind,
    pub title: Option<String>,
    pub epoch: GroupEpoch,
    pub history_mode: ConversationHistoryMode,
    pub parent_conversation_id: Option<ConversationId>,
    pub member_account_ids: Vec<AccountId>,
    pub member_count: u32,
    pub room_count: Option<u32>,
    pub member_cap: Option<u32>,
    pub sensitive_media_default: Option<bool>,
    pub join_rule_text: Option<String>,
    pub allow_member_invites: Option<bool>,
    pub invite_freeze_enabled: Option<bool>,
    pub room_access_policy: Option<RoomAccessPolicy>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_message_at: Option<DateTime<Utc>>,
    pub last_message_kind: Option<String>,
    pub capabilities: ConversationCapabilities,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationDetail {
    #[serde(flatten)]
    pub summary: ConversationSummary,
    pub members: Vec<ConversationMemberSummary>,
    pub rooms: Option<Vec<ConversationSummary>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchAccountResult {
    pub account_id: AccountId,
    pub username: String,
    pub display_name: String,
    pub shared_conversation_id: Option<ConversationId>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationSearchResult {
    pub query: String,
    pub scoped_community_id: Option<ConversationId>,
    pub conversations: Vec<ConversationSummary>,
    pub accounts: Vec<SearchAccountResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationInviteDescriptor {
    pub id: String,
    pub conversation_id: ConversationId,
    pub conversation_kind: String,
    pub scope: ConversationInviteScope,
    pub target_room_conversation_id: Option<ConversationId>,
    pub target_room_title: Option<String>,
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
pub struct ConversationInvitePreview {
    pub invite: ConversationInvitePreviewInvite,
    pub conversation: ConversationInvitePreviewConversation,
    pub room: Option<ConversationInvitePreviewRoom>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationInvitePreviewInvite {
    pub id: String,
    pub status: String,
    pub scope: ConversationInviteScope,
    pub inviter_display_name: String,
    pub expires_at: Option<DateTime<Utc>>,
    pub max_uses: Option<u32>,
    pub use_count: u32,
    pub note: Option<String>,
    pub target_room_conversation_id: Option<ConversationId>,
    pub target_room_title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationInvitePreviewConversation {
    pub id: ConversationId,
    pub kind: String,
    pub title: String,
    pub member_count: u32,
    pub member_cap: u32,
    pub join_rule_text: Option<String>,
    pub sensitive_media_default: Option<bool>,
    pub allow_member_invites: Option<bool>,
    pub invite_freeze_enabled: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationInvitePreviewRoom {
    pub id: ConversationId,
    pub title: String,
    pub member_count: u32,
    pub room_access_policy: RoomAccessPolicy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationInviteAcceptance {
    pub conversation_id: ConversationId,
    pub root_conversation_id: ConversationId,
    pub root_conversation_kind: String,
    pub title: String,
    pub epoch: GroupEpoch,
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
