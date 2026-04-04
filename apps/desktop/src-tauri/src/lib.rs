use emberchamber_core::ClientState;
use serde_json::Value;
use tauri::{WebviewUrl, WebviewWindowBuilder};

mod secure_state;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_secure_state,
            save_secure_state,
            clear_secure_state
        ])
        .setup(|app| {
            let _bootstrap_state = ClientState::default();

            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
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
