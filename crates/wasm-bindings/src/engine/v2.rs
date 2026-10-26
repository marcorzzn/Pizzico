//! Backend v2: `pizzico-engine-core`, il motore trapiantato da Pizzart.
//!
//! Attivo solo con la feature `engine-v2`. Traduce il contratto del bridge
//! (`EngineBackend`) nei tipi del motore nuovo.
//!
//! ## Traduzioni non ovvie
//!
//! - **Identità dei layer**: v2 assegna `LayerId` autonomi, mentre il contratto JS usa
//!   `u64` stabili e piccoli. Il backend tiene una mappa `u64 ⇄ LayerId`.
//! - **Titolo**: v2 non ha un titolo nel documento; vive nel backend.
//! - **Gruppi**: `Document::layers()` restituisce solo i layer, non i nodi gruppo.
//!   I metadati esposti alla UI, per ora, non elencano i gruppi (differenza dichiarata
//!   rispetto al backend legacy).
//! - **Comandi**: ognuno è del motore v2 (`SetOpacity`, `SetVisible`, `RemoveLayer`,
//!   `SetTransform`, `ReplacePixelCommand`). Nessun comando legacy attraversa il confine.

use std::collections::HashMap;

use pizzico_engine_core::{
    Document, Layer, LayerId, RemoveLayer, ReplacePixelCommand, SetOpacity, SetTransform, SetVisible,
};

use pizzico_engine_io::{encode, ExportFormat, ExportOptions};
use pizzico_engine_render::RenderedImage;

use super::{EngineBackend, HistoryMeta, LayerMeta};

/// Backend basato su `pizzico-engine-core` (motore trapiantato).
pub struct V2Backend {
    doc: Document,
    title: String,
    next_public_id: u64,
    ids: HashMap<u64, LayerId>,
    active: Option<u64>,
    selection: Option<(u32, u32, u32, u32)>,
    /// Spostamento in corso: (id pubblico, offset iniziale).
    move_state: Option<(u64, (i32, i32))>,
    dirty: bool,
    /// Ultimo errore non recuperabile: il trait restituisce `()`/`bool`, quindi
    /// l'errore viene conservato qui e letto dal bridge.
    last_error: Option<String>,
}

impl Default for V2Backend {
    fn default() -> Self {
        Self::new()
    }
}

impl V2Backend {
    pub fn new() -> Self {
        Self::with_size(800, 600)
    }

    pub fn with_size(width: u32, height: u32) -> Self {
        Self {
            doc: Document::new(width, height),
            title: "Pizzico Project".to_string(),
            next_public_id: 1,
            ids: HashMap::new(),
            active: None,
            selection: None,
            move_state: None,
            dirty: true,
            last_error: None,
        }
    }

    /// Ultimo errore registrato (letto dal bridge per restituire `Err(JsValue)`).
    pub fn take_last_error(&mut self) -> Option<String> {
        self.last_error.take()
    }

    fn lid(&self, public: u64) -> Option<LayerId> {
        self.ids.get(&public).copied()
    }

    fn public_of(&self, id: LayerId) -> Option<u64> {
        self.ids
            .iter()
            .find(|(_, v)| **v == id)
            .map(|(k, _)| *k)
    }

    /// Composito del documento nella forma attesa da ngine-io.
    fn rendered(&self) -> RenderedImage {
        RenderedImage {
            width: self.doc.width,
            height: self.doc.height,
            rgba: self.doc.composite(),
        }
    }

    fn registra(&mut self, id: LayerId) -> u64 {
        let public = self.next_public_id;
        self.next_public_id += 1;
        self.ids.insert(public, id);
        public
    }
}

