// Pizzico — crates/core/src/document.rs
// Riferimento manifesto: §3.1, §4, §5.4
// Licenza: MIT OR Apache-2.0

//! Struttura centrale del Documento di Pizzico.
//! Include metadati, dimensioni canvas, albero dei livelli e gestione ID univoci.

use crate::layer::{Layer, LayerId};
use crate::selection::RectSelection;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DocumentMetadata {
    pub title: String,
    pub author: String,
    pub created_at_unix: u64,
    pub modified_at_unix: u64,
    pub color_space: String,
    pub dpi: f32,
}

impl Default for DocumentMetadata {
    fn default() -> Self {
        Self {
            title: "Senza Titolo".to_string(),
            author: "Pizzico User".to_string(),
            created_at_unix: 0,
            modified_at_unix: 0,
            color_space: "sRGB".to_string(),
            dpi: 72.0,
        }
    }
}

/// Modello del Documento grafico principale.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Document {
    pub width: u32,
    pub height: u32,
    pub metadata: DocumentMetadata,
    pub layers: Vec<Layer>,
    pub active_layer_id: Option<LayerId>,
    pub selection: RectSelection,
    next_layer_id: LayerId,
}

impl Document {
    /// Crea un nuovo documento con le dimensioni specificate e un livello di sfondo bianco iniziale.
    pub fn new(width: u32, height: u32, title: &str) -> Self {
        let mut doc = Self::new_empty(width, height);
        doc.metadata.title = title.to_string();

        // Livello iniziale di sfondo bianco opaco
        let bg_id = doc.allocate_layer_id();
        let bg_layer = Layer::new_raster_color(bg_id, "Sfondo", width, height, [255, 255, 255, 255]);
        doc.add_layer(bg_layer);
        doc
    }

    /// Crea un documento vuoto senza livelli iniziali.
    pub fn new_empty(width: u32, height: u32) -> Self {
        Self {
            width,
            height,
            metadata: DocumentMetadata::default(),
            layers: Vec::new(),
            active_layer_id: None,
            selection: RectSelection::default(),
            next_layer_id: 1,
        }
    }

    /// Genera un identificativo numerico progressivo univoco per un nuovo livello.
    pub fn allocate_layer_id(&mut self) -> LayerId {
        let id = self.next_layer_id;
        self.next_layer_id += 1;
        id
    }

    /// Aggiunge un livello in cima allo stack e lo seleziona come livello attivo.
    pub fn add_layer(&mut self, layer: Layer) -> LayerId {
        let id = layer.id;
        self.layers.push(layer);
        self.active_layer_id = Some(id);
        id
    }

    /// Restituisce un riferimento immutabile al livello specificato per ID.
    pub fn get_layer(&self, id: LayerId) -> Option<&Layer> {
        self.layers.iter().find(|l| l.id == id)
    }

    /// Restituisce un riferimento mutabile al livello specificato per ID.
    pub fn get_layer_mut(&mut self, id: LayerId) -> Option<&mut Layer> {
        self.layers.iter_mut().find(|l| l.id == id)
    }

    /// Restituisce un riferimento immutabile al livello attualmente attivo.
    pub fn get_active_layer(&self) -> Option<&Layer> {
        self.active_layer_id.and_then(|id| self.get_layer(id))
    }

    /// Restituisce un riferimento mutabile al livello attualmente attivo.
    pub fn get_active_layer_mut(&mut self) -> Option<&mut Layer> {
        let active_id = self.active_layer_id?;
        self.get_layer_mut(active_id)
    }

    /// Rimuove un livello dato il suo ID e aggiorna il livello attivo.
    pub fn remove_layer(&mut self, id: LayerId) -> Option<Layer> {
        if let Some(pos) = self.layers.iter().position(|l| l.id == id) {
            let removed = self.layers.remove(pos);
            if self.active_layer_id == Some(id) {
                self.active_layer_id = self.layers.last().map(|l| l.id);
            }
            Some(removed)
        } else {
            None
        }
    }

    /// Imposta l'opacità di un livello (clamped tra 0.0 e 1.0).
    pub fn set_layer_opacity(&mut self, id: LayerId, opacity: f32) -> bool {
        if let Some(layer) = self.get_layer_mut(id) {
            layer.opacity = opacity.clamp(0.0, 1.0);
            true
        } else {
            false
        }
    }

    /// Imposta la visibilità di un livello.
    pub fn set_layer_visibility(&mut self, id: LayerId, visible: bool) -> bool {
        if let Some(layer) = self.get_layer_mut(id) {
            layer.visible = visible;
            true
        } else {
            false
        }
    }

    /// Imposta il livello attivo specificato per ID.
    pub fn select_layer(&mut self, id: LayerId) -> bool {
        if self.get_layer(id).is_some() {
            self.active_layer_id = Some(id);
            true
        } else {
            false
        }
    }

    /// Imposta l'offset (x, y) della traslazione del livello specificato.
    pub fn set_layer_offset(&mut self, id: LayerId, x: i32, y: i32) -> bool {
        if let Some(layer) = self.get_layer_mut(id) {
            layer.transform.x = x;
            layer.transform.y = y;
            true
        } else {
            false
        }
    }

