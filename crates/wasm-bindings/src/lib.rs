// Pizzico — crates/wasm-bindings/src/lib.rs
// Riferimento manifesto: §3.1, §4, §6.1, §6.2, §11 Step 8
// Licenza: MIT OR Apache-2.0

//! # Pizzico WebAssembly Bindings
//!
//! Interfaccia ufficiale `#[wasm_bindgen]` tra il core engine Rust e
//! la shell TypeScript. Usa le macro wasm-bindgen per garantire che il
//! bridge JS ↔ Rust sia generato dallo strumento canonico (`wasm-pack`).
//!
//! ## Esportazioni pubbliche
//! - `init_panic_hook()` — attiva stack trace leggibili in DevTools
//! - `add(a, b) -> i32` — verifica minima della pipeline WASM (§11 Step 8)
//! - `pizzico_version() -> u32` — versione numerica del core (100 = v0.1.0)
//! - `create_document(width, height)` — crea o resetta il documento attivo
//! - `add_raster_layer(name, width, height, color)` — aggiunge un livello raster uniforme
//! - `get_composite_buffer() -> Vec<u8>` — compositing RGBA 8-bit multi-livello
//! - `PizzicoEngine` — handle principale a documento e cronologia comandi
//! - `init_webgpu(canvas_id: &str) -> Promise` — avvia il render loop WebGPU

use std::cell::RefCell;
use std::sync::atomic::{AtomicBool, Ordering};
use wasm_bindgen::prelude::*;

use pizzico_commands::CommandRegistry;
use pizzico_core::{Document, Layer};

pub mod gpu;

// ──────────────────────────────────────────────────────────────────────────────
// Stato Globale Documento Attivo (Thread-Local per runtime WASM)
// ──────────────────────────────────────────────────────────────────────────────

thread_local! {
    static ACTIVE_DOCUMENT: RefCell<Document> = RefCell::new(Document::new(800, 600, "Pizzico Project"));
}

static DOCUMENT_DIRTY: AtomicBool = AtomicBool::new(true);

/// Indica se il documento è stato modificato dall'ultimo frame di rendering.
pub fn is_document_dirty() -> bool {
    DOCUMENT_DIRTY.load(Ordering::Relaxed)
}

/// Imposta lo stato dirty del documento.
pub fn set_document_dirty(dirty: bool) {
    DOCUMENT_DIRTY.store(dirty, Ordering::Relaxed);
}

/// Esegue una closure con riferimento immutabile al documento attivo.
pub fn with_active_document<F, R>(f: F) -> R
where
    F: FnOnce(&Document) -> R,
{
    ACTIVE_DOCUMENT.with(|doc| f(&doc.borrow()))
}

/// Esegue una closure con riferimento mutabile al documento attivo e segnala dirty.
pub fn with_active_document_mut<F, R>(f: F) -> R
where
    F: FnOnce(&mut Document) -> R,
{
    ACTIVE_DOCUMENT.with(|doc| {
        let r = f(&mut doc.borrow_mut());
        set_document_dirty(true);
        r
    })
}

// ──────────────────────────────────────────────────────────────────────────────
// Utility – panic hook
// ──────────────────────────────────────────────────────────────────────────────

/// Installa il panic hook di `console_error_panic_hook`.
#[wasm_bindgen(start)]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

// ──────────────────────────────────────────────────────────────────────────────
// Funzioni di verifica minimale pipeline (§11 Step 8)
// ──────────────────────────────────────────────────────────────────────────────

/// Verifica l'integrità della pipeline WASM: addizione intera.
#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

/// Versione del core come intero (100 = v0.1.0).
#[wasm_bindgen]
pub fn pizzico_version() -> u32 {
    100
}

// ──────────────────────────────────────────────────────────────────────────────
// API Document & Layer Bridge (§4, §6.1)
// ──────────────────────────────────────────────────────────────────────────────

