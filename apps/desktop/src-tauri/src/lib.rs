use emberchamber_core::ClientState;
use serde_json::Value;
use tauri::{WebviewUrl, WebviewWindowBuilder};

mod secure_state;

// The tauri-plugin-updater integration (auto-update) was removed here: it
// requires a real Ed25519 signing keypair for update manifests, which does
// not exist yet (auto-update is still listed as deferred in
// docs/launch-targets.md), and a plugin registered with an incomplete
// config ("plugins.updater" without "pubkey") panics on startup rather than
// staying inertly inactive. Nothing in the current frontend calls update
// commands. Re-add properly (real keypair, signed release artifacts) when
// auto-update is actually implemented.

#[tauri::command]
fn load_secure_state(app: tauri::AppHandle) -> Result<secure_state::SecureStateSnapshot, String> {
    secure_state::load(&app)
}

#[tauri::command]
fn save_secure_state(
    app: tauri::AppHandle,
    state: Value,
) -> Result<secure_state::SecureStateSnapshot, String> {
    secure_state::save(&app, state)
}

#[tauri::command]
fn clear_secure_state(app: tauri::AppHandle) -> Result<secure_state::SecureStateSnapshot, String> {
    secure_state::clear(&app)
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    let parsed = url::Url::parse(&url).map_err(|error| error.to_string())?;
    match parsed.scheme() {
        "http" | "https" => {}
        scheme => {
            return Err(format!("Unsupported URL scheme: {scheme}"));
        }
    }

    webbrowser::open(parsed.as_str()).map_err(|error| error.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_secure_state,
            save_secure_state,
            clear_secure_state,
            open_external_url
        ])
        .setup(|app| {
            let _bootstrap_state = ClientState::default();

            // "index.html" is the marketing homepage in the static web
            // export; the desktop shell should land straight on the
            // sign-in/onboarding router instead.
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("start.html".into()))
                .title("EmberChamber")
                .inner_size(1280.0, 860.0)
                .min_inner_size(420.0, 640.0)
                .content_protected(true)
                .resizable(true)
                .center()
                .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running EmberChamber");
}
