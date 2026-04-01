use emberchamber_core::ClientState;
use tauri::{WebviewUrl, WebviewWindowBuilder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let _bootstrap_state = ClientState::default();

            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("EmberChamber")
                .inner_size(1280.0, 860.0)
                .min_inner_size(420.0, 640.0)
                .resizable(true)
                .center()
                .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running EmberChamber");
}
