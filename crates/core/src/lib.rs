use chrono::{DateTime, Utc};
use emberchamber_domain::{AccountId, ConversationId, DeviceId};
use emberchamber_relay_protocol::CipherEnvelope;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

/// Core-owned epoch type.  Matches the protocol wire type (`u32`) but is
/// defined here so that relay-protocol churn cannot silently alter the
/// persistence shape of this crate.
pub type Epoch = u32;

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
    pub epoch: Epoch,
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

    pub fn advance_epoch(&mut self, next_epoch: Epoch) {
        if next_epoch > self.epoch {
            self.epoch = next_epoch;
        }
    }

    pub fn acknowledge(&mut self, envelope_id: &str) {
        self.acknowledged_envelopes.insert(envelope_id.to_string());
    }
}

/// Core-owned durable outbox entry.
///
/// Does **not** embed [`CipherEnvelope`] directly.  Use
/// [`PersistedOutboxEntry::from_cipher_envelope`] and
/// [`PersistedOutboxEntry::to_cipher_envelope`] to convert at the relay
/// boundary.  This ensures that relay-protocol changes do not silently alter
/// the persistence shape of this crate.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersistedOutboxEntry {
    pub envelope_id: String,
    pub conversation_id: ConversationId,
    /// Epoch under which this envelope was encrypted.  Used to detect
    /// staleness when the conversation's epoch is later rotated forward.
    pub epoch: Epoch,
    pub sender_account_id: AccountId,
    pub sender_device_id: DeviceId,
    pub recipient_device_id: DeviceId,
    pub ciphertext: String,
    pub attachment_ids: Vec<String>,
    pub client_message_id: String,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub queued_at: DateTime<Utc>,
    pub delivered: bool,
    /// Set to `true` when the conversation's epoch has been rotated past this
    /// entry's epoch.  Stale entries must **not** be retried as ordinary
    /// pending sends; callers must decide whether to discard or re-encrypt.
    pub stale: bool,
}

impl PersistedOutboxEntry {
    /// Convert a relay wire envelope into a durable outbox entry.
    /// Called at the point of enqueueing; does not require any extra context.
    pub fn from_cipher_envelope(envelope: CipherEnvelope) -> Self {
        Self {
            envelope_id: envelope.envelope_id,
            conversation_id: envelope.conversation_id,
            epoch: envelope.epoch,
            sender_account_id: envelope.sender_account_id,
            sender_device_id: envelope.sender_device_id,
            recipient_device_id: envelope.recipient_device_id,
            ciphertext: envelope.ciphertext,
            attachment_ids: envelope.attachment_ids,
            client_message_id: envelope.client_message_id,
            created_at: envelope.created_at,
            expires_at: envelope.expires_at,
            queued_at: Utc::now(),
            delivered: false,
            stale: false,
        }
    }

    /// Reconstruct the relay wire envelope from the persisted entry.
    /// Used when the client needs to (re-)transmit the message.
    pub fn to_cipher_envelope(&self) -> CipherEnvelope {
        CipherEnvelope {
            envelope_id: self.envelope_id.clone(),
            conversation_id: self.conversation_id,
            epoch: self.epoch,
            sender_account_id: self.sender_account_id,
            sender_device_id: self.sender_device_id,
            recipient_device_id: self.recipient_device_id,
            ciphertext: self.ciphertext.clone(),
            attachment_ids: self.attachment_ids.clone(),
            client_message_id: self.client_message_id.clone(),
            created_at: self.created_at,
            expires_at: self.expires_at,
        }
    }
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
    /// Keyed by typed `ConversationId`; serialises as a UUID string
    /// (transparent) — identical wire representation to the old `String` keys.
    pub conversations: BTreeMap<ConversationId, ConversationState>,
    /// Keyed by `envelope_id` string (relay-assigned, no typed domain ID yet).
    pub outbox: BTreeMap<String, PersistedOutboxEntry>,
    /// Keyed by `attachment_id` string (relay-assigned, no typed domain ID yet).
    pub media_vault: BTreeMap<String, MediaVaultEntry>,
    /// Keyed by typed `AccountId`; serialises as a UUID string (transparent).
    pub contact_labels: BTreeMap<AccountId, ContactLabel>,
}

