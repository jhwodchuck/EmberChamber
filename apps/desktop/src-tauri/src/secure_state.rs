use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, Runtime};

const KEYRING_SERVICE: &str = "com.emberchamber.desktop";
const KEYRING_USER: &str = "desktop-shell-state";
const SECURE_STATE_FILE_NAME: &str = "secure-state.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecureStateSnapshot {
    pub state: Value,
    pub storage_mode: String,
    pub detail: Option<String>,
    pub storage_path: Option<String>,
}

impl SecureStateSnapshot {
    fn new(state: Value, storage_mode: &str, detail: Option<String>, storage_path: Option<PathBuf>) -> Self {
        Self {
            state: normalize_state(state),
            storage_mode: storage_mode.to_string(),
            detail,
            storage_path: storage_path.map(|path| path.display().to_string()),
        }
    }

    fn empty(storage_mode: &str, detail: Option<String>, storage_path: Option<PathBuf>) -> Self {
        Self::new(empty_state(), storage_mode, detail, storage_path)
    }
}

pub fn load<R: Runtime>(app: &AppHandle<R>) -> Result<SecureStateSnapshot, String> {
    let file_path = secure_state_file_path(app)?;

    match load_from_keyring() {
        Ok(Some(state)) => Ok(SecureStateSnapshot::new(state, "keyring", None, None)),
        Ok(None) => match load_from_file(&file_path)? {
            Some(state) => Ok(SecureStateSnapshot::new(
                state,
                "file",
                Some("Using restricted local file fallback instead of the system keyring.".to_string()),
                Some(file_path),
            )),
            None => Ok(SecureStateSnapshot::empty("keyring", None, None)),
        },
        Err(error) => match load_from_file(&file_path)? {
            Some(state) => Ok(SecureStateSnapshot::new(state, "file", Some(error), Some(file_path))),
            None => Ok(SecureStateSnapshot::empty("memory", Some(error), None)),
        },
    }
}

pub fn save<R: Runtime>(app: &AppHandle<R>, state: Value) -> Result<SecureStateSnapshot, String> {
    let normalized_state = normalize_state(state);
    let file_path = secure_state_file_path(app)?;

    match save_to_keyring(&normalized_state) {
        Ok(()) => {
            let _ = remove_file_if_exists(&file_path);
            Ok(SecureStateSnapshot::new(normalized_state, "keyring", None, None))
        }
        Err(error) => {
            write_to_file(&file_path, &normalized_state)?;
            Ok(SecureStateSnapshot::new(
                normalized_state,
                "file",
                Some(error),
                Some(file_path),
            ))
        }
    }
}

pub fn clear<R: Runtime>(app: &AppHandle<R>) -> Result<SecureStateSnapshot, String> {
    let file_path = secure_state_file_path(app)?;
    let keyring_result = clear_keyring();
    remove_file_if_exists(&file_path)?;

    match keyring_result {
        Ok(()) => Ok(SecureStateSnapshot::empty("keyring", None, None)),
        Err(error) => Ok(SecureStateSnapshot::empty("memory", Some(error), None)),
    }
}

fn empty_state() -> Value {
    Value::Object(Map::new())
}

fn normalize_state(state: Value) -> Value {
    match state {
        Value::Object(_) => state,
        _ => empty_state(),
    }
}

fn secure_state_file_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("Unable to resolve app config directory: {error}"))?;
    Ok(dir.join(SECURE_STATE_FILE_NAME))
}

fn load_from_file(path: &Path) -> Result<Option<Value>, String> {
    if !path.exists() {
        return Ok(None);
    }

    let raw = fs::read_to_string(path)
        .map_err(|error| format!("Unable to read secure state fallback file {}: {error}", path.display()))?;

    if raw.trim().is_empty() {
        return Ok(None);
    }

    let parsed = serde_json::from_str::<Value>(&raw).map_err(|error| {
        format!(
            "Secure state fallback file {} is unreadable JSON: {error}",
            path.display()
        )
    })?;

    Ok(Some(normalize_state(parsed)))
}

fn write_to_file(path: &Path, state: &Value) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Unable to create secure state directory {}: {error}", parent.display()))?;
    }

    let bytes = serde_json::to_vec(state).map_err(|error| format!("Unable to serialize secure state: {error}"))?;

    #[cfg(unix)]
    {
        use std::fs::OpenOptions;
        use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};

        let mut file = OpenOptions::new()
            .create(true)
            .truncate(true)
            .write(true)
            .mode(0o600)
            .open(path)
            .map_err(|error| format!("Unable to open secure state fallback file {}: {error}", path.display()))?;

        file.write_all(&bytes)
            .map_err(|error| format!("Unable to write secure state fallback file {}: {error}", path.display()))?;

        fs::set_permissions(path, fs::Permissions::from_mode(0o600)).map_err(|error| {
            format!(
                "Unable to tighten permissions on secure state fallback file {}: {error}",
                path.display()
            )
        })?;
    }

    #[cfg(not(unix))]
    {
        fs::write(path, &bytes)
            .map_err(|error| format!("Unable to write secure state fallback file {}: {error}", path.display()))?;
    }

    Ok(())
}

fn remove_file_if_exists(path: &Path) -> Result<(), String> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!(
            "Unable to remove secure state fallback file {}: {error}",
            path.display()
        )),
    }
}

#[cfg(any(target_os = "linux", target_os = "windows", target_os = "macos", target_os = "ios"))]
fn keyring_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER)
        .map_err(|error| format!("Unable to initialize system keyring entry: {error}"))
}

#[cfg(any(target_os = "linux", target_os = "windows", target_os = "macos", target_os = "ios"))]
fn load_from_keyring() -> Result<Option<Value>, String> {
    let entry = keyring_entry()?;
    match entry.get_password() {
        Ok(raw) => serde_json::from_str::<Value>(&raw)
            .map(normalize_state)
            .map(Some)
            .map_err(|error| format!("Stored system keyring state is unreadable JSON: {error}")),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(format!("System keyring load failed: {error}")),
    }
}

#[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos", target_os = "ios")))]
fn load_from_keyring() -> Result<Option<Value>, String> {
    Err("System keyring is not supported on this desktop build.".to_string())
}

#[cfg(any(target_os = "linux", target_os = "windows", target_os = "macos", target_os = "ios"))]
fn save_to_keyring(state: &Value) -> Result<(), String> {
    let entry = keyring_entry()?;
    let raw = serde_json::to_string(state).map_err(|error| format!("Unable to serialize secure state: {error}"))?;
    entry
        .set_password(&raw)
        .map_err(|error| format!("System keyring save failed: {error}"))
}

#[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos", target_os = "ios")))]
fn save_to_keyring(_state: &Value) -> Result<(), String> {
    Err("System keyring is not supported on this desktop build.".to_string())
}

#[cfg(any(target_os = "linux", target_os = "windows", target_os = "macos", target_os = "ios"))]
fn clear_keyring() -> Result<(), String> {
    let entry = keyring_entry()?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(format!("System keyring clear failed: {error}")),
    }
}

#[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos", target_os = "ios")))]
fn clear_keyring() -> Result<(), String> {
    Err("System keyring is not supported on this desktop build.".to_string())
}
