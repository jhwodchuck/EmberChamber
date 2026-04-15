use emberchamber_core::ClientState;
use serde::Serialize;
use serde_json::Value;
use tauri::{WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_updater::UpdaterExt;

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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppUpdateStatus {
    available: bool,
    current_version: String,
    version: Option<String>,
    date: Option<String>,
    body: Option<String>,
}

#[tauri::command]
async fn check_for_app_update(app: tauri::AppHandle) -> Result<AppUpdateStatus, String> {
    let current_version = app.package_info().version.to_string();
    let update = app
        .updater()
        .map_err(|error| format!("Updater init failed: {error}"))?
        .check()
        .await
        .map_err(|error| format!("Update check failed: {error}"))?;

    if let Some(update) = update {
        return Ok(AppUpdateStatus {
            available: true,
            current_version,
            version: Some(update.version),
            date: update.date.map(|date| date.to_string()),
            body: update.body,
        });
    }

    Ok(AppUpdateStatus {
        available: false,
        current_version,
        version: None,
        date: None,
        body: None,
    })
}

#[tauri::command]
async fn install_app_update(app: tauri::AppHandle) -> Result<String, String> {
    let update = app
        .updater()
        .map_err(|error| format!("Updater init failed: {error}"))?
        .check()
        .await
        .map_err(|error| format!("Update check failed: {error}"))?;

    let Some(update) = update else {
        return Ok("No update is currently available.".to_string());
    };

    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|error| format!("Update install failed: {error}"))?;

    app.restart();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            load_secure_state,
            save_secure_state,
            clear_secure_state,
            open_external_url,
            check_for_app_update,
            install_app_update
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
