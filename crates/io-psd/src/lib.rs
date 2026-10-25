// Pizzico — crates/io-psd/src/lib.rs
// Riferimento manifesto: §3.1, §4, §6.5, §7
// Licenza: MIT OR Apache-2.0

//! # Pizzico PSD/PSB I/O
//!
//! Lettore e scrittore clean room di file Adobe Photoshop (PSD / PSB):
//! - Verifica signature `8BPS` e versione (1 = PSD, 2 = PSB)
//! - Lettura Color Mode Data, Image Resources e Layer and Mask Information
//! - Decompressione RLE PackBits dei canali colore e maschere alpha
//! - Mappatura dei layer su `pizzico_core::Layer` e `pizzico_core::Document`
//!
//! ## Riferimenti ufficiali (§6.5)
//! - Adobe Photoshop File Format Official Specification (Adobe Developer Connection).

pub mod builder;
pub mod color_mode;
pub mod error;
pub mod header;
pub mod image_data;
pub mod image_resources;
pub mod layer_records;
pub mod parser;
pub mod rle;
pub mod writer;

pub use builder::{generate_synthetic_psd, SyntheticLayer};
pub use color_mode::PsdColorModeData;
pub use error::PsdError;
pub use header::{PsdColorMode, PsdHeader};
pub use image_resources::{ImageResourceBlock, PsdImageResources};
pub use layer_records::{PsdChannelInfo, PsdLayerRecord};
pub use parser::{parse_psd, parse_psd_detailed, PsdParseResult};
pub use rle::{compress_packbits, decompress_packbits};
pub use writer::{export_psd, PsdBuilder, WriterLayerSpec};

use pizzico_core::Document;

/// Importa un file PSD da buffer binario restituendo un `Document` di Pizzico popolato.
///
/// Questa è l'API canonica richiesta dal Manifesto (§6.5).
pub fn import_psd(bytes: &[u8]) -> Result<Document, PsdError> {
    parse_psd(bytes)
}