impl ClientState {
    pub fn upsert_conversation(&mut self, conversation_id: ConversationId) {
        self.conversations
            .entry(conversation_id)
            .or_insert_with(|| ConversationState::new(conversation_id));
    }

    /// Enqueue a relay envelope as a pending outbound send.
    ///
    /// If the envelope's epoch is already behind the conversation's current
    /// epoch, the entry is immediately marked `stale` so that callers skip it
    /// rather than retrying with a superseded key.
    pub fn enqueue(&mut self, envelope: CipherEnvelope) {
        let conversation_id = envelope.conversation_id;
        self.upsert_conversation(conversation_id);
        let current_epoch = self.conversations[&conversation_id].epoch;
        let mut entry = PersistedOutboxEntry::from_cipher_envelope(envelope);
        if entry.epoch < current_epoch {
            entry.stale = true;
        }
        self.outbox.insert(entry.envelope_id.clone(), entry);
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
        self.contact_labels.insert(label.account_id, label);
    }

    /// Advance the epoch for a conversation and quarantine outbox entries that
    /// were encrypted under an older epoch.
    ///
    /// Entries with `stale == true` must not be retried as ordinary pending
    /// sends.  Already-delivered entries are left untouched.
    pub fn rotate_epoch(&mut self, conversation_id: ConversationId, next_epoch: Epoch) {
        self.upsert_conversation(conversation_id);
        if let Some(state) = self.conversations.get_mut(&conversation_id) {
            let prev_epoch = state.epoch;
            state.advance_epoch(next_epoch);
            if state.epoch > prev_epoch {
                for entry in self.outbox.values_mut() {
                    if entry.conversation_id == conversation_id
                        && entry.epoch < state.epoch
                        && !entry.delivered
                    {
                        entry.stale = true;
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;

    fn make_envelope(conversation_id: ConversationId, epoch: Epoch) -> CipherEnvelope {
        CipherEnvelope {
            envelope_id: uuid::Uuid::new_v4().to_string(),
            conversation_id,
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

    // ── Finding 1: protocol/core boundary ────────────────────────────────────

    #[test]
    fn adapter_round_trip_preserves_all_fields() {
        let cid = ConversationId::new();
        let original = make_envelope(cid, 2);
        let entry = PersistedOutboxEntry::from_cipher_envelope(original.clone());
        let recovered = entry.to_cipher_envelope();

        assert_eq!(recovered.envelope_id, original.envelope_id);
        assert_eq!(recovered.conversation_id, original.conversation_id);
        assert_eq!(recovered.epoch, original.epoch);
        assert_eq!(recovered.ciphertext, original.ciphertext);
        assert_eq!(recovered.attachment_ids, original.attachment_ids);
        assert_eq!(recovered.client_message_id, original.client_message_id);
        assert_eq!(recovered.sender_account_id, original.sender_account_id);
        assert_eq!(recovered.sender_device_id, original.sender_device_id);
        assert_eq!(recovered.recipient_device_id, original.recipient_device_id);
    }

    // ── Finding 2: epoch rotation / stale outbox ─────────────────────────────

    #[test]
    fn rotate_epoch_marks_old_outbox_entries_stale() {
        let mut state = ClientState::default();
        let cid = ConversationId::new();
        let envelope = make_envelope(cid, 1);
        let envelope_id = envelope.envelope_id.clone();

        state.enqueue(envelope);
        assert!(!state.outbox[&envelope_id].stale, "should start as active");

        state.rotate_epoch(cid, 2);
        assert!(
            state.outbox[&envelope_id].stale,
            "epoch-1 entry should be stale after rotation to epoch 2"
        );
    }

    #[test]
    fn enqueue_with_stale_epoch_is_immediately_stale() {
        let mut state = ClientState::default();
        let cid = ConversationId::new();
        // Advance the conversation to epoch 3 before enqueueing.
        state.rotate_epoch(cid, 3);
        let old_envelope = make_envelope(cid, 1);
        let envelope_id = old_envelope.envelope_id.clone();

        state.enqueue(old_envelope);
        assert!(
            state.outbox[&envelope_id].stale,
            "epoch-1 envelope in an epoch-3 conversation must be immediately stale"
        );
    }

    #[test]
    fn delivered_entries_are_not_quarantined_by_rotation() {
        let mut state = ClientState::default();
        let cid = ConversationId::new();
        let envelope = make_envelope(cid, 1);
        let envelope_id = envelope.envelope_id.clone();

        state.enqueue(envelope);
        state.mark_delivered(&envelope_id);
        state.rotate_epoch(cid, 2);

        assert!(
            !state.outbox[&envelope_id].stale,
            "already-delivered entries must not be marked stale"
        );
    }

    #[test]
    fn epoch_rotation_is_monotonic() {
        let mut state = ClientState::default();
        let cid = ConversationId::new();
        state.enqueue(make_envelope(cid, 1));
        state.rotate_epoch(cid, 3);
        state.rotate_epoch(cid, 2); // must not regress

        assert_eq!(state.conversations[&cid].epoch, 3);
    }

    // ── Finding 3: typed-ID map key invariants ───────────────────────────────

    #[test]
    fn conversation_map_key_matches_embedded_id() {
        let mut state = ClientState::default();
        let cid = ConversationId::new();
        state.upsert_conversation(cid);

        for (key, conv) in &state.conversations {
            assert_eq!(*key, conv.conversation_id, "map key must equal embedded id");
        }
    }

    #[test]
    fn contact_label_map_key_matches_embedded_account_id() {
        let mut state = ClientState::default();
        let account_id = AccountId::new();
        state.label_contact(ContactLabel {
            account_id,
            local_label: "Arlo".into(),
            private_note: None,
            updated_at: Utc::now(),
        });

        for (key, label) in &state.contact_labels {
            assert_eq!(*key, label.account_id, "map key must equal embedded account_id");
        }
    }

    // ── Finding 4: durable-state invariants ──────────────────────────────────

    #[test]
    fn client_state_serializes_and_round_trips() {
        let mut state = ClientState::default();
        let cid = ConversationId::new();
        let attachment_id = uuid::Uuid::new_v4().to_string();
        let account_id = AccountId::new();

        state.enqueue(make_envelope(cid, 1));
        state.remember_media(MediaVaultEntry {
            attachment_id: attachment_id.clone(),
            conversation_id: cid,
            file_name: "voice.ogg".into(),
            mime_type: "audio/ogg".into(),
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

        let json = serde_json::to_string(&state).expect("state must serialise");
        let recovered: ClientState =
            serde_json::from_str(&json).expect("state must deserialise");

        assert_eq!(recovered.conversations.len(), state.conversations.len());
        assert_eq!(recovered.outbox.len(), state.outbox.len());
        assert_eq!(recovered.media_vault.len(), state.media_vault.len());
        assert_eq!(recovered.contact_labels.len(), state.contact_labels.len());

        // Key/ID consistency survives the round-trip.
        for (key, conv) in &recovered.conversations {
            assert_eq!(*key, conv.conversation_id);
        }
        for (key, label) in &recovered.contact_labels {
            assert_eq!(*key, label.account_id);
        }
    }

    #[test]
    fn mark_delivered_flips_flag_and_does_not_remove_entry() {
        let mut state = ClientState::default();
        let cid = ConversationId::new();
        let envelope = make_envelope(cid, 1);
        let envelope_id = envelope.envelope_id.clone();

        state.enqueue(envelope);
        assert!(!state.outbox[&envelope_id].delivered);

        state.mark_delivered(&envelope_id);
        assert!(state.outbox[&envelope_id].delivered, "entry must be marked delivered");
        assert!(
            state.outbox.contains_key(&envelope_id),
            "entry must not be removed on delivery"
        );
    }

    #[test]
    fn enqueue_tracks_pending_envelopes() {
        let mut state = ClientState::default();
        let cid = ConversationId::new();
        let envelope = make_envelope(cid, 1);
        let envelope_id = envelope.envelope_id.clone();

        state.enqueue(envelope);
        assert!(state.outbox.contains_key(&envelope_id));
        assert!(!state.outbox[&envelope_id].delivered);
        assert!(!state.outbox[&envelope_id].stale);
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
        assert!(state.contact_labels.contains_key(&account_id));
    }
}
