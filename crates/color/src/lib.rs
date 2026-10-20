// Pizzico — crates/color/src/lib.rs
// Riferimento manifesto: §3.1, §4, §6.1
// Licenza: MIT OR Apache-2.0

//! # Pizzico Color Engine
//!
//! Pipeline di gestione del colore:
//! - Spazi colore standard: sRGB, Display P3, Adobe RGB, Linear RGB
//! - LUT tridimensionali (3D LUT) con interpolazione trilineare e tetraedrica (Zeng et al., 2020)
//! - Wrapper per OpenColorIO (OCIO)
//! - Algoritmo di demosaicing per Camera RAW con interpolazione dei residui (Kiku et al., 2016)
//!
//! ## Riferimenti Scientifici (§6.1)
//! - Zeng et al. (2020), *Learning Image-adaptive 3D Lookup Tables*, IEEE TPAMI.
//! - Kiku et al. (2016), *Residual Interpolation for Color Image Demosaicking*, IEEE TIP.

pub mod demosaic;
pub mod lut;
pub mod ocio;
pub mod spaces;

pub use lut::Lut3D;
pub use spaces::{ColorSpace, convert_color};
