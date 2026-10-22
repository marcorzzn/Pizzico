// Pizzico — crates/core/src/history.rs
// Riferimento manifesto: §3.1, §4, §10 Fase 1
// Licenza: MIT OR Apache-2.0

//! Sistema di Undo/Redo e gestione della storia delle modifiche basato su Command Pattern.
//! Supporta comandi su livelli (aggiunta, rimozione, opacità, visibilità)
//! e comandi raster (StrokeCommand) con bounding-box sub-rect per massima efficienza.

use crate::document::Document;
use crate::layer::{Layer, LayerId, LayerKind};

/// Trait per tutti i comandi che modificano il documento e supportano Undo/Redo.
pub trait Command: Send + Sync {
    /// Applica (o ri-applica durante Redo) l'effetto del comando sul documento.
    fn apply(&mut self, doc: &mut Document);

    /// Annulla (Undo) l'effetto del comando sul documento.
    fn undo(&mut self, doc: &mut Document);
}

/// Comando per aggiungere un livello al documento.
pub struct AddLayerCommand {
    layer: Option<Layer>,
    layer_id: LayerId,
}

impl AddLayerCommand {
    pub fn new(layer: Layer) -> Self {
        let layer_id = layer.id;
        Self {
            layer: Some(layer),
            layer_id,
        }
    }
}

impl Command for AddLayerCommand {
    fn apply(&mut self, doc: &mut Document) {
        if let Some(l) = self.layer.take() {
            doc.add_layer(l);
        }
    }

    fn undo(&mut self, doc: &mut Document) {
        if let Some(removed) = doc.remove_layer(self.layer_id) {
            self.layer = Some(removed);
        }
    }
}

/// Comando per rimuovere un livello dal documento.
pub struct RemoveLayerCommand {
    layer: Option<Layer>,
    index: usize,
    layer_id: LayerId,
}

impl RemoveLayerCommand {
    pub fn new(doc: &Document, layer_id: LayerId) -> Option<Self> {
        let index = doc.layers.iter().position(|l| l.id == layer_id)?;
        Some(Self {
            layer: None,
            index,
            layer_id,
        })
    }
}

impl Command for RemoveLayerCommand {
    fn apply(&mut self, doc: &mut Document) {
        if let Some(pos) = doc.layers.iter().position(|l| l.id == self.layer_id) {
            self.index = pos;
            self.layer = Some(doc.layers.remove(pos));
            if doc.active_layer_id == Some(self.layer_id) {
                doc.active_layer_id = doc.layers.last().map(|l| l.id);
            }
        }
    }

    fn undo(&mut self, doc: &mut Document) {
        if let Some(layer) = self.layer.take() {
            let insert_pos = self.index.min(doc.layers.len());
            let id = layer.id;
            doc.layers.insert(insert_pos, layer);
            doc.active_layer_id = Some(id);
        }
    }
}

/// Comando per modificare l'opacità di un livello.
pub struct SetOpacityCommand {
    pub id: LayerId,
    pub old: f32,
    pub new: f32,
}

impl SetOpacityCommand {
    pub fn new(id: LayerId, old: f32, new: f32) -> Self {
        Self { id, old, new }
    }
}

impl Command for SetOpacityCommand {
    fn apply(&mut self, doc: &mut Document) {
        doc.set_layer_opacity(self.id, self.new);
    }

    fn undo(&mut self, doc: &mut Document) {
        doc.set_layer_opacity(self.id, self.old);
    }
}

/// Comando per modificare la visibilità di un livello.
pub struct SetVisibilityCommand {
    pub id: LayerId,
    pub old: bool,
    pub new: bool,
}

impl SetVisibilityCommand {
    pub fn new(id: LayerId, old: bool, new: bool) -> Self {
        Self { id, old, new }
    }
}

impl Command for SetVisibilityCommand {
    fn apply(&mut self, doc: &mut Document) {
        doc.set_layer_visibility(self.id, self.new);
    }

    fn undo(&mut self, doc: &mut Document) {
        doc.set_layer_visibility(self.id, self.old);
    }
}

/// Comando per un tratto raster (pennello/gomma/filtro).
/// Salva i pixel prima e dopo. Se `bounds` è `Some((x, y, w, h))`,
/// conserva e ripristina solo la porzione modificata per ottimizzare memoria e prestazioni.
pub struct StrokeCommand {
    pub layer_id: LayerId,
    pub bounds: Option<(u32, u32, u32, u32)>,
    pub before_pixels: Vec<u8>,
    pub after_pixels: Vec<u8>,
}