/// Crea o resetta il documento attivo con larghezza e altezza specificate.
#[wasm_bindgen]
pub fn create_document(width: u32, height: u32) {
    with_active_document_mut(|doc| {
        *doc = Document::new_empty(width, height);
    });
}

/// Aggiunge un nuovo livello raster al documento attivo riempito con un colore RGBA uniforme.
/// Ritorna l'ID univoco del livello appena creato.
#[wasm_bindgen]
pub fn add_raster_layer(name: &str, width: u32, height: u32, color: &[u8]) -> u64 {
    let col = if color.len() >= 4 {
        [color[0], color[1], color[2], color[3]]
    } else {
        [255, 255, 255, 255]
    };

    with_active_document_mut(|doc| {
        let id = doc.allocate_layer_id();
        let layer = Layer::new_raster_color(id, name, width, height, col);
        doc.add_layer(layer)
    })
}

/// Restituisce il buffer RGBA 8-bit calcolato fondendo tutti i livelli visibili del documento.
#[wasm_bindgen]
pub fn get_composite_buffer() -> Vec<u8> {
    with_active_document(|doc| pizzico_core::composite_layers(doc))
}

/// Restituisce le dimensioni [larghezza, altezza] del documento attivo in pixel.
#[wasm_bindgen]
pub fn get_document_dimensions() -> Vec<u32> {
    with_active_document(|doc| vec![doc.width, doc.height])
}

/// Restituisce il numero di livelli presenti nel documento attivo.
#[wasm_bindgen]
pub fn get_layer_count() -> usize {
    with_active_document(|doc| doc.layer_count())
}

// ──────────────────────────────────────────────────────────────────────────────
// Core Engine handle
// ──────────────────────────────────────────────────────────────────────────────

/// Handle principale all'engine grafico esposto al JavaScript.
#[wasm_bindgen]
pub struct PizzicoEngine {
    #[allow(dead_code)]
    registry: CommandRegistry,
}

#[wasm_bindgen]
impl PizzicoEngine {
    /// Inizializza l'istanza dell'engine con un nuovo documento.
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32, title: &str) -> Self {
        with_active_document_mut(|doc| {
            *doc = Document::new(width, height, title);
        });
        Self {
            registry: CommandRegistry::new(),
        }
    }

    /// Larghezza del documento corrente in pixel.
    pub fn width(&self) -> u32 {
        with_active_document(|doc| doc.width)
    }

    /// Altezza del documento corrente in pixel.
    pub fn height(&self) -> u32 {
        with_active_document(|doc| doc.height)
    }

    /// Numero di livelli presenti nel documento.
    pub fn layer_count(&self) -> usize {
        with_active_document(|doc| doc.layer_count())
    }

    /// Crea un nuovo documento.
    pub fn create_document(&mut self, width: u32, height: u32) {
        create_document(width, height);
    }

    /// Aggiunge un livello raster uniforme.
    pub fn add_raster_layer(&mut self, name: &str, width: u32, height: u32, color: &[u8]) -> u64 {
        add_raster_layer(name, width, height, color)
    }

    /// Esegue il compositing e restituisce il buffer RGBA 8-bit per Canvas.
    pub fn render_frame(&self) -> Vec<u8> {
        get_composite_buffer()
    }

    /// Serializza il documento in formato JSON.
    pub fn get_document_json(&self) -> Result<String, JsValue> {
        with_active_document(|doc| {
            serde_json::to_string(doc)
                .map_err(|e| JsValue::from_str(&format!("Errore serializzazione documento: {}", e)))
        })
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// WebGPU Canvas Renderer (§6.2 — Kilgard & Bolz 2012)
// ──────────────────────────────────────────────────────────────────────────────

/// Inizializza WebGPU tramite web-sys, aggancia il Surface al `<canvas>`
/// identificato da `canvas_id`, e avvia il render loop a 60 FPS che campiona
/// la texture del Documento composito.
#[wasm_bindgen]
pub async fn init_webgpu(canvas_id: &str) -> Result<(), JsValue> {
    gpu::render::init_webgpu_canvas(canvas_id).await
}
