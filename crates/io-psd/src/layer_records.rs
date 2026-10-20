// Pizzico — crates/io-psd/src/layer_records.rs
// Riferimento manifesto: §6.5
// Licenza: MIT OR Apache-2.0

//! Strutture per la decodifica dei Layer Records e canali PSD.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PsdLayerRecord {
    pub top: i32,
    pub left: i32,
    pub bottom: i32,
    pub right: i32,
    pub channel_count: u16,
    pub blend_mode_key: [u8; 4],
    pub opacity: u8,
    pub clipping: u8,
    pub flags: u8,
    pub name: String,
}
