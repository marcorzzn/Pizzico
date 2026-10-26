//! Pizzico Session — stato dell'editor, portabile su WebAssembly.
//!
//! Porting della semantica di `pizzart/crates/ui/src/state.rs` (struct `Editor`) in un
//! crate che **non conosce né il disco né la GPU**.
//!
//! ## Perché esiste
//!
//! In Pizzart lo stato dell'editor viveva dentro il crate della UI (egui), quindi non
//! era riutilizzabile dal web. Qui la stessa semantica (undo/redo, drag dell'opacità,
//! unione verso il basso, selezione convertita in maschera, tratti di pennello) viene
//! isolata: il desktop e il bridge WASM possono usarla entrambi.
//!
//! ## Regole rispettate
//!
//! - Nessuna API di filesystem o di path: il crate compila per
//!   `wasm32-unknown-unknown` senza adattamenti.
//! - Nessuna dipendenza GPU: gli effetti passano da un trait ([`EffectApplier`]) che
//!   l'host implementa come preferisce (CPU, GPU, finto nei test).
//! - Ogni operazione che modifica il documento passa da un comando, quindi è annullabile.

use std::sync::Arc;

use pizzico_engine_core::history::{AddLayer, MergeDown, RemoveLayer, SetLayerMask, SetOpacity};
use pizzico_engine_core::{Document, EllipseSelection, Layer, LayerId, RectSelection};
use pizzico_engine_draw::{Brush, Point, Stroke};

// ──────────────────────────────────────────────────────────────────────────────
// Strumenti
// ──────────────────────────────────────────────────────────────────────────────

/// Strumento attivo nell'editor.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum Tool {
    #[default]
    Select,
    Brush,
    Text,
    Rect,
}

// ──────────────────────────────────────────────────────────────────────────────
// Effetti
// ──────────────────────────────────────────────────────────────────────────────

/// Effetto richiesto alla sessione.
///
/// Non contiene formule: è solo una descrizione. Chi la trasforma in pixel è
/// [`EffectApplier`], che può usare `pizzico-engine-render::cpu` (puro) oppure la GPU.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum EffectOp {
    Brightness(f32),
    Contrast(f32),
    Saturate(f32),
    Blur(f32),
    Sharpen { amount: f32, radius: f32 },
    Glow {
        threshold: f32,
        intensity: f32,
        radius: f32,
    },
}

impl EffectOp {
    /// Etichetta per il nome del layer risultante e per la history.
    pub fn label(&self) -> &'static str {
        match self {
            EffectOp::Brightness(_) => "luminosità",
            EffectOp::Contrast(_) => "contrasto",
            EffectOp::Saturate(_) => "saturazione",
            EffectOp::Blur(_) => "sfocatura",
            EffectOp::Sharpen { .. } => "nitidezza",
            EffectOp::Glow { .. } => "bagliore",
        }
    }
}

/// Chi sa trasformare pixel in pixel.
///
/// L'implementazione reale (bridge o desktop) userà `pizzico-engine-render::cpu`;
/// i test usano un'implementazione finta, così la sessione resta verificabile senza GPU.
pub trait EffectApplier {
    /// Applica `effect` ai pixel di `source` e restituisce `(larghezza, altezza, RGBA8)`.
    ///
    /// Deve restituire esattamente `w * h * 4` byte.
    fn apply(&mut self, source: &Layer, effect: &EffectOp) -> Result<(u32, u32, Vec<u8>), String>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Errori
// ──────────────────────────────────────────────────────────────────────────────

/// Errore di una operazione di sessione.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum SessionError {
    /// Nessuna selezione attiva.
    NoSelection,
    /// La selezione copre zero pixel.
    EmptySelection,
    /// Il layer richiesto non esiste.
    NoLayer,
    /// Non c'è un layer sotto quello indicato.
    NoLayerBelow,
    /// L'applier di effetti ha fallito.
    Effect(String),
    /// L'applier ha restituito un buffer di dimensione sbagliata.
    InvalidPixels,
}

impl std::fmt::Display for SessionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SessionError::NoSelection => write!(f, "nessuna selezione attiva"),
            SessionError::EmptySelection => write!(f, "la selezione è vuota"),
            SessionError::NoLayer => write!(f, "il layer non esiste"),
            SessionError::NoLayerBelow => write!(f, "non c'è un layer sotto"),
            SessionError::Effect(e) => write!(f, "effetto fallito: {e}"),
            SessionError::InvalidPixels => write!(f, "buffer pixel non valido"),
        }
    }
}

