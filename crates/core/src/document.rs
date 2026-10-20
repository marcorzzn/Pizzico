// Pizzico — crates/core/src/document.rs
// Riferimento manifesto: §3.1, §4, §5.4
// Licenza: MIT OR Apache-2.0

//! Struttura centrale del Documento di Pizzico.
//! Include metadati, dimensioni canvas, palette, risoluzione e albero dei livelli.

use crate::layer::{Layer, LayerId};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub width: u32,
    pub height: u32,
    pub metadata: DocumentMetadata,
    pub layers: Vec<Layer>,
    pub active_layer_id: Option<LayerId>,
    next_layer_id: LayerId,
}

impl Document {
    pub fn new(width: u32, height: u32, title: &str) -> Self {
        let mut doc = Self {
            width,
            height,
            metadata: DocumentMetadata {
                title: title.to_string(),
                ..Default::default()
            },
            layers: Vec::new(),
            active_layer_id: None,
            next_layer_id: 1,
        };

        // Livello iniziale di sfondo
        let bg_layer = Layer::new_raster(doc.allocate_layer_id(), "Sfondo".to_string(), width, height);
        doc.add_layer(bg_layer);
        doc
    }

    pub fn allocate_layer_id(&mut self) -> LayerId {
        let id = self.next_layer_id;
        self.next_layer_id += 1;
        id
    }

    pub fn add_layer(&mut self, layer: Layer) {
        let id = layer.id;
        self.layers.push(layer);
        self.active_layer_id = Some(id);
    }

    pub fn get_layer(&self, id: LayerId) -> Option<&Layer> {
        self.layers.iter().find(|l| l.id == id)
    }

    pub fn get_layer_mut(&mut self, id: LayerId) -> Option<&mut Layer> {
        self.layers.iter_mut().find(|l| l.id == id)
    }

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
}
