//! Astrazione del motore dietro il bridge WASM.
//!
//! Il contratto JS (`lib.rs`, 87 funzioni) non deve sapere quale motore sta usando.
//! Questo modulo definisce il seam: un [`EngineBackend`] con le operazioni sul
//! documento, e due implementazioni previste:
//!
//! - [`legacy::LegacyBackend`] — `pizzico-core`, il motore attuale (default);
//! - `v2::V2Backend` — `pizzico-engine-core`, il motore trapiantato da Pizzart
//!   (Fase 4.2, dietro la feature `engine-v2`).
//!
//! ## Perché il trait espone anche il documento legacy
//!
//! Le funzioni del bridge che non sono ancora state astratte (tratti, export, PSD,
//! progetto) lavorano direttamente su `pizzico_core::Document`. Invece di duplicare
//! lo stato, il backend espone un accesso controllato al proprio documento: così
//! esiste **una sola** copia del documento e le funzioni legacy continuano a
//! funzionare senza riscritture.
//!
//! Questo accesso è un ponte temporaneo e dichiarato: sparisce quando ogni gruppo di
//! funzioni sarà passato dai metodi semantici del trait (Fase 4.2/4.3).

pub mod legacy;

use pizzico_core::Document;

/// Metadati di un layer, nella forma che il bridge serializza per la UI.
#[derive(Debug, Clone)]
pub struct LayerMeta {
    pub id: u64,
    pub name: String,
    pub kind: String,
    pub visible: bool,
    pub locked: bool,
    pub opacity: f32,
    pub blend_mode: String,
    pub offset_x: i32,
    pub offset_y: i32,
}

/// Metadati del documento.
#[derive(Debug, Clone)]
pub struct DocumentMeta {
    pub width: u32,
    pub height: u32,
    pub title: String,
    pub layer_count: usize,
}

/// Stato della history.
#[derive(Debug, Clone, Copy)]
pub struct HistoryMeta {
    pub can_undo: bool,
    pub can_redo: bool,
    pub undo_count: usize,
    pub redo_count: usize,
}

/// Operazioni che il bridge richiede al motore.
///
/// I metodi sono volutamente "semantici" (cosa fare) e non "strutturali" (come farlo):
/// è ciò che permette a due modelli di documento diversi di rispondere allo stesso
/// contratto.
pub trait EngineBackend {
    /// Nome del backend, per diagnostica e log.
    fn name(&self) -> &'static str;

    // ── Accesso al documento legacy ──────────────────────────────────────────
    //
    // Ponte temporaneo (vedi nota del modulo). Il backend v2 restituisce `None`:
    // le funzioni che ne hanno bisogno dovranno passare dai metodi semantici.

    /// Documento legacy in sola lettura, se questo backend lo possiede.
    fn legacy_document(&self) -> Option<&Document>;
    /// Documento legacy modificabile, se questo backend lo possiede.
    fn legacy_document_mut(&mut self) -> Option<&mut Document>;

    // ── Documento ────────────────────────────────────────────────────────────

    /// Crea o sostituisce il documento. È l'unico metodo che può cambiare dimensioni.
    fn create_document(&mut self, width: u32, height: u32);

    fn width(&self) -> u32;
    fn height(&self) -> u32;
    fn title(&self) -> String;
    fn layer_count(&self) -> usize;

    // ── Layer ────────────────────────────────────────────────────────────────

    /// Aggiunge un layer raster riempito con un colore RGBA uniforme.
    fn add_raster_layer(&mut self, name: &str, width: u32, height: u32, color: [u8; 4]) -> u64;
    fn remove_layer(&mut self, id: u64) -> bool;
    fn set_layer_opacity(&mut self, id: u64, opacity: f32);
    fn set_layer_visibility(&mut self, id: u64, visible: bool);
    fn select_layer(&mut self, id: u64);
    fn active_layer_id(&self) -> Option<u64>;
    fn layers_metadata(&self) -> Vec<LayerMeta>;

    // ── Compositing ──────────────────────────────────────────────────────────

    /// Buffer RGBA8 del documento compositato.
    fn composite(&self) -> Vec<u8>;

    // ── Selezione ────────────────────────────────────────────────────────────

    fn set_selection(&mut self, x: u32, y: u32, width: u32, height: u32);
    fn clear_selection(&mut self);
    fn has_selection(&self) -> bool;
    fn selection(&self) -> Option<(u32, u32, u32, u32)>;

    // ── Stato ────────────────────────────────────────────────────────────────

    fn is_dirty(&self) -> bool;
    fn set_dirty(&mut self, dirty: bool);
}