impl std::error::Error for SessionError {}

// ──────────────────────────────────────────────────────────────────────────────
// Sessione
// ──────────────────────────────────────────────────────────────────────────────

/// Stato del drag di opacità: serve a produrre **un solo** comando alla fine,
/// invece di uno per ogni movimento del mouse.
struct OpacityDrag {
    id: LayerId,
    original: f32,
}

/// Stato dell'editor.
///
/// Il documento è la fonte di verità; la sessione aggiunge ciò che non deve stare
/// nel formato del file: strumento attivo, selezione in corso, punti del tratto,
/// zoom e pan.
pub struct Session {
    document: Document,
    tool: Tool,
    selected: Option<LayerId>,
    selection: Option<RectSelection>,
    brush: Brush,
    stroke_points: Vec<Point>,
    opacity_drag: Option<OpacityDrag>,
    zoom: f32,
    pan: (f32, f32),
}

impl Session {
    /// Crea una sessione con un documento vuoto.
    pub fn new(width: u32, height: u32) -> Self {
        Self::from_document(Document::new(width, height))
    }

    /// Avvolge un documento già esistente.
    pub fn from_document(document: Document) -> Self {
        Self {
            document,
            tool: Tool::Select,
            selected: None,
            selection: None,
            brush: Brush::new(24.0),
            stroke_points: Vec::new(),
            opacity_drag: None,
            zoom: 1.0,
            pan: (0.0, 0.0),
        }
    }

    // ── Accesso al documento ─────────────────────────────────────────────────

    /// Documento in sola lettura.
    pub fn document(&self) -> &Document {
        &self.document
    }

    /// Documento modificabile.
    ///
    /// Le modifiche fatte da qui **non** entrano nella history: usarlo solo per
    /// setup (creazione, caricamento) e non per operazioni interattive.
    pub fn document_mut(&mut self) -> &mut Document {
        &mut self.document
    }

    pub fn width(&self) -> u32 {
        self.document.width
    }

    pub fn height(&self) -> u32 {
        self.document.height
    }

    pub fn layer_count(&self) -> usize {
        self.document.layer_count()
    }

    /// Consuma la sessione restituendo il documento (per export o salvataggio).
    pub fn into_document(self) -> Document {
        self.document
    }

    // ── Strumento ────────────────────────────────────────────────────────────

    pub fn tool(&self) -> Tool {
        self.tool
    }

    pub fn set_tool(&mut self, tool: Tool) {
        self.tool = tool;
        self.cancel_selection();
    }

    // ── Selezione del layer ──────────────────────────────────────────────────

    pub fn selected(&self) -> Option<LayerId> {
        self.selected
    }

    /// Seleziona un layer. Restituisce `false` se l'id non esiste.
    pub fn select_layer(&mut self, id: LayerId) -> bool {
        if self.document.layer(id).is_none() {
            return false;
        }
        self.selected = Some(id);
        true
    }

    pub fn selected_layer(&self) -> Option<&Layer> {
        self.selected.and_then(|id| self.document.layer(id))
    }

    // ── History ──────────────────────────────────────────────────────────────

    pub fn undo(&mut self) -> bool {
        self.document.undo()
    }

    pub fn redo(&mut self) -> bool {
        self.document.redo()
    }

    pub fn can_undo(&self) -> bool {
        self.document.history.can_undo()
    }

    pub fn can_redo(&self) -> bool {
        self.document.history.can_redo()
    }

    pub fn history_len(&self) -> usize {
        self.document.history.len()
    }

    // ── Opacità ──────────────────────────────────────────────────────────────

    /// Imposta l'opacità con **un** comando annullabile.
    pub fn set_opacity(&mut self, id: LayerId, value: f32) -> bool {
        if self.document.layer(id).is_none() {
            return false;
        }
        let value = value.clamp(0.0, 1.0);
        self.document
            .execute(Box::new(SetOpacity::new(id, value)));
        true
    }

    /// Inizio del drag di opacità: memorizza il valore originale.
    pub fn begin_opacity_drag(&mut self, id: LayerId) -> bool {
        let Some(layer) = self.document.layer(id) else {
            return false;
        };
        self.opacity_drag = Some(OpacityDrag {
            id,
            original: layer.opacity,
        });
        true
    }

    /// Aggiornamento durante il drag: **non** produce comandi (altrimenti la history
    /// si riempirebbe di un comando per pixel di movimento).
    pub fn update_opacity_drag(&mut self, value: f32) -> bool {
        let Some(drag) = self.opacity_drag.as_ref() else {
            return false;
        };
        let id = drag.id;
        let Some(layer) = self.document.layer_mut(id) else {
            return false;
        };
        layer.opacity = value.clamp(0.0, 1.0);
        true
    }