impl StrokeCommand {
    pub fn new_full(layer_id: LayerId, before_pixels: Vec<u8>, after_pixels: Vec<u8>) -> Self {
        Self {
            layer_id,
            bounds: None,
            before_pixels,
            after_pixels,
        }
    }

    pub fn new_bounded(
        layer_id: LayerId,
        bounds: (u32, u32, u32, u32),
        before_pixels: Vec<u8>,
        after_pixels: Vec<u8>,
    ) -> Self {
        Self {
            layer_id,
            bounds: Some(bounds),
            before_pixels,
            after_pixels,
        }
    }

    fn apply_patch(doc: &mut Document, layer_id: LayerId, bounds: Option<(u32, u32, u32, u32)>, patch: &[u8]) {
        if let Some(layer) = doc.get_layer_mut(layer_id) {
            if let LayerKind::Raster { width, height: _, pixels } = &mut layer.kind {
                if let Some((bx, by, bw, bh)) = bounds {
                    let bw_bytes = (bw * 4) as usize;
                    for row in 0..bh {
                        let src_offset = (row * bw * 4) as usize;
                        let dst_offset = (((by + row) * *width + bx) * 4) as usize;
                        if dst_offset + bw_bytes <= pixels.len() && src_offset + bw_bytes <= patch.len() {
                            pixels[dst_offset..dst_offset + bw_bytes]
                                .copy_from_slice(&patch[src_offset..src_offset + bw_bytes]);
                        }
                    }
                } else if pixels.len() == patch.len() {
                    pixels.copy_from_slice(patch);
                }
            }
        }
    }
}

impl Command for StrokeCommand {
    fn apply(&mut self, doc: &mut Document) {
        Self::apply_patch(doc, self.layer_id, self.bounds, &self.after_pixels);
    }

    fn undo(&mut self, doc: &mut Document) {
        Self::apply_patch(doc, self.layer_id, self.bounds, &self.before_pixels);
    }
}

/// Gestore della cronologia (History) per operazioni Undo e Redo.
pub struct History {
    commands: Vec<Box<dyn Command>>,
    position: usize,
    max_depth: usize,
}

impl History {
    pub fn new(max_depth: usize) -> Self {
        Self {
            commands: Vec::new(),
            position: 0,
            max_depth: if max_depth == 0 { 50 } else { max_depth },
        }
    }

    /// Aggiunge un comando già eseguito allo stack della cronologia.
    /// Cancella i comandi futuri (rami Redo troncati) e gestisce il limite di profondità.
    pub fn push(&mut self, command: Box<dyn Command>) {
        if self.position < self.commands.len() {
            self.commands.truncate(self.position);
        }

        if self.commands.len() >= self.max_depth {
            self.commands.remove(0);
            if self.position > 0 {
                self.position -= 1;
            }
        }

        self.commands.push(command);
        self.position = self.commands.len();
    }

    /// Applica il comando e lo registra nella cronologia.
    pub fn apply_and_push(&mut self, mut command: Box<dyn Command>, doc: &mut Document) {
        command.apply(doc);
        self.push(command);
    }

    /// Annulla l'ultimo comando applicato. Restituisce `true` se l'operazione è avvenuta.
    pub fn undo(&mut self, doc: &mut Document) -> bool {
        if self.can_undo() {
            self.position -= 1;
            self.commands[self.position].undo(doc);
            true
        } else {
            false
        }
    }

    /// Riapplica il prossimo comando annullato. Restituisce `true` se l'operazione è avvenuta.
    pub fn redo(&mut self, doc: &mut Document) -> bool {
        if self.can_redo() {
            self.commands[self.position].apply(doc);
            self.position += 1;
            true
        } else {
            false
        }
    }

    pub fn can_undo(&self) -> bool {
        self.position > 0
    }

    pub fn can_redo(&self) -> bool {
        self.position < self.commands.len()
    }

    pub fn undo_count(&self) -> usize {
        self.position
    }

    pub fn redo_count(&self) -> usize {
        self.commands.len().saturating_sub(self.position)
    }

    pub fn clear(&mut self) {
        self.commands.clear();
        self.position = 0;
    }
}

impl Default for History {
    fn default() -> Self {
        Self::new(50)
    }
}

// Struttura a snapshot per comandi globali e retro-compatibilità con CommandExecutor
pub struct HistoryStack {
    undo_stack: Vec<Document>,
    redo_stack: Vec<Document>,
    max_history_depth: usize,
}

