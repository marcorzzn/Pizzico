// Pizzico — crates/wasm-bindings/src/lib.rs
// Riferimento manifesto: §3.1, §4, §6.2, §11 Step 8
// Licenza: MIT OR Apache-2.0

//! # Pizzico WebAssembly Bindings
//!
//! Interfaccia ufficiale `#[wasm_bindgen]` tra il core engine Rust e
//! la shell TypeScript.  Usa le macro wasm-bindgen per garantire che il
//! bridge JS ↔ Rust sia generato dallo strumento canonico (`wasm-pack`).
//!
//! ## Esportazioni pubbliche
//! - `init_panic_hook()` — attiva stack trace leggibili in DevTools
//! - `add(a, b) -> i32` — verifica minima della pipeline WASM (§11 Step 8)
//! - `pizzico_version() -> u32` — versione numerica del core (100 = v0.1.0)
//! - `PizzicoEngine` — struttura principale con `new()` e `layer_count()`
//! - `init_webgpu(canvas_id: &str) -> Promise` — avvia wgpu via web-sys,
//!   aggancia il Surface al `<canvas>` HTML e lancia il render loop WGSL

use wasm_bindgen::prelude::*;

mod gpu;

// ──────────────────────────────────────────────────────────────────────────────
// Utility – panic hook
// ──────────────────────────────────────────────────────────────────────────────

/// Installa il panic hook di `console_error_panic_hook`.
/// Chiamato UNA volta al boot del modulo WASM per ottenere backtrace
/// leggibili nella console del browser.
#[wasm_bindgen(start)]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

// ──────────────────────────────────────────────────────────────────────────────
// Verifica minimale pipeline (§11 Step 8)
// ──────────────────────────────────────────────────────────────────────────────

/// Verifica l'integrità della pipeline WASM: addizione intera.
/// `add(2, 3)` deve restituire `5`.
#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

/// Versione del core come intero (100 = v0.1.0, 200 = v0.2.0, …).
#[wasm_bindgen]
pub fn pizzico_version() -> u32 {
    100
}

// ──────────────────────────────────────────────────────────────────────────────
// Core Engine handle
// ──────────────────────────────────────────────────────────────────────────────

use pizzico_commands::CommandRegistry;
use pizzico_core::Document;

/// Handle principale all'engine grafico esposto al JavaScript.
#[wasm_bindgen]
pub struct PizzicoEngine {
    document: Document,
    #[allow(dead_code)]
    registry: CommandRegistry,
}

#[wasm_bindgen]
impl PizzicoEngine {
    /// Crea un nuovo documento vuoto con le dimensioni specificate.
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32, title: &str) -> Self {
        Self {
            document: Document::new(width, height, title),
            registry: CommandRegistry::new(),
        }
    }

    /// Larghezza del documento corrente in pixel.
    pub fn width(&self) -> u32 {
        self.document.width
    }

    /// Altezza del documento corrente in pixel.
    pub fn height(&self) -> u32 {
        self.document.height
    }

    /// Numero di livelli presenti nel documento.
    pub fn layer_count(&self) -> usize {
        self.document.layers.len()
    }

    /// Serializza il documento in JSON (utile per DevTools e testing).
    pub fn get_document_json(&self) -> Result<String, JsValue> {
        serde_json::to_string(&self.document)
            .map_err(|e| JsValue::from_str(&format!("Errore serializzazione documento: {}", e)))
    }

    /// Esegue il compositing e restituisce il buffer RGBA 8-bit per Canvas.
    pub fn render_frame(&self) -> Vec<u8> {
        use pizzico_core::composite_layers;
        let buffer = composite_layers(
            &self.document.layers,
            self.document.width,
            self.document.height,
        );
        buffer.data
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// WebGPU Canvas Renderer (§6.2 — Kilgard & Bolz 2012)
// ──────────────────────────────────────────────────────────────────────────────

/// Inizializza WebGPU tramite web-sys, aggancia il Surface al `<canvas>`
/// identificato da `canvas_id`, e avvia il render loop a 60 FPS.
///
/// Il render loop esegue il seguente frame:
/// 1. Clear color scuro di sfondo
/// 2. Disegno del rettangolo con shader WGSL (6 vertici, 2 triangoli)
///    con la palette brand Pizzico (Indigo, Cyan, Rose, Purple)
///
/// Ritorna un `Promise<void>` — deve essere atteso con `await` in JS/TS.
#[wasm_bindgen]
pub async fn init_webgpu(canvas_id: &str) -> Result<(), JsValue> {
    gpu::render::init_webgpu_canvas(canvas_id).await
}
