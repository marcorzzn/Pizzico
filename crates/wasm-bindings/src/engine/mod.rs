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

/// Backend v2 (motore trapiantato da Pizzart). Richiede la feature `engine-v2`.
#[cfg(feature = "engine-v2")]
pub mod v2;

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

/// Selezione rettangolare, nella forma esatta che il bridge serializza per la UI
/// (`{ x, y, width, height, active }`). Deve combaciare con `pizzico_core::RectSelection`,
/// perché la UI legge quei campi.
#[derive(Debug, Clone, Copy, serde::Serialize)]
pub struct SelectionMeta {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
    pub active: bool,
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

    // ── Export ───────────────────────────────────────────────────────────────

    /// PNG: conserva l'alpha.
    fn export_as_png(&self) -> Result<Vec<u8>, String>;
    /// JPEG: compone la trasparenza su bianco, come il motore legacy.
    fn export_as_jpeg(&self, quality: u8) -> Result<Vec<u8>, String>;
    /// WebP: solo il backend legacy lo supporta (lossy via crate image).
    fn export_as_webp(&self, quality: u8) -> Result<Vec<u8>, String>;
    // ── Selezione ────────────────────────────────────────────────────────────

    fn set_selection(&mut self, x: u32, y: u32, width: u32, height: u32);
    fn clear_selection(&mut self);
    fn has_selection(&self) -> bool;
    /// Selezione corrente, nella forma serializzata per la UI.
    fn selection_meta(&self) -> SelectionMeta;

    // ── Spostamento layer ────────────────────────────────────────────────────

    /// Memorizza l'offset iniziale del layer attivo.
    fn begin_move_layer(&mut self) -> bool;
    /// Porta il layer attivo all'offset assoluto indicato (senza history).
    fn move_active_layer(&mut self, x: i32, y: i32) -> bool;
    /// Trasla il layer attivo del delta indicato (senza history).
    fn translate_active_layer(&mut self, dx: i32, dy: i32) -> bool;
    /// Chiude lo spostamento e registra un solo comando, se l'offset è cambiato.
    fn end_move_layer(&mut self) -> bool;
    /// Offset corrente del layer attivo.
    fn active_layer_offset(&self) -> Option<(i32, i32)>;
    // ── History ──────────────────────────────────────────────────────────────
    //
    // La history appartiene al backend, non al bridge: i comandi devono essere
    // applicati al documento che il backend possiede, altrimenti si creano due
    // storici che divergono.

    fn history_can_undo(&self) -> bool;
    fn history_can_redo(&self) -> bool;
    fn history_undo(&mut self) -> bool;
    fn history_redo(&mut self) -> bool;
    fn history_info(&self) -> HistoryMeta;
    /// Registra in history uno spostamento già applicato al documento.
    ///
    /// Il trait parla di **operazioni**, non di comandi: ogni backend crea il proprio
    /// tipo di comando. Era il punto di attrito che rendeva impossibile un backend v2.
    fn commit_move(&mut self, layer_id: u64, from: (i32, i32), to: (i32, i32));
    /// Registra in history una modifica di pixel già applicata al documento.
    ///
    /// `bbox = None` significa "l'intero layer": `before` e `after` contengono allora
    /// tutti i pixel. Con `bbox = Some((x, y, w, h))` contengono solo quel rettangolo.
    fn commit_stroke(
        &mut self,
        layer_id: u64,
        before: Vec<u8>,
        after: Vec<u8>,
        bbox: Option<(u32, u32, u32, u32)>,
    );
    /// Svuota la history (nuovo documento, caricamento progetto/PSD).
    fn clear_history(&mut self);

    // ── Stato ────────────────────────────────────────────────────────────────

    fn is_dirty(&self) -> bool;
    fn set_dirty(&mut self, dirty: bool);
}
