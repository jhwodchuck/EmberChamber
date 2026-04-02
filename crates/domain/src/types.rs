use serde::{Deserialize, Serialize};

/// Whether a conversation is a 1:1 DM (E2EE by default) or a hosted group/channel.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConversationKind {
    /// Direct message — end-to-end encrypted by default.
    DirectMessage,
    /// Group conversation — server-managed, not E2EE in MVP.
    Group,
    /// Broadcast channel — server-managed, not E2EE in MVP.
    Channel,
}

/// Role-based permission flags for a conversation or community scope.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct PermissionSet {
    pub can_send_messages: bool,
    pub can_delete_messages: bool,
    pub can_manage_members: bool,
    pub can_manage_invites: bool,
    pub can_manage_roles: bool,
    pub can_view_audit_log: bool,
    pub can_configure_community: bool,
    pub can_ban_members: bool,
    pub can_mute_members: bool,
}

impl PermissionSet {
    /// Full permissions granted to community owners.
    pub fn owner() -> Self {
        Self {
            can_send_messages: true,
            can_delete_messages: true,
            can_manage_members: true,
            can_manage_invites: true,
            can_manage_roles: true,
            can_view_audit_log: true,
            can_configure_community: true,
            can_ban_members: true,
            can_mute_members: true,
        }
    }

    /// Permissions for regular members.
    pub fn member() -> Self {
        Self {
            can_send_messages: true,
            ..Default::default()
        }
    }
}

/// User-configurable privacy preferences.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PrivacySettings {
    /// How much notification content should appear outside the app.
    pub notification_preview_mode: String,
    /// Whether sensitive media should download automatically.
    pub auto_download_sensitive_media: bool,
    /// Whether local exports of sensitive media are allowed.
    pub allow_sensitive_export: bool,
    /// Whether the app should request secure-window behavior on supported devices.
    pub secure_app_switcher: bool,
}

impl Default for PrivacySettings {
    fn default() -> Self {
        Self {
            notification_preview_mode: "discreet".into(),
            auto_download_sensitive_media: false,
            allow_sensitive_export: false,
            secure_app_switcher: true,
        }
    }
}