impl HistoryStack {
    pub fn new(max_depth: usize) -> Self {
        Self {
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
            max_history_depth: max_depth,
        }
    }

    pub fn push_snapshot(&mut self, current: &Document) {
        if self.undo_stack.len() >= self.max_history_depth {
            self.undo_stack.remove(0);
        }
        self.undo_stack.push(current.clone());
        self.redo_stack.clear();
    }

    pub fn undo(&mut self, current: &Document) -> Option<Document> {
        if let Some(prev) = self.undo_stack.pop() {
            self.redo_stack.push(current.clone());
            Some(prev)
        } else {
            None
        }
    }

    pub fn redo(&mut self, current: &Document) -> Option<Document> {
        if let Some(next) = self.redo_stack.pop() {
            self.undo_stack.push(current.clone());
            Some(next)
        } else {
            None
        }
    }

    pub fn can_undo(&self) -> bool {
        !self.undo_stack.is_empty()
    }

    pub fn can_redo(&self) -> bool {
        !self.redo_stack.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_history_opacity_undo_redo() {
        let mut doc = Document::new(100, 100, "Test");
        let id = doc.layers[0].id;
        let mut history = History::new(10);

        assert_eq!(doc.get_layer(id).unwrap().opacity, 1.0);
        assert!(!history.can_undo());
        assert!(!history.can_redo());

        let cmd = Box::new(SetOpacityCommand::new(id, 1.0, 0.5));
        history.apply_and_push(cmd, &mut doc);

        assert_eq!(doc.get_layer(id).unwrap().opacity, 0.5);
        assert!(history.can_undo());
        assert!(!history.can_redo());

        // Undo
        assert!(history.undo(&mut doc));
        assert_eq!(doc.get_layer(id).unwrap().opacity, 1.0);
        assert!(!history.can_undo());
        assert!(history.can_redo());

        // Redo
        assert!(history.redo(&mut doc));
        assert_eq!(doc.get_layer(id).unwrap().opacity, 0.5);
        assert!(history.can_undo());
        assert!(!history.can_redo());
    }

    #[test]
    fn test_history_stroke_bounded() {
        let mut doc = Document::new(10, 10, "Test Stroke");
        let id = doc.layers[0].id;
        let mut history = History::new(10);

        // Before pixels: all white [255, 255, 255, 255]
        let before_patch = vec![255u8; 2 * 2 * 4];
        // After pixels: red [255, 0, 0, 255]
        let mut after_patch = Vec::new();
        for _ in 0..4 {
            after_patch.extend_from_slice(&[255, 0, 0, 255]);
        }

        let cmd = Box::new(StrokeCommand::new_bounded(
            id,
            (2, 2, 2, 2),
            before_patch,
            after_patch,
        ));

        history.apply_and_push(cmd, &mut doc);

        // Check pixel at (2, 2)
        if let LayerKind::Raster { width, pixels, .. } = &doc.get_layer(id).unwrap().kind {
            let offset = ((2 * width + 2) * 4) as usize;
            assert_eq!(&pixels[offset..offset + 4], &[255, 0, 0, 255]);
        } else {
            panic!("Expected raster layer");
        }

        // Undo
        assert!(history.undo(&mut doc));
        if let LayerKind::Raster { width, pixels, .. } = &doc.get_layer(id).unwrap().kind {
            let offset = ((2 * width + 2) * 4) as usize;
            assert_eq!(&pixels[offset..offset + 4], &[255, 255, 255, 255]);
        }

        // Redo
        assert!(history.redo(&mut doc));
        if let LayerKind::Raster { width, pixels, .. } = &doc.get_layer(id).unwrap().kind {
            let offset = ((2 * width + 2) * 4) as usize;
            assert_eq!(&pixels[offset..offset + 4], &[255, 0, 0, 255]);
        }
    }

    #[test]
    fn test_history_add_remove_layer() {
        let mut doc = Document::new_empty(100, 100);
        let mut history = History::new(10);

        let layer = Layer::new_raster(1, "Nuovo", 100, 100);
        let cmd = Box::new(AddLayerCommand::new(layer));
        history.apply_and_push(cmd, &mut doc);

        assert_eq!(doc.layer_count(), 1);
        assert!(history.undo(&mut doc));
        assert_eq!(doc.layer_count(), 0);
        assert!(history.redo(&mut doc));
        assert_eq!(doc.layer_count(), 1);
    }
}
