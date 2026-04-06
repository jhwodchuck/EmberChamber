use chrono::{DateTime, Utc};
use emberchamber_domain::{DeviceId, SessionId};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeviceLinkQrMode {
    SourceDisplay,
    TargetDisplay,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeviceLinkState {
    WaitingForSource,
    PendingClaim,
    PendingApproval,
    Approved,
    Consumed,
    Expired,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceLinkQrPayload {
    pub version: u8,
    pub relay_origin: String,
    pub qr_mode: DeviceLinkQrMode,
    pub link_token: String,
    pub requester_label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceLinkStatus {
    pub link_id: Option<String>,
    pub relay_origin: String,
    pub qr_mode: DeviceLinkQrMode,
    pub state: DeviceLinkState,
    pub requester_label: String,
    pub expires_at: DateTime<Utc>,
    pub created_at: Option<DateTime<Utc>>,
    pub claimed_at: Option<DateTime<Utc>>,
    pub approved_at: Option<DateTime<Utc>>,
    pub approved_by_device_id: Option<DeviceId>,
    pub consumed_at: Option<DateTime<Utc>>,
    pub completed_device_id: Option<DeviceId>,
    pub completed_session_id: Option<SessionId>,
    pub can_complete: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceLinkStartRequest {
    pub device_label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceLinkStartResponse {
    #[serde(flatten)]
    pub status: DeviceLinkStatus,
    pub link_id: String,
    pub qr_payload: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceLinkScanRequest {
    pub qr_payload: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceLinkClaimRequest {
    pub qr_payload: String,
    pub device_label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceLinkStatusQuery {
    pub link_token: String,
    pub qr_mode: DeviceLinkQrMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceLinkConfirmRequest {
    pub link_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceLinkConfirmResponse {
    #[serde(flatten)]
    pub status: DeviceLinkStatus,
    pub link_id: String,
    pub confirmed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceLinkCompleteRequest {
    pub link_token: String,
    pub qr_mode: DeviceLinkQrMode,
}
