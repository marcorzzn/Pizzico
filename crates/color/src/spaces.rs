// Pizzico — crates/color/src/spaces.rs
// Riferimento manifesto: §6.1
// Licenza: MIT OR Apache-2.0

//! Spazi colore e trasformazioni colorimetriche.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum ColorSpace {
    #[default]
    Srgb,
    DisplayP3,
    LinearRgb,
    AdobeRgb,
}

pub fn srgb_to_linear(c: f32) -> f32 {
    if c <= 0.04045 {
        c / 12.92
    } else {
        ((c + 0.055) / 1.055).powf(2.4)
    }
}

pub fn linear_to_srgb(c: f32) -> f32 {
    if c <= 0.0031308 {
        c * 12.92
    } else {
        1.055 * c.powf(1.0 / 2.4) - 0.055
    }
}

pub fn convert_color(color: [f32; 3], from: ColorSpace, to: ColorSpace) -> [f32; 3] {
    if from == to {
        return color;
    }
    match (from, to) {
        (ColorSpace::Srgb, ColorSpace::LinearRgb) => [
            srgb_to_linear(color[0]),
            srgb_to_linear(color[1]),
            srgb_to_linear(color[2]),
        ],
        (ColorSpace::LinearRgb, ColorSpace::Srgb) => [
            linear_to_srgb(color[0]),
            linear_to_srgb(color[1]),
            linear_to_srgb(color[2]),
        ],
        _ => color, // Altre conversioni delegate al profilo OCIO
    }
}
