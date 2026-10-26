//! Backend legacy: `pizzico-core`, il motore attuale.
//!
//! Replica esattamente il comportamento che il bridge aveva prima della Fase 4:
//! stesse operazioni, stessi comandi di history, stessa resa dei metadati.

use pizzico_core::{
    AddLayerCommand, Document, History, Layer, RemoveLayerCommand, SetOpacityCommand,
    SetVisibilityCommand,
};

use super::{DocumentMeta, EngineBackend, HistoryMeta, LayerMeta};

/// Backend basato su `pizzico-core` (motore legacy).
pub struct LegacyBackend {
    document: Document,
    history: History,
    dirty: bool,
}

impl Default for LegacyBackend {
    fn default() -> Self {
        Self::new()
    }
}

impl LegacyBackend {
    /// Crea il backend con il documento di default del bridge (800×600).
    pub fn new() -> Self {
        Self {
            document: Document::new(800, 600, "Pizzico Project"),
            history: History::new(50),
            dirty: true,
        }
    }

    /// Crea il backend con dimensioni esplicite.
    pub fn with_size(width: u32, height: u32) -> Self {
        Self {
            document: Document::new_empty(width, height),
            history: History::new(50),
            dirty: true,
        }
    }

    /// History interna (usata dal bridge finché non passa ai metodi del trait).
    pub fn history(&self) -> &History {
        &self.history
    }

    pub fn history_mut(&mut self) -> &mut History {
        &mut self.history
    }

    /// Descrive un layer nella forma attesa dal bridge.
    fn meta_of(layer: &Layer) -> LayerMeta {
        LayerMeta {
            id: layer.id,
            name: layer.name.clone(),
            kind: match &layer.kind {
                pizzico_core::LayerKind::Raster { .. } => "Raster".to_string(),
                pizzico_core::LayerKind::Vector { .. } => "Vector".to_string(),
                pizzico_core::LayerKind::Group { .. } => "Group".to_string(),
            },
            visible: layer.visible,
            locked: layer.locked,
            opacity: layer.opacity,
            blend_mode: format!("{:?}", layer.blend_mode),
            offset_x: layer.transform.x,
            offset_y: layer.transform.y,
        }
    }
}

impl EngineBackend for LegacyBackend {
    fn name(&self) -> &'static str {
        "legacy"
    }

    fn legacy_document(&self) -> Option<&Document> {
        Some(&self.document)
    }

    fn legacy_document_mut(&mut self) -> Option<&mut Document> {
        Some(&mut self.document)
    }

    fn create_document(&mut self, width: u32, height: u32) {
        self.document = Document::new_empty(width, height);
        self.history.clear();
        self.dirty = true;
    }

    fn width(&self) -> u32 {
        self.document.width
    }

    fn height(&self) -> u32 {
        self.document.height
    }

    fn title(&self) -> String {
        self.document.metadata.title.clone()
    }

    fn layer_count(&self) -> usize {
        self.document.layer_count()
    }

    fn add_raster_layer(&mut self, name: &str, width: u32, height: u32, color: [u8; 4]) -> u64 {
        let id = self.document.allocate_layer_id();
        // Il comando va costruito prima dell'inserimento: cattura il layer originale.
        let cmd = AddLayerCommand::new(Layer::new_raster_color(id, name, width, height, color));
        let creato = self
            .document
            .add_layer(Layer::new_raster_color(id, name, width, height, color));
        self.history.push(Box::new(cmd));
        self.dirty = true;
        creato
    }

    fn remove_layer(&mut self, id: u64) -> bool {
        let cmd = RemoveLayerCommand::new(&self.document, id);
        let rimosso = self.document.remove_layer(id).is_some();
        if rimosso {
            if let Some(cmd) = cmd {
                self.history.push(Box::new(cmd));
            }
            self.dirty = true;
        }
        rimosso
    }

    fn set_layer_opacity(&mut self, id: u64, opacity: f32) {
        let old = self.document.get_layer(id).map(|l| l.opacity).unwrap_or(1.0);
        self.document.set_layer_opacity(id, opacity);
        self.history
            .push(Box::new(SetOpacityCommand::new(id, old, opacity)));
        self.dirty = true;
    }

    fn set_layer_visibility(&mut self, id: u64, visible: bool) {
        let old = self.document.get_layer(id).map(|l| l.visible).unwrap_or(true);
        self.document.set_layer_visibility(id, visible);
        self.history
            .push(Box::new(SetVisibilityCommand::new(id, old, visible)));
        self.dirty = true;
    }

    fn select_layer(&mut self, id: u64) {
        self.document.select_layer(id);
    }

    fn active_layer_id(&self) -> Option<u64> {
        self.document.active_layer_id
    }

    fn layers_metadata(&self) -> Vec<LayerMeta> {
        self.document.layers.iter().map(Self::meta_of).collect()
    }

    fn composite(&self) -> Vec<u8> {
        pizzico_core::composite_layers(&self.document)
    }

    fn set_selection(&mut self, x: u32, y: u32, width: u32, height: u32) {
        self.document.set_selection(x, y, width, height);
    }

    fn clear_selection(&mut self) {
        self.document.clear_selection();
    }

    fn has_selection(&self) -> bool {
        self.document.has_active_selection()
    }

    fn selection(&self) -> Option<(u32, u32, u32, u32)> {
        let sel = &self.document.selection;
        let (x, y, w, h) = (sel.x, sel.y, sel.width, sel.height);
        if w == 0 || h == 0 {
            None
        } else {
            Some((x, y, w, h))
        }
    }

    fn is_dirty(&self) -> bool {
        self.dirty
    }

    fn set_dirty(&mut self, dirty: bool) {
        self.dirty = dirty;
    }
}

