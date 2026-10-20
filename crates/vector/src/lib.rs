// Pizzico — crates/vector/src/lib.rs
// Riferimento manifesto: §3.1, §4, §6.2
// Licenza: MIT OR Apache-2.0

//! # Pizzico Vector Engine
//!
//! Kernel geometrico e vettoriale:
//! - Curve Bézier cubiche parametriche e fitting (Lyche & Merrien, 2014)
//! - Curvature Tool basato su κ-curves con continuità G2/C2 (Miura et al., 2021)
//! - Espansione del tratto con spirali di Eulero (Levien & Uguray, 2024)
//! - Offset di tracciati complessi
//! - Operazioni booleane esatte stile Pathfinder (Berberich et al., 2002)
//! - Pipeline di rasterizzazione con antialiasing analitico
//!
//! ## Riferimenti Scientifici (§6.2)
//! - Miura et al. (2021), *κ-curves*, The Visual Computer.
//! - Levien & Uguray (2024), *High-Performance GPU Stroke Expansion*, PACMCGIT.
//! - Berberich et al. (2002), *Arrangements of Conic Arcs*, ESA.

pub mod bezier;
pub mod boolean;
pub mod kappa_curves;
pub mod offset;
pub mod rasterize;
pub mod stroke;

pub use bezier::CubicBezier;
pub use boolean::{BooleanOp, apply_boolean_op};
pub use kappa_curves::KappaCurve;
pub use stroke::StrokeExpander;
