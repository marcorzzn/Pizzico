// Pizzico — crates/wasm-bindings/src/lib.rs
// Riferimento manifesto: §3.1, §4, §6.1, §6.2, §10 Fase 1, §11 Step 8
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
//! - `begin_stroke()`, `brush_stroke()`, `eraser_stroke()`, `end_stroke()` — Brush Engine
//! - `undo()`, `redo()`, `can_undo()`, `can_redo()`, `get_history_info()` — History System

use std::cell::RefCell;
use std::sync::atomic::{AtomicBool, Ordering};
use wasm_bindgen::prelude::*;

use pizzico_commands::CommandRegistry;
use pizzico_core::{Document, LayerKind};
use pizzico_raster::brush::{BoundingBox, Brush};

pub mod engine;
pub mod gpu;

// ──────────────────────────────────────────────────────────────────────────────
// Stato Globale Documento Attivo & History (Thread-Local per runtime WASM)
// ──────────────────────────────────────────────────────────────────────────────

struct ActiveStrokeState {
    layer_id: u64,
    before_pixels: Vec<u8>,
    dirty_bbox: Option<BoundingBox>,
}

struct ActiveMoveState {
    layer_id: u64,
    initial_offset: (i32, i32),
}

// Backend del motore.
//
// In Fase 4.1 era sempre il legacy. Dalla 4.2.2 la scelta è di compilazione:
// `--features engine-v2` monta `V2Backend`, altrimenti resta `LegacyBackend`.
// Nessuna delle due configurazioni cambia il contratto JS.
#[cfg(not(feature = "engine-v2"))]
thread_local! {
    static BACKEND: RefCell<Box<dyn crate::engine::EngineBackend>> =
        RefCell::new(Box::new(crate::engine::legacy::LegacyBackend::new()));
}

#[cfg(feature = "engine-v2")]
thread_local! {
    static BACKEND: RefCell<Box<dyn crate::engine::EngineBackend>> =
        RefCell::new(Box::new(crate::engine::v2::V2Backend::new()));
}

thread_local! {
    static ACTIVE_STROKE: RefCell<Option<ActiveStrokeState>> = RefCell::new(None);
    static ACTIVE_MOVE: RefCell<Option<ActiveMoveState>> = RefCell::new(None);
}

static DOCUMENT_DIRTY: AtomicBool = AtomicBool::new(true);

/// Esegue una closure con il backend in sola lettura.
fn with_backend<R>(f: impl FnOnce(&dyn crate::engine::EngineBackend) -> R) -> R {
    BACKEND.with(|cell| f(&**cell.borrow()))
}

/// Esegue una closure con il backend modificabile.
fn with_backend_mut<R>(f: impl FnOnce(&mut dyn crate::engine::EngineBackend) -> R) -> R {
    BACKEND.with(|cell| f(&mut **cell.borrow_mut()))
}


/// Svuota la history del backend.
fn clear_history_via_backend() {
    with_backend_mut(|b| b.clear_history());
}

/// Indica se il documento è stato modificato dall'ultimo frame di rendering.
pub fn is_document_dirty() -> bool {
    DOCUMENT_DIRTY.load(Ordering::Relaxed)
}

/// Imposta lo stato dirty del documento.
pub fn set_document_dirty(dirty: bool) {
    DOCUMENT_DIRTY.store(dirty, Ordering::Relaxed);
}

/// Esegue una closure con riferimento immutabile al documento attivo.
///
/// Passa dal backend: il documento non è più un `thread_local` a sé, ma lo stato
/// interno del motore selezionato.
pub fn with_active_document<F, R>(f: F) -> R
where
    F: FnOnce(&Document) -> R,
{
    BACKEND.with(|cell| {
        let backend = cell.borrow();
        let doc = backend
            .legacy_document()
            .expect("accesso legacy richiesto a un backend che non lo espone");
        f(doc)
    })
}