    /// Fine del drag: ripristina il valore originale per poi applicare un unico
    /// comando con il valore finale, così l'undo torna esattamente all'inizio.
    /// Restituisce `true` se un comando è stato aggiunto.
    pub fn end_opacity_drag(&mut self) -> bool {
        let Some(drag) = self.opacity_drag.take() else {
            return false;
        };
        let Some(layer) = self.document.layer_mut(drag.id) else {
            return false;
        };
        let finale = layer.opacity;
        layer.opacity = drag.original;
        if (finale - drag.original).abs() < f32::EPSILON {
            return false;
        }
        self.document
            .execute(Box::new(SetOpacity::new(drag.id, finale)));
        true
    }

    pub fn is_dragging_opacity(&self) -> bool {
        self.opacity_drag.is_some()
    }

    // ── Struttura dei layer ──────────────────────────────────────────────────

    /// Elimina il layer selezionato (annullabile).
    pub fn delete_selected(&mut self) -> bool {
        let Some(id) = self.selected else {
            return false;
        };
        if self.document.layer(id).is_none() {
            return false;
        }
        self.document.execute(Box::new(RemoveLayer::new(id)));
        self.selected = None;
        true
    }

    /// Unisce `top` con il layer immediatamente sotto, nella stessa gerarchia.
    pub fn merge_down(&mut self, top: LayerId) -> Result<(), SessionError> {
        let parent = self.document.parent_of(top).ok_or(SessionError::NoLayer)?;
        let children = self
            .document
            .children_of(parent)
            .ok_or(SessionError::NoLayer)?;
        let posizione = children
            .iter()
            .position(|n| n.id() == top)
            .ok_or(SessionError::NoLayer)?;
        if posizione == 0 {
            return Err(SessionError::NoLayerBelow);
        }
        let bottom = children[posizione - 1].id();
        self.document
            .execute(Box::new(MergeDown::new(bottom, top, parent)));
        self.selected = Some(bottom);
        Ok(())
    }

    // ── Selezione ────────────────────────────────────────────────────────────

    /// Inizio del rettangolo di selezione (coordinate documento).
    pub fn begin_selection(&mut self, x: f32, y: f32) {
        self.selection = Some(RectSelection {
            x,
            y,
            w: 0.0,
            h: 0.0,
        });
    }

    /// Aggiornamento del rettangolo mentre si trascina.
    pub fn update_selection(&mut self, x: f32, y: f32) {
        let Some(sel) = self.selection.as_mut() else {
            return;
        };
        sel.w = x - sel.x;
        sel.h = y - sel.y;
    }

    pub fn cancel_selection(&mut self) {
        self.selection = None;
    }

    /// Limiti della selezione in corso: `(x0, y0, x1, y1)` con `x0 <= x1`.
    ///
    /// Nota: è un rettangolo per angoli, non per larghezza/altezza, perché
    /// `RectSelection::normalized()` di `pizzico-engine-core` restituisce gli angoli.
    pub fn selection_bounds(&self) -> Option<(f32, f32, f32, f32)> {
        self.selection.as_ref().map(|s| s.normalized())
    }

    /// Trasforma la selezione in corso in maschera del layer indicato (annullabile).
    pub fn apply_selection_as_mask(&mut self, id: LayerId) -> Result<(), SessionError> {
        let sel = self.selection.ok_or(SessionError::NoSelection)?;
        let (x0, y0, x1, y1) = sel.normalized();
        // Una selezione sotto il pixel non è una maschera: è un errore dell'utente.
        if (x1 - x0) < 1.0 || (y1 - y0) < 1.0 {
            return Err(SessionError::EmptySelection);
        }
        if self.document.layer(id).is_none() {
            return Err(SessionError::NoLayer);
        }
        let mask = sel.to_mask(self.document.width, self.document.height);
        self.document
            .execute(Box::new(SetLayerMask::new(id, Some(Arc::new(mask)))));
        Ok(())
    }

    /// Maschera ellittica centrata, senza passare dalla selezione rettangolare.
    pub fn apply_ellipse_mask(
        &mut self,
        id: LayerId,
        cx: f32,
        cy: f32,
        radius: f32,
    ) -> Result<(), SessionError> {
        if self.document.layer(id).is_none() {
            return Err(SessionError::NoLayer);
        }
        if radius < 1.0 {
            return Err(SessionError::EmptySelection);
        }
        let mask =
            EllipseSelection::circle(cx, cy, radius).to_mask(self.document.width, self.document.height);
        self.document
            .execute(Box::new(SetLayerMask::new(id, Some(Arc::new(mask)))));
        Ok(())
    }

