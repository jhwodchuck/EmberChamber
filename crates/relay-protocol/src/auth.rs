use chrono::{DateTime, Utc};
use emberchamber_domain::{AccountId, DeviceId, SessionId};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MagicLinkChallenge {
    pub id: String,
    pub email_blind_index: String,
    pub expires_at: DateTime<Utc>,
    pub invite_required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthSession {
    pub account_id: AccountId,
    pub device_id: DeviceId,
    pub session_id: SessionId,
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: DateTime<Utc>,
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
}
