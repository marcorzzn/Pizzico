// Pizzico — crates/core/src/lib.rs
// Riferimento manifesto: §3.1, §4, §6.1
// Licenza: MIT OR Apache-2.0

//! # Pizzico Core
//!
//! Questo crate implementa l'infrastruttura fondamentale del documento grafico di Pizzico:
//! - Modello a livelli polimorfici (raster, vettoriali, testo, regolazione)
//! - Compositing alpha premoltiplicato secondo le equazioni di Porter-Duff e Smith (1995)
//! - Blend modes deterministici e invertibili (Horita et al., WACV 2022)
//! - Stack di cronologia per Undo/Redo ad albero con snapshot compatti
//!
//! ## Riferimenti Scientifici (§6.1)
//! - Smith, A. R. (1995). *Alpha and the History of Digital Compositing*.
//! - Horita, D. et al. (2022). *Unblending for Layered Image Decomposition*, WACV 2022.

pub mod blend;
pub mod compositing;
pub mod document;
pub mod history;
pub mod layer;

pub use blend::{BlendMode, blend_pixel};
pub use compositing::{CompositeBuffer, composite_layers};
pub use document::{Document, DocumentMetadata};
pub use history::{
    AddLayerCommand, Command, History, HistoryStack, RemoveLayerCommand, SetOpacityCommand,
    SetVisibilityCommand, StrokeCommand,
};
pub use layer::{Layer, LayerContent, LayerId, LayerKind};