/// Esegue una closure con riferimento mutabile al documento attivo e segnala dirty.
pub fn with_active_document_mut<F, R>(f: F) -> R
where
    F: FnOnce(&mut Document) -> R,
{
    BACKEND.with(|cell| {
        let mut backend = cell.borrow_mut();
        let r = {
            let doc = backend
                .legacy_document_mut()
                .expect("accesso legacy richiesto a un backend che non lo espone");
            f(doc)
        };
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
    // Il documento è ricreato dal backend scelto: la funzione non conosce più né
    // `Document::new_empty` né il tipo concreto del motore.
    BACKEND.with(|cell| cell.borrow_mut().create_document(width, height));
    clear_history_via_backend();
    ACTIVE_STROKE.with(|s| *s.borrow_mut() = None);
    set_document_dirty(true);
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

    // La funzione delega al backend: era l'unico punto con due prestiti annidati
    // (documento + history). Ora è il backend a occuparsi di entrambi, in modo atomico.
    with_backend_mut(|b| b.add_raster_layer(name, width, height, col))
}

/// Restituisce il buffer RGBA 8-bit calcolato fondendo tutti i livelli visibili del documento.
#[wasm_bindgen]
pub fn get_composite_buffer() -> Vec<u8> {
    with_backend(|b| b.composite())
}

/// Restituisce le dimensioni correnti del documento attivo come array `[width, height]`.
#[wasm_bindgen]
pub fn get_document_dimensions() -> Vec<u32> {
    with_backend(|b| vec![b.width(), b.height()])
}

/// Restituisce il numero di livelli presenti nel documento attivo.
#[wasm_bindgen]
pub fn get_layer_count() -> usize {
    with_backend(|b| b.layer_count())
}

/// DTO serializzabile per i metadati di un singolo livello.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LayerMetadataDto {
    pub id: u64,
    pub name: String,
    pub kind: String,
    pub visible: bool,
    pub locked: bool,
    pub opacity: f32,
    #[serde(rename = "blendMode")]
    pub blend_mode: String,
    #[serde(rename = "offsetX")]
    pub offset_x: i32,
    #[serde(rename = "offsetY")]
    pub offset_y: i32,
}

/// Restituisce i metadati di tutti i livelli presenti nel documento attivo come array JS.
#[wasm_bindgen]
pub fn get_layers_metadata() -> Result<JsValue, JsValue> {
    // I metadati vengono dal backend: il bridge non conosce più la struttura del
    // documento, solo il contratto `LayerMeta`.
    let dtos: Vec<LayerMetadataDto> = with_backend(|b| {
        b.layers_metadata()
            .into_iter()
            .map(|m| LayerMetadataDto {
                id: m.id,
                name: m.name,
                kind: m.kind,
                visible: m.visible,
                locked: m.locked,
                opacity: m.opacity,
                blend_mode: m.blend_mode,
                offset_x: m.offset_x,
                offset_y: m.offset_y,
            })
            .collect()
    });

    let json_str = serde_json::to_string(&dtos)
        .map_err(|e| JsValue::from_str(&format!("Errore serializzazione metadati livelli: {}", e)))?;
    js_sys::JSON::parse(&json_str)
}

/// Imposta l'opacità del livello specificato (0.0 - 1.0) e marca il documento dirty.
#[wasm_bindgen]
pub fn set_layer_opacity(id: u32, opacity: f32) {
    with_backend_mut(|b| b.set_layer_opacity(id as u64, opacity));
}

/// Imposta la visibilità del livello specificato e marca il documento dirty.
#[wasm_bindgen]
pub fn set_layer_visibility(id: u32, visible: bool) {
    // Il backend applica la modifica e accoda il proprio comando: il bridge non
    // costruisce più comandi legacy (prerequisito per il backend v2).
    with_backend_mut(|b| b.set_layer_visibility(id as u64, visible));
}

/// Seleziona il livello specificato come livello attivo nel documento.
#[wasm_bindgen]
pub fn select_layer(id: u32) {
    with_active_document_mut(|doc| {
        doc.select_layer(id as u64);
    });
}

/// Rimuove il livello specificato dal documento attivo.
#[wasm_bindgen]
pub fn remove_layer(id: u32) -> bool {
    with_backend_mut(|b| b.remove_layer(id as u64))
}

/// Restituisce l'ID del livello attualmente selezionato (se presente).
#[wasm_bindgen]
pub fn get_active_layer_id() -> Option<u32> {
    with_backend(|b| b.active_layer_id().map(|id| id as u32))
}

/// Verifica se il documento attivo necessita di un nuovo rendering WebGPU.
#[wasm_bindgen]
pub fn is_dirty() -> bool {
    is_document_dirty()
}

/// Imposta manualmente il flag dirty del documento attivo.
#[wasm_bindgen]
pub fn set_dirty(dirty: bool) {
    set_document_dirty(dirty);
}

/// DTO serializzabile per i metadati globali del Documento (dimensioni, titolo, conteggio livelli).
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DocumentMetadataDto {
    pub width: u32,
    pub height: u32,
    pub title: String,
    #[serde(rename = "layerCount")]
    pub layer_count: usize,
}

/// Restituisce i metadati globali del documento attivo in formato oggetto JSON.
#[wasm_bindgen]
pub fn get_document_metadata() -> Result<JsValue, JsValue> {
    let dto = with_active_document(|doc| DocumentMetadataDto {
        width: doc.width,
        height: doc.height,
        title: doc.metadata.title.clone(),
        layer_count: doc.layer_count(),
    });

    let json_str = serde_json::to_string(&dto)
        .map_err(|e| JsValue::from_str(&format!("Errore serializzazione metadati documento: {}", e)))?;
    js_sys::JSON::parse(&json_str)
}

/// Carica un file Adobe Photoshop (PSD/PSB) da buffer binario, sostituisce il Documento attivo
/// e segnala la necessità di un nuovo frame di compositing WebGPU.
#[wasm_bindgen]
pub fn load_psd_bytes(bytes: &[u8]) -> Result<(), JsValue> {
    let imported_doc = pizzico_io_psd::import_psd(bytes)
        .map_err(|e| JsValue::from_str(&format!("Errore importazione file PSD: {}", e)))?;

    with_active_document_mut(|doc| {
        *doc = imported_doc;
    });

    clear_history_via_backend();
    ACTIVE_STROKE.with(|s| *s.borrow_mut() = None);

    Ok(())
}

/// Serializza l'intero progetto attivo (documento, livelli, pixel e selezione)
/// nel formato container compresso nativo `.pizzico` (ZIP).
#[wasm_bindgen]
pub fn save_project() -> Result<Vec<u8>, JsValue> {
    with_active_document(|doc| {
        pizzico_io_native::serialize_document(doc)
            .map_err(|e| JsValue::from_str(&format!("Errore salvataggio progetto .pizzico: {}", e)))
    })
}

/// Carica un progetto `.pizzico` da buffer binario, sostituisce il Documento attivo,
/// resetta la cronologia e segnala la necessità di ricompositing WebGPU.
#[wasm_bindgen]
pub fn load_project(bytes: &[u8]) -> Result<(), JsValue> {
    let imported_doc = pizzico_io_native::deserialize_document(bytes)
        .map_err(|e| JsValue::from_str(&format!("Errore caricamento progetto .pizzico: {}", e)))?;

    with_active_document_mut(|doc| {
        *doc = imported_doc;
    });

    clear_history_via_backend();
    ACTIVE_STROKE.with(|s| *s.borrow_mut() = None);
    ACTIVE_MOVE.with(|m| *m.borrow_mut() = None);

    Ok(())
}

/// Esporta l'immagine renderizzata del documento corrente in formato PNG (lossless con canale alpha).
#[wasm_bindgen]
pub fn export_as_png() -> Result<Vec<u8>, JsValue> {
    with_active_document(|doc| {
        pizzico_io_native::export_png(doc)
            .map_err(|e| JsValue::from_str(&format!("Errore esportazione PNG: {}", e)))
    })
}

/// Esporta l'immagine renderizzata del documento corrente in formato JPEG con qualità 1-100.
/// Le aree trasparenti vengono composte su sfondo bianco (#FFFFFF).
#[wasm_bindgen]
pub fn export_as_jpeg(quality: u8) -> Result<Vec<u8>, JsValue> {
    with_active_document(|doc| {
        pizzico_io_native::export_jpeg(doc, quality)
            .map_err(|e| JsValue::from_str(&format!("Errore esportazione JPEG: {}", e)))
    })
}

/// Esporta l'immagine renderizzata del documento corrente in formato WebP (pure-Rust lossless con canale alpha).
#[wasm_bindgen]
pub fn export_as_webp(quality: u8) -> Result<Vec<u8>, JsValue> {
    with_active_document(|doc| {
        pizzico_io_native::export_webp(doc, quality)
            .map_err(|e| JsValue::from_str(&format!("Errore esportazione WebP: {}", e)))
    })
}

/// Esporta l'intero documento multilivello attivo in formato Adobe Photoshop (PSD).
#[wasm_bindgen]
pub fn export_as_psd() -> Result<Vec<u8>, JsValue> {
    with_active_document(|doc| {
        pizzico_io_psd::export_psd(doc)
            .map_err(|e| JsValue::from_str(&format!("Errore esportazione PSD: {}", e)))
    })
}


// ──────────────────────────────────────────────────────────────────────────────
// Brush Engine & Undo/Redo Bridge (§6.1, §10 Fase 1)
// ──────────────────────────────────────────────────────────────────────────────

/// Avvia una sessione di tratto con il pennello o gomma.
/// Memorizza lo stato iniziale del livello raster attivo per generare un unico comando Undo/Redo compatto.
#[wasm_bindgen]
pub fn begin_stroke() -> bool {
    with_active_document(|doc| {
        if let Some(active_id) = doc.active_layer_id {
            if let Some(layer) = doc.get_layer(active_id) {
                if let LayerKind::Raster { pixels, .. } = &layer.kind {
                    ACTIVE_STROKE.with(|s| {
                        *s.borrow_mut() = Some(ActiveStrokeState {
                            layer_id: active_id,
                            before_pixels: pixels.clone(),
                            dirty_bbox: None,
                        });
                    });
                    return true;
                }
            }
        }
        false
    })
}

/// Rasterizza un segmento di pennello continuo tra (from_x, from_y) e (to_x, to_y) sul livello attivo.
/// Aggiorna il dirty bounding box e notifica WebGPU per la ricomposizione immediata a schermo.
#[wasm_bindgen]
pub fn brush_stroke(
    from_x: f32,
    from_y: f32,
    to_x: f32,
    to_y: f32,
    radius: f32,
    hardness: f32,
    color: &[u8],
    opacity: f32,
) -> bool {
    ACTIVE_STROKE.with(|s| {
        if s.borrow().is_none() {
            begin_stroke();
        }
    });

    let col = if color.len() >= 4 {
        [color[0], color[1], color[2], color[3]]
    } else {
        [0, 0, 0, 255]
    };

    let brush = Brush {
        radius,
        hardness,
        color: col,
        opacity,
    };

    let mut bbox_res: Option<BoundingBox> = None;

    with_active_document_mut(|doc| {
        if let Some(active_id) = doc.active_layer_id {
            let clip_bounds = if doc.has_active_selection() {
                if let Some(layer) = doc.get_layer(active_id) {
                    if let LayerKind::Raster { width, height, .. } = layer.kind {
                        match doc.selection.to_layer_local_clip(layer.transform.x, layer.transform.y, width, height) {
                            Some((min_x, min_y, max_x, max_y)) => {
                                Some(BoundingBox::new(min_x, min_y, max_x - min_x + 1, max_y - min_y + 1))
                            }
                            None => {
                                return;
                            }
                        }
                    } else {
                        None
                    }
                } else {
                    None
                }
            } else {
                None
            };

            if let Some(layer) = doc.get_layer_mut(active_id) {
                let local_from_x = from_x - layer.transform.x as f32;
                let local_from_y = from_y - layer.transform.y as f32;
                let local_to_x = to_x - layer.transform.x as f32;
                let local_to_y = to_y - layer.transform.y as f32;
                bbox_res = pizzico_raster::brush::stroke_clipped(
                    layer,
                    (local_from_x, local_from_y),
                    (local_to_x, local_to_y),
                    &brush,
                    clip_bounds,
                );
            }
        }
    });

    if let Some(bbox) = bbox_res {
        ACTIVE_STROKE.with(|s| {
            if let Some(ref mut st) = *s.borrow_mut() {
                st.dirty_bbox = Some(match st.dirty_bbox {
                    Some(current) => current.union(&bbox),
                    None => bbox,
                });
            }
        });
        set_document_dirty(true);
        true
    } else {
        false
    }
}

/// Rasterizza un segmento di gomma tra (from_x, from_y) e (to_x, to_y) sul livello attivo.
#[wasm_bindgen]
pub fn eraser_stroke(
    from_x: f32,
    from_y: f32,
    to_x: f32,
    to_y: f32,
    radius: f32,
    hardness: f32,
    opacity: f32,
) -> bool {
    ACTIVE_STROKE.with(|s| {
        if s.borrow().is_none() {
            begin_stroke();
        }
    });

    let brush = Brush {
        radius,
        hardness,
        color: [0, 0, 0, 255],
        opacity,
    };

    let mut bbox_res: Option<BoundingBox> = None;

    with_active_document_mut(|doc| {
        if let Some(active_id) = doc.active_layer_id {
            let clip_bounds = if doc.has_active_selection() {
                if let Some(layer) = doc.get_layer(active_id) {
                    if let LayerKind::Raster { width, height, .. } = layer.kind {
                        match doc.selection.to_layer_local_clip(layer.transform.x, layer.transform.y, width, height) {
                            Some((min_x, min_y, max_x, max_y)) => {
                                Some(BoundingBox::new(min_x, min_y, max_x - min_x + 1, max_y - min_y + 1))
                            }
                            None => {
                                return;
                            }
                        }
                    } else {
                        None
                    }
                } else {
                    None
                }
            } else {
                None
            };

            if let Some(layer) = doc.get_layer_mut(active_id) {
                let local_from_x = from_x - layer.transform.x as f32;
                let local_from_y = from_y - layer.transform.y as f32;
                let local_to_x = to_x - layer.transform.x as f32;
                let local_to_y = to_y - layer.transform.y as f32;
                bbox_res = pizzico_raster::brush::eraser_stroke_clipped(
                    layer,
                    (local_from_x, local_from_y),
                    (local_to_x, local_to_y),
                    &brush,
                    clip_bounds,
                );
            }
        }
    });

    if let Some(bbox) = bbox_res {
        ACTIVE_STROKE.with(|s| {
            if let Some(ref mut st) = *s.borrow_mut() {
                st.dirty_bbox = Some(match st.dirty_bbox {
                    Some(current) => current.union(&bbox),
                    None => bbox,
                });
            }
        });
        set_document_dirty(true);
        true
    } else {
        false
    }
}

/// Termina la sessione di tratto e registra un'unica modifica di pixel nella History.
#[wasm_bindgen]
pub fn end_stroke() -> bool {
    let stroke_opt = ACTIVE_STROKE.with(|s| s.borrow_mut().take());
    if let Some(stroke_state) = stroke_opt {
        let layer_id = stroke_state.layer_id;
        let before_pixels = stroke_state.before_pixels;
        let dirty_bbox = stroke_state.dirty_bbox;

        // Il bridge estrae solo i DUE buffer e il rettangolo: il comando lo costruisce
        // il backend, con i propri tipi. Nessun tipo di comando attraversa il confine.
        let dati: Option<(Vec<u8>, Vec<u8>, Option<(u32, u32, u32, u32)>)> =
            with_active_document(|doc| {
                let layer = doc.get_layer(layer_id)?;
                let LayerKind::Raster {
                    width,
                    pixels: current_pixels,
                    ..
                } = &layer.kind
                else {
                    return None;
                };

                match dirty_bbox {
                    Some(bbox) => {
                        let doc_w = *width;
                        let (bx, by, bw, bh) =
                            (bbox.min_x, bbox.min_y, bbox.width, bbox.height);
                        let mut before_patch = Vec::with_capacity((bw * bh * 4) as usize);
                        let mut after_patch = Vec::with_capacity((bw * bh * 4) as usize);
                        for row in 0..bh {
                            let offset = (((by + row) * doc_w + bx) * 4) as usize;
                            let len = (bw * 4) as usize;
                            if offset + len <= before_pixels.len()
                                && offset + len <= current_pixels.len()
                            {
                                before_patch.extend_from_slice(&before_pixels[offset..offset + len]);
                                after_patch.extend_from_slice(&current_pixels[offset..offset + len]);
                            }
                        }
                        Some((before_patch, after_patch, Some((bx, by, bw, bh))))
                    }
                    None => Some((before_pixels, current_pixels.clone(), None)),
                }
            });

        if let Some((before, after, bbox)) = dati {
            with_backend_mut(|b| b.commit_stroke(layer_id, before, after, bbox));
            set_document_dirty(true);
            return true;
        }
    }
    false
}

/// Annulla (Undo) l'ultima operazione effettuata nel documento.
#[wasm_bindgen]
pub fn undo() -> bool {
    let res = with_backend_mut(|b| b.history_undo());
    if res {
        set_document_dirty(true);
    }
    res
}

/// Ripristina (Redo) l'ultima operazione precedentemente annullata.
#[wasm_bindgen]
pub fn redo() -> bool {
    let res = with_backend_mut(|b| b.history_redo());
    if res {
        set_document_dirty(true);
    }
    res
}

/// Verifica se è presente almeno un'operazione annullabile nella cronologia.
#[wasm_bindgen]
pub fn can_undo() -> bool {
    with_backend(|b| b.history_can_undo())
}

/// Verifica se è presente almeno un'operazione ripristinabile nella cronologia.
#[wasm_bindgen]
pub fn can_redo() -> bool {
    with_backend(|b| b.history_can_redo())
}

/// DTO serializzabile per lo stato corrente del sistema di cronologia (Undo/Redo).
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct HistoryInfoDto {
    #[serde(rename = "canUndo")]
    pub can_undo: bool,
    #[serde(rename = "canRedo")]
    pub can_redo: bool,
    #[serde(rename = "undoCount")]
    pub undo_count: usize,
    #[serde(rename = "redoCount")]
    pub redo_count: usize,
}

/// Restituisce lo stato corrente della History in formato oggetto JS `{ canUndo, canRedo, undoCount, redoCount }`.
#[wasm_bindgen]
pub fn get_history_info() -> Result<JsValue, JsValue> {
    let info = with_backend(|b| b.history_info());
    let dto = HistoryInfoDto {
        can_undo: info.can_undo,
        can_redo: info.can_redo,
        undo_count: info.undo_count,
        redo_count: info.redo_count,
    };

    let json_str = serde_json::to_string(&dto)
        .map_err(|e| JsValue::from_str(&format!("Errore serializzazione info history: {}", e)))?;
    js_sys::JSON::parse(&json_str)
}

// ──────────────────────────────────────────────────────────────────────────────
// Move Tool & Traslazione Livelli (§10 Fase 1)
// ──────────────────────────────────────────────────────────────────────────────

/// Inizia un'operazione di traslazione (Move Tool) per il livello attivo.
/// Registra la posizione iniziale per generare un unico `MoveLayerCommand` al rilascio del cursore.
#[wasm_bindgen]
pub fn begin_move_layer() -> bool {
    with_active_document(|doc| {
        if let Some(active_id) = doc.active_layer_id {
            if let Some(layer) = doc.get_layer(active_id) {
                let initial_offset = (layer.transform.x, layer.transform.y);
                ACTIVE_MOVE.with(|m| {
                    *m.borrow_mut() = Some(ActiveMoveState {
                        layer_id: active_id,
                        initial_offset,
                    });
                });
                return true;
            }
        }
        false
    })
}

/// Imposta la posizione assoluta (x, y) del livello attivo e marca il documento dirty.
#[wasm_bindgen]
pub fn move_active_layer(x: i32, y: i32) -> bool {
    let mut changed = false;
    with_active_document_mut(|doc| {
        if let Some(active_id) = doc.active_layer_id {
            changed = doc.set_layer_offset(active_id, x, y);
        }
    });
    if changed {
        set_document_dirty(true);
    }
    changed
}

/// Trasla il livello attivo del delta (dx, dy) e marca il documento dirty.
#[wasm_bindgen]
pub fn translate_active_layer(dx: i32, dy: i32) -> bool {
    let mut changed = false;
    with_active_document_mut(|doc| {
        if let Some(active_id) = doc.active_layer_id {
            changed = doc.translate_layer(active_id, dx, dy);
        }
    });
    if changed {
        set_document_dirty(true);
    }
    changed
}

/// Termina l'operazione di spostamento del livello attivo.
/// Se l'offset finale differisce da quello iniziale, registra un `MoveLayerCommand` nella History.
#[wasm_bindgen]
pub fn end_move_layer() -> bool {
    let move_state_opt = ACTIVE_MOVE.with(|m| m.borrow_mut().take());
    if let Some(move_state) = move_state_opt {
        let final_offset_opt = with_active_document(|doc| {
            doc.get_layer(move_state.layer_id).map(|l| (l.transform.x, l.transform.y))
        });
        if let Some(final_offset) = final_offset_opt {
            if final_offset != move_state.initial_offset {
                // Il backend registra il proprio comando: il bridge passa solo i dati.
                with_backend_mut(|b| {
                    b.commit_move(move_state.layer_id, move_state.initial_offset, final_offset)
                });
                set_document_dirty(true);
                return true;
            }
        }
    }
    false
}

/// Restituisce l'offset corrente `[x, y]` del livello attivo, oppure null.
#[wasm_bindgen]
pub fn get_active_layer_offset() -> JsValue {
    let offset_opt = with_active_document(|doc| {
        doc.get_active_layer().map(|l| (l.transform.x, l.transform.y))
    });
    match offset_opt {
        Some((x, y)) => {
            let arr = js_sys::Array::new();
            arr.push(&JsValue::from_f64(x as f64));
            arr.push(&JsValue::from_f64(y as f64));
            arr.into()
        }
        None => JsValue::NULL,
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Rectangular Selection (Marquee) (§10 Fase 1)
// ──────────────────────────────────────────────────────────────────────────────

/// Imposta la selezione rettangolare attiva nel documento in coordinate logiche documento.
#[wasm_bindgen]
pub fn set_selection(x: u32, y: u32, width: u32, height: u32) -> bool {
    with_backend_mut(|b| b.set_selection(x, y, width, height));
    set_document_dirty(true);
    true
}

/// Rimuove la selezione attiva (deseleziona).
#[wasm_bindgen]
pub fn clear_selection() -> bool {
    with_backend_mut(|b| b.clear_selection());
    set_document_dirty(true);
    true
}

/// Restituisce true se è presente una selezione rettangolare attiva.
#[wasm_bindgen]
pub fn has_active_selection() -> bool {
    with_backend(|b| b.has_selection())
}

/// Restituisce la selezione corrente serializzata come oggetto JS, o null se inattiva.
#[wasm_bindgen]
pub fn get_selection() -> Result<JsValue, JsValue> {
    let sel = with_backend(|b| b.selection_meta());
    if sel.active {
        let json_str = serde_json::to_string(&sel)
            .map_err(|e| JsValue::from_str(&format!("Errore serializzazione selezione: {}", e)))?;
        js_sys::JSON::parse(&json_str)
    } else {
        Ok(JsValue::NULL)
    }
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
        clear_history_via_backend();
        ACTIVE_STROKE.with(|s| *s.borrow_mut() = None);
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
        with_backend(|b| b.layer_count())
    }

    /// Flag dirty del documento.
    pub fn is_dirty(&self) -> bool {
        is_document_dirty()
    }

    /// Imposta il flag dirty del documento.
    pub fn set_dirty(&mut self, dirty: bool) {
        set_document_dirty(dirty);
    }

    /// Crea un nuovo documento.
    pub fn create_document(&mut self, width: u32, height: u32) {
        create_document(width, height);
    }

    /// Aggiunge un livello raster uniforme.
    pub fn add_raster_layer(&mut self, name: &str, width: u32, height: u32, color: &[u8]) -> u64 {
        add_raster_layer(name, width, height, color)
    }

    /// Metadati di tutti i livelli in formato array JS.
    pub fn get_layers_metadata(&self) -> Result<JsValue, JsValue> {
        get_layers_metadata()
    }

    /// Modifica l'opacità di un livello.
    pub fn set_layer_opacity(&mut self, id: u32, opacity: f32) {
        set_layer_opacity(id, opacity);
    }

    /// Modifica la visibilità di un livello.
    pub fn set_layer_visibility(&mut self, id: u32, visible: bool) {
        set_layer_visibility(id, visible);
    }

    /// Seleziona un livello come attivo.
    pub fn select_layer(&mut self, id: u32) {
        select_layer(id);
    }

    /// Rimuove un livello dato il suo ID.
    pub fn remove_layer(&mut self, id: u32) -> bool {
        remove_layer(id)
    }

    /// ID del livello attivo.
    pub fn get_active_layer_id(&self) -> Option<u32> {
        get_active_layer_id()
    }

    /// Esegue il compositing e restituisce il buffer RGBA 8-bit per Canvas.
    pub fn render_frame(&self) -> Vec<u8> {
        get_composite_buffer()
    }

    /// Carica un file PSD binario e sostituisce il documento corrente.
    pub fn load_psd_bytes(&mut self, bytes: &[u8]) -> Result<(), JsValue> {
        load_psd_bytes(bytes)
    }

    /// Restituisce i metadati globali del documento attivo.
    pub fn get_document_metadata(&self) -> Result<JsValue, JsValue> {
        get_document_metadata()
    }

    /// Avvia un tratto di pennello.
    pub fn begin_stroke(&mut self) -> bool {
        begin_stroke()
    }

    /// Disegna un segmento di pennello.
    pub fn brush_stroke(
        &mut self,
        from_x: f32,
        from_y: f32,
        to_x: f32,
        to_y: f32,
        radius: f32,
        hardness: f32,
        color: &[u8],
        opacity: f32,
    ) -> bool {
        brush_stroke(from_x, from_y, to_x, to_y, radius, hardness, color, opacity)
    }

    /// Disegna un segmento di gomma.
    pub fn eraser_stroke(
        &mut self,
        from_x: f32,
        from_y: f32,
        to_x: f32,
        to_y: f32,
        radius: f32,
        hardness: f32,
        opacity: f32,
    ) -> bool {
        eraser_stroke(from_x, from_y, to_x, to_y, radius, hardness, opacity)
    }

    /// Conclude il tratto registrando l'azione nella history.
    pub fn end_stroke(&mut self) -> bool {
        end_stroke()
    }

    /// Annulla l'ultima azione.
    pub fn undo(&mut self) -> bool {
        undo()
    }

    /// Ripristina l'ultima azione annullata.
    pub fn redo(&mut self) -> bool {
        redo()
    }

    /// Può annullare?
    pub fn can_undo(&self) -> bool {
        can_undo()
    }

    /// Può ripristinare?
    pub fn can_redo(&self) -> bool {
        can_redo()
    }

    /// Informazioni sulla history.
    pub fn get_history_info(&self) -> Result<JsValue, JsValue> {
        get_history_info()
    }

    /// Inizia traslazione layer attivo.
    pub fn begin_move_layer(&mut self) -> bool {
        begin_move_layer()
    }

    /// Imposta posizione assoluta del layer attivo.
    pub fn move_active_layer(&mut self, x: i32, y: i32) -> bool {
        move_active_layer(x, y)
    }

    /// Trasla il layer attivo del delta specificato.
    pub fn translate_active_layer(&mut self, dx: i32, dy: i32) -> bool {
        translate_active_layer(dx, dy)
    }

    /// Termina traslazione layer attivo con registrazione history.
    pub fn end_move_layer(&mut self) -> bool {
        end_move_layer()
    }

    /// Restituisce [x, y] del layer attivo.
    pub fn get_active_layer_offset(&self) -> JsValue {
        get_active_layer_offset()
    }

    /// Imposta selezione rettangolare.
    pub fn set_selection(&mut self, x: u32, y: u32, width: u32, height: u32) -> bool {
        set_selection(x, y, width, height)
    }

    /// Rimuove selezione attiva.
    pub fn clear_selection(&mut self) -> bool {
        clear_selection()
    }

    /// Verifica presenza selezione attiva.
    pub fn has_active_selection(&self) -> bool {
        has_active_selection()
    }

    /// Restituisce la selezione attiva in formato JS.
    pub fn get_selection(&self) -> Result<JsValue, JsValue> {
        get_selection()
    }

    /// Serializza il documento in formato JSON.
    pub fn get_document_json(&self) -> Result<String, JsValue> {
        with_active_document(|doc| {
            serde_json::to_string(doc)
                .map_err(|e| JsValue::from_str(&format!("Errore serializzazione documento: {}", e)))
        })
    }

    /// Esporta in formato PNG (lossless con alpha).
    pub fn export_as_png(&self) -> Result<Vec<u8>, JsValue> {
        export_as_png()
    }

    /// Esporta in formato JPEG con qualità specificata (1-100).
    pub fn export_as_jpeg(&self, quality: u8) -> Result<Vec<u8>, JsValue> {
        export_as_jpeg(quality)
    }

    /// Esporta in formato WebP (pure-Rust lossless con alpha).
    pub fn export_as_webp(&self, quality: u8) -> Result<Vec<u8>, JsValue> {
        export_as_webp(quality)
    }

    /// Esporta l'intero documento in formato PSD multilivello.
    pub fn export_as_psd(&self) -> Result<Vec<u8>, JsValue> {
        export_as_psd()
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
