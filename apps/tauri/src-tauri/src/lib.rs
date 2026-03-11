#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init());

    #[cfg(debug_assertions)]
    let builder = builder.setup(|app| {
        use tauri::Manager;
        if let Some(window) = app.get_webview_window("main") {
            window.open_devtools();
        }
        Ok(())
    });

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
