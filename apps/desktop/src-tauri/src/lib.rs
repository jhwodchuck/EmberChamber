use tauri::{WebviewUrl, WebviewWindowBuilder};

const DEV_APP_URL: &str = "http://localhost:3000";

fn launch_url() -> Result<WebviewUrl, String> {
    if cfg!(debug_assertions) {
        let url = url::Url::parse(DEV_APP_URL).map_err(|error| error.to_string())?;
        return Ok(WebviewUrl::External(url));
    }

    if let Some(app_url) = option_env!("PRIVATEMESH_APP_URL") {
        let url = url::Url::parse(app_url).map_err(|error| error.to_string())?;
        return Ok(WebviewUrl::External(url));
    }

    Ok(WebviewUrl::App("index.html".into()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let url = launch_url()
                .map_err(|error| std::io::Error::other(format!("invalid launch URL: {error}")))?;

            WebviewWindowBuilder::new(app, "main", url)
                .title("PrivateMesh")
                .inner_size(1280.0, 860.0)
                .min_inner_size(420.0, 640.0)
                .resizable(true)
                .center()
                .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running PrivateMesh");
}