impl EngineBackend for V2Backend {
    fn name(&self) -> &'static str {
        "engine-v2"
    }

    // v2 non espone il documento legacy: le funzioni del bridge che ne hanno bisogno
    // (PSD, formato progetto) restano sul backend legacy finché non vengono tradotte.
    fn legacy_document(&self) -> Option<&pizzico_core::Document> {
        None
    }

    fn legacy_document_mut(&mut self) -> Option<&mut pizzico_core::Document> {
        None
    }

    fn create_document(&mut self, width: u32, height: u32) {
        self.doc = Document::new(width, height);
        self.next_public_id = 1;
        self.ids.clear();
        self.active = None;
        self.selection = None;
        self.move_state = None;
        self.dirty = true;
    }

    fn width(&self) -> u32 {
        self.doc.width
    }

    fn height(&self) -> u32 {
        self.doc.height
    }

    fn title(&self) -> String {
        self.title.clone()
    }

    fn layer_count(&self) -> usize {
        self.doc.layer_count()
    }

    fn add_raster_layer(&mut self, name: &str, width: u32, height: u32, color: [u8; 4]) -> u64 {
        let layer = Layer::filled(name, width, height, color);
        let id = self.doc.add_layer(layer);
        let public = self.registra(id);
        self.active = Some(public);
        self.dirty = true;
        public
    }

    fn remove_layer(&mut self, id: u64) -> bool {
        let Some(lid) = self.lid(id) else {
            return false;
        };
        if self.doc.layer(lid).is_none() {
            return false;
        }
        self.doc.execute(Box::new(RemoveLayer::new(lid)));
        self.ids.retain(|_, v| *v != lid);
        if self.active == Some(id) {
            self.active = None;
        }
        self.dirty = true;
        true
    }

    fn set_layer_opacity(&mut self, id: u64, opacity: f32) {
        let Some(lid) = self.lid(id) else { return };
        if self.doc.layer(lid).is_none() {
            return;
        }
        self.doc.execute(Box::new(SetOpacity::new(lid, opacity)));
        self.dirty = true;
    }

    fn set_layer_visibility(&mut self, id: u64, visible: bool) {
        let Some(lid) = self.lid(id) else { return };
        if self.doc.layer(lid).is_none() {
            return;
        }
        self.doc.execute(Box::new(SetVisible::new(lid, visible)));
        self.dirty = true;
    }

    fn select_layer(&mut self, id: u64) {
        if self.lid(id).is_some() {
            self.active = Some(id);
        }
    }

    fn active_layer_id(&self) -> Option<u64> {
        self.active
    }

    fn layers_metadata(&self) -> Vec<LayerMeta> {
        self.doc
            .layers()
            .iter()
            .map(|l| LayerMeta {
                id: self.public_of(l.id).unwrap_or(0),
                name: l.name.clone(),
                kind: "Raster".to_string(),
                visible: l.visible,
                locked: false,
                opacity: l.opacity,
                blend_mode: format!("{:?}", l.blend),
                offset_x: l.transform.x as i32,
                offset_y: l.transform.y as i32,
            })
            .collect()
    }

    fn composite(&self) -> Vec<u8> {
        self.doc.composite()
    }

    fn set_selection(&mut self, x: u32, y: u32, width: u32, height: u32) {
        self.selection = Some((x, y, width, height));
    }

    fn clear_selection(&mut self) {
        self.selection = None;
    }

    fn has_selection(&self) -> bool {
        self.selection.is_some()
    }

    fn selection_meta(&self) -> super::SelectionMeta {
        let (x, y, width, height) = self.selection.unwrap_or((0, 0, 0, 0));
        super::SelectionMeta {
            x,
            y,
            width,
            height,
            active: self.selection.is_some(),
        }
    }

    fn begin_move_layer(&mut self) -> bool {
        let Some(public) = self.active else {
            return false;
        };
        let Some(lid) = self.lid(public) else {
            return false;
        };
        let Some(layer) = self.doc.layer(lid) else {
            return false;
        };
        self.move_state = Some((public, (layer.transform.x as i32, layer.transform.y as i32)));
        true
    }

    fn move_active_layer(&mut self, x: i32, y: i32) -> bool {
        let Some(public) = self.active else {
            return false;
        };
        let Some(lid) = self.lid(public) else {
            return false;
        };
        let Some(layer) = self.doc.layer_mut(lid) else {
            return false;
        };
        let cambiato = layer.transform.x as i32 != x || layer.transform.y as i32 != y;
        layer.transform.x = x as f32;
        layer.transform.y = y as f32;
        if cambiato {
            self.dirty = true;
        }
        cambiato
    }

    fn translate_active_layer(&mut self, dx: i32, dy: i32) -> bool {
        let Some(public) = self.active else {
            return false;
        };
        let Some(lid) = self.lid(public) else {
            return false;
        };
        let Some(layer) = self.doc.layer_mut(lid) else {
            return false;
        };
        layer.transform.x += dx as f32;
        layer.transform.y += dy as f32;
        self.dirty = true;
        true
    }

    fn end_move_layer(&mut self) -> bool {
        let Some((public, from)) = self.move_state.take() else {
            return false;
        };
        let Some(lid) = self.lid(public) else {
            return false;
        };
        let Some(layer) = self.doc.layer(lid) else {
            return false;
        };
        let to = (layer.transform.x as i32, layer.transform.y as i32);
        if to == from {
            return false;
        }
        self.commit_move(public, from, to);
        true
    }

    fn active_layer_offset(&self) -> Option<(i32, i32)> {
        let public = self.active?;
        let lid = self.lid(public)?;
        let layer = self.doc.layer(lid)?;
        Some((layer.transform.x as i32, layer.transform.y as i32))
    }
    fn history_can_undo(&self) -> bool {
        self.doc.history.can_undo()
    }

    fn history_can_redo(&self) -> bool {
        self.doc.history.can_redo()
    }

    fn history_undo(&mut self) -> bool {
        let fatto = self.doc.undo();
        if fatto {
            self.dirty = true;
        }
        fatto
    }

    fn history_redo(&mut self) -> bool {
        let fatto = self.doc.redo();
        if fatto {
            self.dirty = true;
        }
        fatto
    }

    fn history_info(&self) -> HistoryMeta {
        HistoryMeta {
            can_undo: self.doc.history.can_undo(),
            can_redo: self.doc.history.can_redo(),
            undo_count: self.doc.history.undo_count(),
            redo_count: self.doc.history.redo_count(),
        }
    }

    fn commit_move(&mut self, layer_id: u64, from: (i32, i32), to: (i32, i32)) {
        let Some(lid) = self.lid(layer_id) else { return };
        let Some(layer) = self.doc.layer_mut(lid) else {
            return;
        };
        // Il comando cattura il valore "prima" quando viene applicato: si ripristina
        // l'offset di partenza e si lascia applicare a `SetTransform`, altrimenti
        // l'undo tornerebbe al valore già spostato.
        let mut nuovo = layer.transform;
        nuovo.x = to.0 as f32;
        nuovo.y = to.1 as f32;
        let mut vecchio = layer.transform;
        vecchio.x = from.0 as f32;
        vecchio.y = from.1 as f32;
        layer.transform = vecchio;
        self.doc.execute(Box::new(SetTransform::new(lid, nuovo)));
        self.dirty = true;
    }

    fn commit_stroke(
        &mut self,
        layer_id: u64,
        before: Vec<u8>,
        after: Vec<u8>,
        bbox: Option<(u32, u32, u32, u32)>,
    ) {
        let Some(lid) = self.lid(layer_id) else { return };
        if self.doc.layer(lid).is_none() {
            return;
        }
        self.doc
            .execute(Box::new(ReplacePixelCommand::new(lid, bbox, before, after)));
        self.dirty = true;
    }

    fn clear_history(&mut self) {
        self.doc.history.clear();
    }

    fn export_as_png(&self) -> Result<Vec<u8>, String> {
        let img = self.rendered();
        encode(
            &img,
            ExportFormat::Png,
            &ExportOptions {
                background: None,
                metadata: None,
            },
        )
        .map_err(|e| e.to_string())
    }

    fn export_as_jpeg(&self, quality: u8) -> Result<Vec<u8>, String> {
        let img = self.rendered();
        // Replica della formula legacy: (r*a + 255*(255-a) + 127)/255 -> fondo bianco.
        encode(
            &img,
            ExportFormat::Jpeg { quality },
            &ExportOptions {
                background: Some([255, 255, 255]),
                metadata: None,
            },
        )
        .map_err(|e| e.to_string())
    }

    fn export_as_webp(&self, _quality: u8) -> Result<Vec<u8>, String> {
        // L'encoder WebP del crate image è solo lossless; il lossy richiede libwebp
        // (codice C), che non compila per wasm32-unknown-unknown. Dichiarato, non finto.
        Err("WebP export not supported in engine-v2. Use legacy backend or wait for libwebp/wasm support.".to_string())
    }
    fn is_dirty(&self) -> bool {
        self.dirty
    }

    fn set_dirty(&mut self, dirty: bool) {
        self.dirty = dirty;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn crea_layer_e_li_mappa_su_id_pubblici() {
        let mut b = V2Backend::with_size(32, 24);
        let a = b.add_raster_layer("uno", 32, 24, [1, 2, 3, 255]);
        let c = b.add_raster_layer("due", 32, 24, [4, 5, 6, 255]);
        assert_ne!(a, c, "gli id pubblici devono essere distinti");
        assert_eq!(b.layer_count(), 2);
        let meta = b.layers_metadata();
        assert_eq!(meta.len(), 2);
        assert!(meta.iter().any(|m| m.id == a));
        assert!(meta.iter().any(|m| m.id == c));
    }

    #[test]
    fn opacita_e_undo_funzionano_su_v2() {
        let mut b = V2Backend::with_size(8, 8);
        let id = b.add_raster_layer("l", 8, 8, [200, 0, 0, 255]);
        b.set_layer_opacity(id, 0.25);
        assert!((b.layers_metadata()[0].opacity - 0.25).abs() < 1e-6);
        assert!(b.history_undo());
        assert!((b.layers_metadata()[0].opacity - 1.0).abs() < 1e-6);
    }

    #[test]
    fn composito_v2_ha_le_dimensioni_giuste() {
        let mut b = V2Backend::with_size(6, 5);
        b.add_raster_layer("l", 6, 5, [9, 9, 9, 255]);
        assert_eq!(b.composite().len(), 6 * 5 * 4);
    }

    #[test]
    fn spostamento_layer_e_undo() {
        let mut b = V2Backend::with_size(32, 32);
        let id = b.add_raster_layer("l", 32, 32, [1, 2, 3, 255]);
        b.select_layer(id);

        assert!(b.begin_move_layer());
        assert!(b.move_active_layer(50, 40));
        assert_eq!(b.active_layer_offset(), Some((50, 40)));

        assert!(b.end_move_layer(), "lo spostamento va registrato");
        assert_eq!(b.active_layer_offset(), Some((50, 40)));

        assert!(b.history_undo(), "l'undo deve annullare lo spostamento");
        assert_eq!(
            b.active_layer_offset(),
            Some((0, 0)),
            "l'undo riporta l'offset iniziale"
        );
    }

    #[test]
    fn spostamento_senza_movimento_non_registra_nulla() {
        let mut b = V2Backend::with_size(8, 8);
        let id = b.add_raster_layer("l", 8, 8, [0, 0, 0, 255]);
        b.select_layer(id);
        assert!(b.begin_move_layer());
        assert!(!b.end_move_layer(), "nessun comando senza spostamento");
    }
    #[test]
    fn export_png_e_jpeg_hanno_i_magic_bytes() {
        let mut b = V2Backend::with_size(100, 100);
        b.add_raster_layer("rosso", 100, 100, [255, 0, 0, 255]);

        let png = b.export_as_png().expect("png");
        assert_eq!(
            &png[0..8],
            &[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
            "magic PNG"
        );

        let jpg = b.export_as_jpeg(90).expect("jpeg");
        assert_eq!(&jpg[0..2], &[0xFF, 0xD8], "magic JPEG");

        assert!(
            b.export_as_webp(90).is_err(),
            "WebP deve essere dichiarato non supportato, non finto"
        );
    }

    #[test]
    fn jpeg_su_trasparente_usa_il_fondo_bianco() {
        let mut b = V2Backend::with_size(8, 8);
        b.add_raster_layer("trasparente", 8, 8, [0, 0, 0, 0]);
        let jpg = b
            .export_as_jpeg(90)
            .expect("il legacy compone su bianco: v2 deve fare lo stesso");
        assert_eq!(&jpg[0..2], &[0xFF, 0xD8]);
    }
    #[test]
    fn v2_non_espone_il_documento_legacy() {
        let b = V2Backend::with_size(4, 4);
        assert!(b.legacy_document().is_none());
    }
    #[test]
    fn metadati_e_selezione_hanno_la_forma_attesa_dalla_ui() {
        // Il flusso della UI: crea documento, aggiungi layer, selezionalo, leggi i metadati.
        let mut b = V2Backend::with_size(10, 10);
        let id = b.add_raster_layer("sfondo", 10, 10, [1, 1, 1, 255]);
        b.select_layer(id);

        let meta = b.layers_metadata();
        assert_eq!(meta.len(), 1);
        assert_eq!(meta[0].id, id, "l'id pubblico deve tornare indietro");
        assert_eq!(meta[0].name, "sfondo");
        assert_eq!(b.active_layer_id(), Some(id));

        assert!(!b.has_selection());
        b.set_selection(2, 3, 4, 5);
        let m = b.selection_meta();
        assert!(m.active);
        assert_eq!((m.x, m.y, m.width, m.height), (2, 3, 4, 5));

        b.clear_selection();
        assert!(!b.selection_meta().active);
        assert_eq!(b.selection_meta().width, 0);
    }
}