    /// Rimuove la maschera (annullabile).
    pub fn clear_mask(&mut self, id: LayerId) -> Result<(), SessionError> {
        if self.document.layer(id).is_none() {
            return Err(SessionError::NoLayer);
        }
        self.document
            .execute(Box::new(SetLayerMask::new(id, None)));
        Ok(())
    }

    // ── Effetti ──────────────────────────────────────────────────────────────

    /// Applica un effetto creando un **nuovo** layer sopra la sorgente (non
    /// distruttivo), annullabile con un solo undo.
    ///
    /// L'host fornisce i pixel tramite [`EffectApplier`].
    pub fn apply_effect(
        &mut self,
        applier: &mut dyn EffectApplier,
        source: LayerId,
        effect: EffectOp,
    ) -> Result<LayerId, SessionError> {
        let (nome, opacity, blend) = {
            let layer = self.document.layer(source).ok_or(SessionError::NoLayer)?;
            (layer.name.clone(), layer.opacity, layer.blend)
        };

        let (w, h, nuovi_pixels) = {
            let layer = self.document.layer(source).ok_or(SessionError::NoLayer)?;
            applier
                .apply(layer, &effect)
                .map_err(SessionError::Effect)?
        };
        if nuovi_pixels.len() != (w as usize) * (h as usize) * 4 {
            return Err(SessionError::InvalidPixels);
        }

        let mut nuovo = Layer::new(
            format!("{nome} · {}", effect.label()),
            w,
            h,
            nuovi_pixels,
        );
        nuovo.opacity = opacity;
        nuovo.blend = blend;
        let id = nuovo.id;

        let indice = self.document.index_of(source).map(|i| i + 1);
        let comando = match indice {
            Some(i) => AddLayer::new(nuovo).at(i),
            None => AddLayer::new(nuovo),
        };
        self.document.execute(Box::new(comando));
        self.selected = Some(id);
        Ok(id)
    }

    // ── Disegno ──────────────────────────────────────────────────────────────

    pub fn brush(&self) -> &Brush {
        &self.brush
    }

    pub fn set_brush(&mut self, brush: Brush) {
        self.brush = brush;
    }

    pub fn begin_stroke(&mut self) {
        self.stroke_points.clear();
        self.tool = Tool::Brush;
    }

    pub fn push_point(&mut self, x: f32, y: f32, pressure: f32) {
        self.stroke_points
            .push(Point::new(x, y).with_pressure(pressure.clamp(0.0, 1.0)));
    }

    pub fn stroke_len(&self) -> usize {
        self.stroke_points.len()
    }

    /// Rasterizza il tratto su un nuovo layer (annullabile).
    /// Restituisce `None` se non ci sono punti.
    pub fn finish_stroke(&mut self) -> Option<LayerId> {
        if self.stroke_points.is_empty() {
            return None;
        }
        let punti = std::mem::take(&mut self.stroke_points);
        let stroke = Stroke::with_points(self.brush, punti);
        let pixels = stroke.render(self.document.width, self.document.height);
        let layer = Layer::new(
            "Pennellata",
            self.document.width,
            self.document.height,
            pixels,
        );
        let id = layer.id;
        self.document.execute(Box::new(AddLayer::new(layer)));
        self.selected = Some(id);
        Some(id)
    }

    // ── Vista ────────────────────────────────────────────────────────────────

    pub fn zoom(&self) -> f32 {
        self.zoom
    }

    /// Imposta lo zoom entro limiti ragionevoli (10%–3200%).
    pub fn set_zoom(&mut self, zoom: f32) {
        self.zoom = zoom.clamp(0.1, 32.0);
    }

    pub fn pan(&self) -> (f32, f32) {
        self.pan
    }

    pub fn set_pan(&mut self, x: f32, y: f32) {
        self.pan = (x, y);
    }

    /// Adatta lo zoom alla finestra disponibile.
    pub fn fit_to(&mut self, viewport_w: f32, viewport_h: f32) {
        if self.document.width == 0 || self.document.height == 0 {
            return;
        }
        let sx = viewport_w / self.document.width as f32;
        let sy = viewport_h / self.document.height as f32;
        self.set_zoom(sx.min(sy));
        self.pan = (0.0, 0.0);
    }
}
