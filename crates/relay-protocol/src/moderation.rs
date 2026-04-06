use emberchamber_domain::{AccountId, ConversationId};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReportReason {
    Spam,
    Harassment,
    IllegalContent,
    Malware,
    Csam,
    NonConsensualIntimateMedia,
    CoercionOrExtortion,
    Impersonation,
    UnderageRisk,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportDisclosure {
    pub target_conversation_id: Option<ConversationId>,
    pub target_account_id: Option<AccountId>,
    pub target_attachment_id: Option<String>,
    pub reason: ReportReason,
    pub evidence_message_ids: Option<Vec<String>>,
    pub disclosed_payload: Value,
}
