// The desktop binary entry point.
// On mobile (Android/iOS) Tauri calls `lib.rs::run()` directly.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    emberchamber_desktop_lib::run();
}