impl LegacyBackend {
    /// Metadati del documento (comodità usata dal bridge).
    pub fn document_meta(&self) -> DocumentMeta {
        DocumentMeta {
            width: self.document.width,
            height: self.document.height,
            title: self.document.metadata.title.clone(),
            layer_count: self.document.layer_count(),
        }
    }

    /// Stato della history (comodità usata dal bridge).
    pub fn history_meta(&self) -> HistoryMeta {
        HistoryMeta {
            can_undo: self.history.can_undo(),
            can_redo: self.history.can_redo(),
            undo_count: self.history.undo_count(),
            redo_count: self.history.redo_count(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn il_backend_legacy_crea_documenti_e_layer() {
        let mut b = LegacyBackend::with_size(64, 48);
        assert_eq!((b.width(), b.height()), (64, 48));
        assert_eq!(b.layer_count(), 0);

        let id = b.add_raster_layer("prova", 64, 48, [10, 20, 30, 255]);
        assert_eq!(b.layer_count(), 1);
        assert_eq!(b.active_layer_id(), Some(id));

        let meta = b.layers_metadata();
        assert_eq!(meta.len(), 1);
        assert_eq!(meta[0].name, "prova");
        assert_eq!(meta[0].kind, "Raster");
        assert_eq!(meta[0].id, id);
    }

    #[test]
    fn il_composito_ha_le_dimensioni_del_documento() {
        let mut b = LegacyBackend::with_size(8, 6);
        b.add_raster_layer("pieno", 8, 6, [200, 0, 0, 255]);
        let buf = b.composite();
        assert_eq!(buf.len(), 8 * 6 * 4);
    }

    #[test]
    fn opacita_e_visibilita_finiscono_in_history() {
        let mut b = LegacyBackend::with_size(8, 8);
        let id = b.add_raster_layer("l", 8, 8, [255, 255, 255, 255]);
        let base = b.history_meta().undo_count;

        b.set_layer_opacity(id, 0.5);
        b.set_layer_visibility(id, false);
        assert_eq!(b.history_meta().undo_count, base + 2);
    }

    #[test]
    fn selezione_esiste_solo_se_ha_area() {
        let mut b = LegacyBackend::with_size(10, 10);
        assert!(!b.has_selection());
        b.set_selection(2, 2, 4, 4);
        assert!(b.has_selection());
        assert_eq!(b.selection(), Some((2, 2, 4, 4)));
        b.clear_selection();
        assert!(!b.has_selection());
    }

    #[test]
    fn create_document_resetta_tutto() {
        let mut b = LegacyBackend::with_size(8, 8);
        b.add_raster_layer("l", 8, 8, [1, 2, 3, 255]);
        b.create_document(20, 10);
        assert_eq!((b.width(), b.height()), (20, 10));
        assert_eq!(b.layer_count(), 0);
        assert_eq!(b.history_meta().undo_count, 0);
        assert!(b.is_dirty());
    }
}
