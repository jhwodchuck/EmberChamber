use chrono::{DateTime, Utc};
use emberchamber_domain::{AccountId, ConversationId, DeviceId};
use emberchamber_relay_protocol::{CipherEnvelope, GroupEpoch};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceProfile {
    pub account_id: AccountId,
    pub device_id: DeviceId,
    pub label: String,
    pub linked_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationState {
    pub conversation_id: ConversationId,
    pub epoch: GroupEpoch,
    pub acknowledged_envelopes: BTreeSet<String>,
}

impl ConversationState {
    pub fn new(conversation_id: ConversationId) -> Self {
        Self {
            conversation_id,
            epoch: 1,
            acknowledged_envelopes: BTreeSet::new(),
        }
    }

    pub fn advance_epoch(&mut self, next_epoch: GroupEpoch) {
        if next_epoch > self.epoch {
            self.epoch = next_epoch;
        }
    }

    pub fn acknowledge(&mut self, envelope_id: &str) {
        self.acknowledged_envelopes.insert(envelope_id.to_string());
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutboxEntry {
    pub envelope: CipherEnvelope,
    pub queued_at: DateTime<Utc>,
    pub delivered: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaVaultEntry {
    pub attachment_id: String,
    pub conversation_id: ConversationId,
    pub file_name: String,
    pub mime_type: String,
    pub protection_profile: String,
    pub retention_mode: String,
    pub downloaded_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactLabel {
    pub account_id: AccountId,
    pub local_label: String,
    pub private_note: Option<String>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct ClientState {
    pub conversations: BTreeMap<String, ConversationState>,
    pub outbox: BTreeMap<String, OutboxEntry>,
    pub media_vault: BTreeMap<String, MediaVaultEntry>,
    pub contact_labels: BTreeMap<String, ContactLabel>,
}

impl ClientState {
    pub fn upsert_conversation(&mut self, conversation_id: ConversationId) {
        let key = conversation_id.to_string();
        self.conversations
            .entry(key)
            .or_insert_with(|| ConversationState::new(conversation_id));
    }

    pub fn enqueue(&mut self, envelope: CipherEnvelope) {
        self.upsert_conversation(envelope.conversation_id);
        self.outbox.insert(
            envelope.envelope_id.clone(),
            OutboxEntry {
                envelope,
                queued_at: Utc::now(),
                delivered: false,
            },
        );
    }

    pub fn mark_delivered(&mut self, envelope_id: &str) {
        if let Some(entry) = self.outbox.get_mut(envelope_id) {
            entry.delivered = true;
        }
    }

    pub fn remember_media(&mut self, entry: MediaVaultEntry) {
        self.media_vault.insert(entry.attachment_id.clone(), entry);
    }

    pub fn label_contact(&mut self, label: ContactLabel) {
        self.contact_labels
            .insert(label.account_id.to_string(), label);
    }

    pub fn rotate_epoch(&mut self, conversation_id: ConversationId, next_epoch: GroupEpoch) {
        self.upsert_conversation(conversation_id);
        if let Some(state) = self.conversations.get_mut(&conversation_id.to_string()) {
            state.advance_epoch(next_epoch);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;

    fn envelope(epoch: GroupEpoch) -> CipherEnvelope {
        CipherEnvelope {
            envelope_id: uuid::Uuid::new_v4().to_string(),
            conversation_id: ConversationId::new(),
            epoch,
            sender_account_id: AccountId::new(),
            sender_device_id: DeviceId::new(),
            recipient_device_id: DeviceId::new(),
            ciphertext: "ciphertext".into(),
            attachment_ids: vec![],
            client_message_id: uuid::Uuid::new_v4().to_string(),
            created_at: Utc::now(),
            expires_at: Utc::now() + Duration::days(14),
        }
    }

    #[test]
    fn enqueue_tracks_pending_envelopes() {
        let mut state = ClientState::default();
        let envelope = envelope(1);
        let envelope_id = envelope.envelope_id.clone();

        state.enqueue(envelope);

        assert!(state.outbox.contains_key(&envelope_id));
        assert!(
            !state
                .outbox
                .get(&envelope_id)
                .expect("outbox entry should exist")
                .delivered
        );
    }

    #[test]
    fn epoch_rotation_is_monotonic() {
        let mut state = ClientState::default();
        let envelope = envelope(1);
        let conversation_id = envelope.conversation_id;

        state.enqueue(envelope);
        state.rotate_epoch(conversation_id, 3);
        state.rotate_epoch(conversation_id, 2);

        assert_eq!(
            state
                .conversations
                .get(&conversation_id.to_string())
                .expect("conversation should exist")
                .epoch,
            3
        );
    }

    #[test]
    fn local_labels_and_media_vault_are_tracked() {
        let mut state = ClientState::default();
        let attachment_id = uuid::Uuid::new_v4().to_string();
        let conversation_id = ConversationId::new();
        let account_id = AccountId::new();

        state.remember_media(MediaVaultEntry {
            attachment_id: attachment_id.clone(),
            conversation_id,
            file_name: "sample.jpg".into(),
            mime_type: "image/jpeg".into(),
            protection_profile: "sensitive_media".into(),
            retention_mode: "private_vault".into(),
            downloaded_at: Utc::now(),
        });
        state.label_contact(ContactLabel {
            account_id,
            local_label: "Trusted host".into(),
            private_note: Some("Keeps invite boundaries tight".into()),
            updated_at: Utc::now(),
        });

        assert!(state.media_vault.contains_key(&attachment_id));
        assert!(state.contact_labels.contains_key(&account_id.to_string()));
    }
}
