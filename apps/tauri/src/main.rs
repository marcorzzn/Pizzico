// Pizzico — apps/tauri/src/main.rs
// Riferimento manifesto: §3.1, §4, §11 Step 4
// Licenza: MIT OR Apache-2.0
//
// Guscio desktop: tutta la logica sta nella libreria, così la stessa base
// di codice serve il binario Windows/Linux/macOS e l'APK Android.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    pizzico_tauri::run();
}
