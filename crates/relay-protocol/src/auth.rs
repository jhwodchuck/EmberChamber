use chrono::{DateTime, Utc};
use emberchamber_domain::{AccountId, ConversationId, DeviceId, SessionId};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthStartRequest {
    pub email: String,
    pub invite_token: Option<String>,
    pub group_id: Option<ConversationId>,
    pub group_invite_token: Option<String>,
    pub device_label: String,
    pub age_confirmed_18: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthCompleteRequest {
    pub completion_token: String,
    pub device_label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MagicLinkChallenge {
    pub id: String,
    pub expires_at: DateTime<Utc>,
    pub invite_required: bool,
    pub debug_completion_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthSession {
    pub account_id: AccountId,
    pub device_id: DeviceId,
    pub session_id: SessionId,
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: DateTime<Utc>,
    pub passkey_enrollment_suggested: bool,
    pub bootstrap_conversation_id: Option<ConversationId>,
    pub bootstrap_conversation_title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessTokenClaims {
    pub sub: AccountId,
    pub device_id: DeviceId,
    pub session_id: SessionId,
    pub exp: i64,
    pub iat: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasskeyCredentialRef {
    pub credential_id: String,
    pub transports: Vec<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DevicePushTokenRegistration {
    pub provider: String,
    pub platform: String,
    pub token: String,
    pub app_id: Option<String>,
    pub push_environment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DevicePushTokenStatus {
    pub registered: bool,
    pub device_id: DeviceId,
    pub provider: String,
    pub platform: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DevicePushTokenClearResult {
    pub cleared: bool,
    pub device_id: DeviceId,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactCard {
    pub account_id: AccountId,
    pub label: String,
    pub conversation_hint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttachmentTicket {
    pub attachment_id: String,
    pub upload_url: String,
    pub download_url: String,
    pub expires_at: DateTime<Utc>,
    pub max_bytes: u64,
    pub encryption_mode: String,
    pub content_class: String,
    pub retention_mode: String,
    pub protection_profile: String,
    pub preview_blur_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeProfile {
    pub id: AccountId,
    pub username: String,
    pub display_name: String,
    pub email: String,
    pub bio: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionDescriptor {
    pub id: SessionId,
    pub device_label: String,
    pub created_at: DateTime<Utc>,
    pub last_seen_at: DateTime<Utc>,
    pub is_current: bool,
}
