// Pizzico — crates/io-psd/src/lib.rs
// Riferimento manifesto: §3.1, §4, §6.5
// Licenza: MIT OR Apache-2.0

//! # Pizzico PSD/PSB I/O
//!
//! Lettore e scrittore di file Adobe Photoshop (PSD / PSB):
//! - Verifica signature `8BPS` e versione (1 = PSD, 2 = PSB)
//! - Lettura Color Mode Data, Image Resources e Layer and Mask Information
//! - Mappatura dei layer su `pizzico_core::Layer`
//! - Ricostruzione dell'immagine composita "Maximize Compatibility"
//!
//! ## Riferimenti (§6.5)
//! - Adobe Photoshop File Format Official Specification.

pub mod header;
pub mod layer_records;
pub mod parser;

pub use header::{PsdColorMode, PsdHeader};
pub use parser::parse_psd;
