use emberchamber_relay_protocol::{
    AttachmentTicket, AuthSession, AuthStartRequest, ConversationDetail, ConversationSummary,
    DeviceLinkStatus, EnvelopeBatch, GroupInviteRecord, GroupMembershipSummary, GroupThreadMessage,
    MailboxAck, MeProfile, PrivacySettings, ReportDisclosure, SessionDescriptor,
};
use serde::{de::DeserializeOwned, Serialize};
use serde_json::Value;

fn fixture_root() -> Value {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../packages/protocol/test/fixtures/protocol-parity.json");
    serde_json::from_str(&std::fs::read_to_string(path).expect("load protocol parity fixture"))
        .expect("parse protocol parity fixture")
}

fn assert_roundtrip<T>(root: &Value, key: &str)
where
    T: Serialize + DeserializeOwned,
{
    let fixture = root
        .get(key)
        .unwrap_or_else(|| panic!("missing fixture key: {key}"))
        .clone();
    let decoded: T = serde_json::from_value(fixture.clone())
        .unwrap_or_else(|error| panic!("deserialize {key}: {error}"));
    let encoded =
        serde_json::to_value(decoded).unwrap_or_else(|error| panic!("serialize {key}: {error}"));
    assert_eq!(encoded, fixture, "fixture mismatch for {key}");
}

#[test]
fn rust_protocol_matches_shared_protocol_fixtures() {
    let root = fixture_root();

    assert_roundtrip::<AuthStartRequest>(&root, "authStartRequest");
    assert_roundtrip::<AuthSession>(&root, "authSession");
    assert_roundtrip::<AttachmentTicket>(&root, "attachmentTicket");
    assert_roundtrip::<MailboxAck>(&root, "mailboxAck");
    assert_roundtrip::<EnvelopeBatch>(&root, "envelopeBatch");
    assert_roundtrip::<ConversationSummary>(&root, "conversationSummary");
    assert_roundtrip::<ConversationDetail>(&root, "conversationDetail");
    assert_roundtrip::<DeviceLinkStatus>(&root, "deviceLinkStatus");
    assert_roundtrip::<GroupInviteRecord>(&root, "groupInviteRecord");
    assert_roundtrip::<GroupMembershipSummary>(&root, "groupMembershipSummary");
    assert_roundtrip::<GroupThreadMessage>(&root, "groupThreadMessage");
    assert_roundtrip::<MeProfile>(&root, "meProfile");
    assert_roundtrip::<PrivacySettings>(&root, "privacySettings");
    assert_roundtrip::<SessionDescriptor>(&root, "sessionDescriptor");
    assert_roundtrip::<ReportDisclosure>(&root, "reportDisclosure");
}
