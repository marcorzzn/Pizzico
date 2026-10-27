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

// ──────────────────────────────────────────────────────────────────────────────
// Crop del documento
// ──────────────────────────────────────────────────────────────────────────────

/// Errori possibili di [`Document::crop_document`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CropError {
    /// Larghezza o altezza richieste sono zero.
    EmptyRect,
    /// Il rettangolo richiesto esce dai limiti del documento.
    OutOfBounds,
}

impl std::fmt::Display for CropError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CropError::EmptyRect => write!(f, "il rettangolo di ritaglio ha area zero"),
            CropError::OutOfBounds => write!(f, "il rettangolo di ritaglio esce dal documento"),
        }
    }
}

impl std::error::Error for CropError {}

impl Document {
    /// Ritaglia il documento al rettangolo `(x, y, w, h)`.
    ///
    /// Semantica: la tela diventa `w × h` e ogni livello viene traslato di
    /// `(-x, -y)`. I buffer dei livelli **non** vengono ritagliati: il
    /// compositing salta già i pixel che cadono fuori dalla tela, quindi il
    /// risultato visibile è identico a un ritaglio distruttivo, mentre i dati
    /// restano intatti (nessun livello corrotto se sporge, e nessuna
    /// reimplementazione del buffer per ogni livello).
    ///
    /// La selezione viene azzerata perché il suo rettangolo è relativo alla
    /// tela precedente.
    pub fn crop_document(&mut self, x: u32, y: u32, w: u32, h: u32) -> Result<(), CropError> {
        if w == 0 || h == 0 {
            return Err(CropError::EmptyRect);
        }

        let right = x.checked_add(w).ok_or(CropError::OutOfBounds)?;
        let bottom = y.checked_add(h).ok_or(CropError::OutOfBounds)?;
        if right > self.width || bottom > self.height {
            return Err(CropError::OutOfBounds);
        }

        for layer in &mut self.layers {
            layer.transform.x -= x as i32;
            layer.transform.y -= y as i32;
        }

        self.width = w;
        self.height = h;
        self.selection = RectSelection::default();
        Ok(())
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

    // ── Crop ────────────────────────────────────────────────────────────────

    #[test]
    fn test_crop_full_document_is_noop() {
        let mut doc = Document::new(200, 100, "test");
        let before_w = doc.width;
        let before_h = doc.height;

        assert_eq!(doc.crop_document(0, 0, 200, 100), Ok(()));
        assert_eq!(doc.width, before_w);
        assert_eq!(doc.height, before_h);
        assert_eq!(doc.layers[0].transform.x, 0);
        assert_eq!(doc.layers[0].transform.y, 0);
    }

    #[test]
    fn test_crop_half_document_translates_layers() {
        let mut doc = Document::new(200, 100, "test");
        // layer spostato in (50, 20)
        doc.layers[0].transform.x = 50;
        doc.layers[0].transform.y = 20;

        assert_eq!(doc.crop_document(50, 20, 100, 50), Ok(()));
        assert_eq!(doc.width, 100);
        assert_eq!(doc.height, 50);
        // il contenuto che era in (50,20) ora è nell'angolo
        assert_eq!(doc.layers[0].transform.x, 0);
        assert_eq!(doc.layers[0].transform.y, 0);
    }

    #[test]
    fn test_crop_keeps_layer_pixels_outside_canvas() {
        // Un livello che sporge conserva il proprio buffer: il compositing
        // salta i pixel fuori tela, quindi il crop non deve corromperlo.
        let mut doc = Document::new(100, 100, "test");
        let original_len = match &doc.layers[0].kind {
            crate::LayerKind::Raster { pixels, .. } => pixels.len(),
            _ => panic!("il livello di sfondo deve essere raster"),
        };

        assert_eq!(doc.crop_document(25, 25, 50, 50), Ok(()));

        let after_len = match &doc.layers[0].kind {
            crate::LayerKind::Raster { pixels, .. } => pixels.len(),
            _ => panic!("il livello di sfondo deve essere raster"),
        };
        assert_eq!(after_len, original_len, "il buffer del livello non va ridimensionato");
        assert_eq!(doc.layers[0].transform.x, -25);
        assert_eq!(doc.layers[0].transform.y, -25);
    }

    #[test]
    fn test_crop_rejects_out_of_bounds() {
        let mut doc = Document::new(100, 100, "test");
        assert_eq!(doc.crop_document(60, 0, 50, 50), Err(CropError::OutOfBounds));
        assert_eq!(doc.crop_document(0, 60, 50, 50), Err(CropError::OutOfBounds));
        // nessuna modifica dopo un rifiuto
        assert_eq!((doc.width, doc.height), (100, 100));
        assert_eq!(doc.layers[0].transform.x, 0);
    }

    #[test]
    fn test_crop_rejects_empty_rect() {
        let mut doc = Document::new(100, 100, "test");
        assert_eq!(doc.crop_document(0, 0, 0, 10), Err(CropError::EmptyRect));
        assert_eq!(doc.crop_document(0, 0, 10, 0), Err(CropError::EmptyRect));
    }

    #[test]
    fn test_crop_composite_has_new_size() {
        let mut doc = Document::new(100, 100, "test");
        assert_eq!(doc.crop_document(10, 10, 40, 30), Ok(()));
        let buffer = crate::composite_layers(&doc);
        assert_eq!(buffer.len(), 40 * 30 * 4);
    }
}