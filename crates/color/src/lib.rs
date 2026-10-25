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

pub mod cct;
pub mod demosaic;
pub mod icc;
pub mod lut;
pub mod mat;
pub mod ocio;
pub mod perceptual;
pub mod spaces;
pub mod spline;
pub mod transfer;

pub use cct::{temp_tint_to_xy, wb_matrix, xy_to_temp_tint};
pub use icc::{parse as parse_icc, write_matrix_trc, write_named as write_named_icc, IccColorModel, IccInfo, IccKind, NamedSpace, Trc};
pub use lut::Lut3D;
pub use mat::{bradford, Mat3, Xy, D50, D65};
pub use perceptual::{
    hsl_to_rgb, hsv_to_rgb, lab_to_lch, lch_to_lab, oklab_from_2020, oklab_from_linear_srgb,
    oklab_matrices, oklab_to_2020, oklab_to_linear_srgb, rgb_to_hsl, rgb_to_hsv,
};
pub use spaces::{convert_color, ColorSpace, RgbSpace, ADOBE_RGB, DISPLAY_P3, PROPHOTO, REC2020, SRGB, WORKING};
pub use spline::{Lut1, MonotoneCurve};
pub use transfer::{
    decode_srgb8, encode_srgb8, gamma_to_linear, hlg_decode, hlg_encode, linear_to_gamma,
    linear_to_srgb, pq_decode, pq_encode, srgb_to_linear,
};

