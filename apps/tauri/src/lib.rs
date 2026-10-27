// Pizzico — apps/tauri/src/lib.rs
// Riferimento manifesto: §3.1, §4, §11 Step 4
// Licenza: MIT OR Apache-2.0
//
// L'entry point vive qui, non nel binario: Tauri 2 su mobile carica il crate
// come libreria, quindi `main.rs` resta un guscio desktop.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// Avvia l'applicazione Tauri.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("Errore durante l'esecuzione dell'applicazione Tauri Pizzico");
}