    /// Sposta (trasla di dx, dy) il livello specificato.
    pub fn translate_layer(&mut self, id: LayerId, dx: i32, dy: i32) -> bool {
        if let Some(layer) = self.get_layer_mut(id) {
            layer.transform.x += dx;
            layer.transform.y += dy;
            true
        } else {
            false
        }
    }

    /// Imposta la selezione rettangolare attiva nel documento.
    pub fn set_selection(&mut self, x: u32, y: u32, width: u32, height: u32) {
        self.selection = RectSelection::new(x, y, width, height);
    }

    /// Annulla e rimuove la selezione attiva nel documento.
    pub fn clear_selection(&mut self) {
        self.selection = RectSelection::none();
    }

    /// Verifica se è presente una selezione rettangolare attiva.
    pub fn has_active_selection(&self) -> bool {
        self.selection.active
    }

    /// Restituisce il numero totale di livelli presenti.
    pub fn layer_count(&self) -> usize {
        self.layers.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_document_creation() {
        let doc = Document::new(800, 600, "Progetto Test");
        assert_eq!(doc.width, 800);
        assert_eq!(doc.height, 600);
        assert_eq!(doc.metadata.title, "Progetto Test");
        assert_eq!(doc.layer_count(), 1);
        assert_eq!(doc.layers[0].name, "Sfondo");
        assert_eq!(doc.active_layer_id, Some(1));
    }

    #[test]
    fn test_add_and_get_layer() {
        let mut doc = Document::new_empty(400, 300);
        assert_eq!(doc.layer_count(), 0);

        let id1 = doc.allocate_layer_id();
        let layer1 = Layer::new_raster_color(id1, "Livello 1", 400, 300, [255, 0, 0, 255]);
        doc.add_layer(layer1);

        assert_eq!(doc.layer_count(), 1);
        assert_eq!(doc.active_layer_id, Some(id1));

        let found = doc.get_layer(id1);
        assert!(found.is_some());
        assert_eq!(found.unwrap().name, "Livello 1");
    }

    #[test]
    fn test_remove_layer() {
        let mut doc = Document::new_empty(400, 300);
        let id1 = doc.allocate_layer_id();
        let id2 = doc.allocate_layer_id();

        doc.add_layer(Layer::new_raster(id1, "A", 400, 300));
        doc.add_layer(Layer::new_raster(id2, "B", 400, 300));

        assert_eq!(doc.layer_count(), 2);
        assert_eq!(doc.active_layer_id, Some(id2));

        let removed = doc.remove_layer(id2);
        assert!(removed.is_some());
        assert_eq!(removed.unwrap().name, "B");
        assert_eq!(doc.layer_count(), 1);
        assert_eq!(doc.active_layer_id, Some(id1));

        // Rimuovere ID inesistente ritorna None
        assert!(doc.remove_layer(999).is_none());
    }

    #[test]
    fn test_unique_layer_ids() {
        let mut doc = Document::new_empty(100, 100);
        let id1 = doc.allocate_layer_id();
        let id2 = doc.allocate_layer_id();
        let id3 = doc.allocate_layer_id();
        assert_ne!(id1, id2);
        assert_ne!(id2, id3);
        assert_ne!(id1, id3);
    }

    #[test]
    fn test_layer_opacity_and_visibility() {
        let mut doc = Document::new_empty(100, 100);
        let id = doc.allocate_layer_id();
        doc.add_layer(Layer::new_raster(id, "Livello", 100, 100));

        assert_eq!(doc.get_layer(id).unwrap().opacity, 1.0);
        assert!(doc.get_layer(id).unwrap().visible);

        assert!(doc.set_layer_opacity(id, 0.42));
        assert_eq!(doc.get_layer(id).unwrap().opacity, 0.42);

        // Clamping check
        doc.set_layer_opacity(id, 1.5);
        assert_eq!(doc.get_layer(id).unwrap().opacity, 1.0);
        doc.set_layer_opacity(id, -0.5);
        assert_eq!(doc.get_layer(id).unwrap().opacity, 0.0);

        assert!(doc.set_layer_visibility(id, false));
        assert!(!doc.get_layer(id).unwrap().visible);

        // Inexistent ID
        assert!(!doc.set_layer_opacity(999, 0.5));
        assert!(!doc.set_layer_visibility(999, true));
    }

    #[test]
    fn test_select_layer() {
        let mut doc = Document::new_empty(100, 100);
        let id1 = doc.allocate_layer_id();
        let id2 = doc.allocate_layer_id();
        doc.add_layer(Layer::new_raster(id1, "L1", 100, 100));
        doc.add_layer(Layer::new_raster(id2, "L2", 100, 100));

        assert_eq!(doc.active_layer_id, Some(id2));

        assert!(doc.select_layer(id1));
        assert_eq!(doc.active_layer_id, Some(id1));

        assert!(!doc.select_layer(999));
        assert_eq!(doc.active_layer_id, Some(id1));
    }
}
