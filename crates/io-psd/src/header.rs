// Pizzico — crates/io-psd/src/header.rs
// Riferimento manifesto: §6.5
// Licenza: MIT OR Apache-2.0

//! Struttura dell'intestazione (Header) PSD/PSB secondo la specifica ufficiale.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PsdColorMode {
    Bitmap = 0,
    Grayscale = 1,
    Indexed = 2,
    Rgb = 3,
    Cmyk = 4,
    Multichannel = 7,
    Duotone = 8,
    Lab = 9,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PsdHeader {
    pub version: u16, // 1 per PSD, 2 per PSB
    pub channels: u16,
    pub height: u32,
    pub width: u32,
    pub depth: u16, // 1, 8, 16 o 32 bit per canale
    pub color_mode: PsdColorMode,
}
