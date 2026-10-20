// Pizzico — crates/selection/src/lib.rs
// Riferimento manifesto: §3.1, §4, §6.3
// Licenza: MIT OR Apache-2.0

//! # Pizzico Selection Engine
//!
//! Algoritmi di mascheratura e selezione:
//! - Magic Wand flood fill con soglia euclidea
//! - Graph Cut multilivello con piramide a risoluzioni multiple (Garcia et al., 2015)
//! - GrabCut iterativo basato su stima gaussiana del colore (Rother et al., 2004)
//! - Lazy Snapping (Li et al., 2004)
//!
//! ## Riferimenti (§6.3)
//! - Garcia et al. (2015), *Real-time Interactive Foreground Extraction*, GI.
//! - Rother et al. (2004), *GrabCut*, SIGGRAPH.
//! - Li et al. (2004), *Lazy Snapping*, SIGGRAPH.

pub mod grabcut;
pub mod graphcut;
pub mod snap;
pub mod wand;

pub use grabcut::GrabCut;
pub use graphcut::MultilevelGraphCut;
pub use wand::magic_wand_selection;
