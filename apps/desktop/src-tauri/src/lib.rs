use privatemesh_domain::telemetry::init_tracing;

/// Tauri application entry point — called from `main.rs` on desktop and
/// from the mobile runtime on Android / iOS.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_tracing("privatemesh-desktop");

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running PrivateMesh");
}

/// Placeholder IPC command — replaced by real SDK calls in Sprint 2.
#[tauri::command]
fn greet(name: &str) -> String {
    format!("PrivateMesh — welcome, {name}!")
}
