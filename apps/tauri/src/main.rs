// Pizzico — apps/tauri/src/main.rs
// Riferimento manifesto: §3.1, §4, §11 Step 4
// Licenza: MIT OR Apache-2.0

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("Errore durante l'esecuzione dell'applicazione Tauri Pizzico");
}
