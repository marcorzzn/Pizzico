// Pizzico — crates/wasm-bindings/src/lib.rs
// Riferimento manifesto: §3.1, §4, §11 Step 8
// Licenza: MIT OR Apache-2.0

//! # Pizzico WebAssembly Bindings
//!
//! Interfaccia tra il core ad alte prestazioni Rust e l'interfaccia utente TypeScript.

use pizzico_commands::CommandRegistry;
use pizzico_core::{Document, composite_layers};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn init_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Funzione di verifica minima per testare l'integrità della pipeline WASM (§11 Step 8)
#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

/// Istanza del motore grafico caricata nel contesto Web / Worker
#[wasm_bindgen]
pub struct PizzicoEngine {
    document: Document,
    #[allow(dead_code)]
    registry: CommandRegistry,
}

#[wasm_bindgen]
impl PizzicoEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32, title: &str) -> Self {
        Self {
            document: Document::new(width, height, title),
            registry: CommandRegistry::new(),
        }
    }

    pub fn width(&self) -> u32 {
        self.document.width
    }

    pub fn height(&self) -> u32 {
        self.document.height
    }

    pub fn layer_count(&self) -> usize {
        self.document.layers.len()
    }

    pub fn get_document_json(&self) -> Result<String, JsValue> {
        serde_json::to_string(&self.document)
            .map_err(|e| JsValue::from_str(&format!("Errore serializzazione documento: {}", e)))
    }

    /// Esegue il compositing e restituisce il buffer RGBA 8-bit per il rendering su Canvas/WebGPU
    pub fn render_frame(&self) -> Vec<u8> {
        let buffer = composite_layers(&self.document.layers, self.document.width, self.document.height);
        buffer.data
    }
}
