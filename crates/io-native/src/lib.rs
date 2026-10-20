// Pizzico — crates/io-native/src/lib.rs
// Riferimento manifesto: §3.1, §4
// Licenza: MIT OR Apache-2.0

//! # Pizzico Native I/O (.pizzico format)
//!
//! Serializzazione e deserializzazione del file nativo `.pizzico`:
//! Un container compresso (ZIP) contenente manifest JSON e blob binari dei pixel.

use pizzico_core::Document;
use serde::{Deserialize, Serialize};
use std::io::{Cursor, Read, Write};
use thiserror::Error;
use zip::write::SimpleFileOptions;

#[derive(Error, Debug)]
pub enum NativeIoError {
    #[error("ZIP error: {0}")]
    Zip(#[from] zip::result::ZipError),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

#[derive(Serialize, Deserialize)]
pub struct ContainerManifest {
    pub format_version: u32,
    pub generator: String,
}

pub fn save_pizzico(doc: &Document) -> Result<Vec<u8>, NativeIoError> {
    let mut buffer = Vec::new();
    {
        let mut zip = zip::ZipWriter::new(Cursor::new(&mut buffer));
        let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

        // 1. manifest.json
        let manifest = ContainerManifest {
            format_version: 1,
            generator: "Pizzico 0.1.0".to_string(),
        };
        let manifest_bytes = serde_json::to_vec_pretty(&manifest)?;
        zip.start_file("manifest.json", options)?;
        zip.write_all(&manifest_bytes)?;

        // 2. document.json
        let doc_json = serde_json::to_vec_pretty(doc)?;
        zip.start_file("document.json", options)?;
        zip.write_all(&doc_json)?;

        zip.finish()?;
    }

    Ok(buffer)
}

pub fn load_pizzico(bytes: &[u8]) -> Result<Document, NativeIoError> {
    let mut archive = zip::ZipArchive::new(Cursor::new(bytes))?;
    let mut doc_file = archive.by_name("document.json")?;
    let mut doc_str = String::new();
    doc_file.read_to_string(&mut doc_str)?;
    let doc: Document = serde_json::from_str(&doc_str)?;
    Ok(doc)
}
