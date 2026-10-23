// Pizzico — crates/io-native/src/lib.rs
// Riferimento manifesto: §3.1, §4, §10 Fase 1
// Licenza: MIT OR Apache-2.0

//! # Pizzico Native I/O (.pizzico container format)
//!
//! Formato nativo a container compresso ZIP basato su specifiche Manifesto §3.1 e §10:
//! ```text
//! document.pizzico (ZIP container)
//! ├── manifest.json         # Metadati documento, gerarchia e proprietà livelli
//! ├── layers/
//! │   ├── layer_1.bin       # Buffer pixel RGBA 8-bit (compressi con Deflate)
//! │   ├── layer_2.bin
//! │   └── ...
//! └── selection.json        # Stato geometrico selezione attiva (opzionale)
//! ```

use pizzico_core::{BlendMode, Document, Layer, LayerKind, RectSelection, Transform2D};
use serde::{Deserialize, Serialize};
use std::io::{Cursor, Read, Write};
use thiserror::Error;
use zip::write::SimpleFileOptions;

pub mod export;
pub use export::*;

/// Errori restituiti dalle operazioni di I/O del formato nativo `.pizzico`.
#[derive(Error, Debug)]
pub enum NativeIoError {
    #[error("ZIP error: {0}")]
    Zip(#[from] zip::result::ZipError),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Invalid .pizzico container: {0}")]
    Format(String),
}

/// Metadati globali del container `.pizzico` memorizzati in `manifest.json`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PizzicoManifest {
    pub format_version: u32,
    pub generator: String,
    pub title: String,
    pub width: u32,
    pub height: u32,
    pub active_layer_id: Option<u64>,
    pub layers: Vec<LayerManifestEntry>,
}

/// Metadati di un singolo livello all'interno di `manifest.json`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LayerManifestEntry {
    pub id: u64,
    pub name: String,
    pub kind: String, // "raster", "vector", "group"
    pub visible: bool,
    pub locked: bool,
    pub opacity: f32,
    pub blend_mode: BlendMode,
    pub transform: Transform2D,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raster_width: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raster_height: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data_file: Option<String>,
}

/// Serializza un `Document` di Pizzico nel container compresso binario `.pizzico` (ZIP).
pub fn serialize_document(doc: &Document) -> Result<Vec<u8>, NativeIoError> {
    let mut buffer = Vec::new();
    {
        let mut zip = zip::ZipWriter::new(Cursor::new(&mut buffer));
        let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

        let mut manifest_layers = Vec::with_capacity(doc.layers.len());

        // 1. Scrittura blob binari dei pixel in `layers/layer_{id}.bin`
        for layer in &doc.layers {
            match &layer.kind {
                LayerKind::Raster {
                    width,
                    height,
                    pixels,
                } => {
                    let file_name = format!("layers/layer_{}.bin", layer.id);
                    zip.start_file(&file_name, options)?;
                    zip.write_all(pixels)?;

                    manifest_layers.push(LayerManifestEntry {
                        id: layer.id,
                        name: layer.name.clone(),
                        kind: "raster".to_string(),
                        visible: layer.visible,
                        locked: layer.locked,
                        opacity: layer.opacity,
                        blend_mode: layer.blend_mode,
                        transform: layer.transform.clone(),
                        raster_width: Some(*width),
                        raster_height: Some(*height),
                        data_file: Some(file_name),
                    });
                }
                LayerKind::Vector { .. } => {
                    manifest_layers.push(LayerManifestEntry {
                        id: layer.id,
                        name: layer.name.clone(),
                        kind: "vector".to_string(),
                        visible: layer.visible,
                        locked: layer.locked,
                        opacity: layer.opacity,
                        blend_mode: layer.blend_mode,
                        transform: layer.transform.clone(),
                        raster_width: None,
                        raster_height: None,
                        data_file: None,
                    });
                }
                LayerKind::Group { .. } => {
                    manifest_layers.push(LayerManifestEntry {
                        id: layer.id,
                        name: layer.name.clone(),
                        kind: "group".to_string(),
                        visible: layer.visible,
                        locked: layer.locked,
                        opacity: layer.opacity,
                        blend_mode: layer.blend_mode,
                        transform: layer.transform.clone(),
                        raster_width: None,
                        raster_height: None,
                        data_file: None,
                    });
                }
            }
        }

        // 2. Scrittura manifest.json
        let manifest = PizzicoManifest {
            format_version: 1,
            generator: "Pizzico 0.1.0".to_string(),
            title: doc.metadata.title.clone(),
            width: doc.width,
            height: doc.height,
            active_layer_id: doc.active_layer_id,
            layers: manifest_layers,
        };
        let manifest_bytes = serde_json::to_vec_pretty(&manifest)?;
        zip.start_file("manifest.json", options)?;
        zip.write_all(&manifest_bytes)?;

        // 3. Scrittura selection.json (se presente selezione attiva o configurata)
        if doc.selection.active || doc.selection.width > 0 || doc.selection.height > 0 {
            let sel_bytes = serde_json::to_vec_pretty(&doc.selection)?;
            zip.start_file("selection.json", options)?;
            zip.write_all(&sel_bytes)?;
        }

        zip.finish()?;
    }

    Ok(buffer)
}

/// Deserializza un container compresso binario `.pizzico` (ZIP) e ricostruisce fedelmente il `Document`.
pub fn deserialize_document(bytes: &[u8]) -> Result<Document, NativeIoError> {
    let mut archive = zip::ZipArchive::new(Cursor::new(bytes))?;

    // 1. Lettura manifest.json
    let manifest: PizzicoManifest = {
        let mut manifest_file = archive
            .by_name("manifest.json")
            .map_err(|_| NativeIoError::Format("File 'manifest.json' non trovato nel pacchetto .pizzico".into()))?;
        let mut manifest_str = String::new();
        manifest_file.read_to_string(&mut manifest_str)?;
        serde_json::from_str(&manifest_str)?
    };

    let mut doc = Document::new_empty(manifest.width, manifest.height);
    doc.metadata.title = manifest.title;

    // 2. Ricostruzione dei layer
    for entry in manifest.layers {
        match entry.kind.as_str() {
            "raster" => {
                let w = entry.raster_width.unwrap_or(manifest.width);
                let h = entry.raster_height.unwrap_or(manifest.height);
                let expected_len = (w * h * 4) as usize;

                let pixels = if let Some(ref data_file) = entry.data_file {
                    let mut file = archive.by_name(data_file).map_err(|_| {
                        NativeIoError::Format(format!("File binario '{}' non trovato nel pacchetto", data_file))
                    })?;
                    let mut px_buf = Vec::with_capacity(expected_len);
                    file.read_to_end(&mut px_buf)?;
                    if px_buf.len() != expected_len {
                        return Err(NativeIoError::Format(format!(
                            "Dimensione buffer errata per layer '{}': attesi {} byte, trovati {}",
                            entry.name,
                            expected_len,
                            px_buf.len()
                        )));
                    }
                    px_buf
                } else {
                    vec![0u8; expected_len]
                };

                let mut layer = Layer::new_raster_with_pixels(entry.id, entry.name, w, h, pixels);
                layer.visible = entry.visible;
                layer.locked = entry.locked;
                layer.opacity = entry.opacity;
                layer.blend_mode = entry.blend_mode;
                layer.transform = entry.transform;
                doc.add_layer(layer);
            }
            "vector" => {
                let layer = Layer {
                    id: entry.id,
                    name: entry.name,
                    kind: LayerKind::Vector { paths: Vec::new() },
                    visible: entry.visible,
                    locked: entry.locked,
                    opacity: entry.opacity,
                    blend_mode: entry.blend_mode,
                    transform: entry.transform,
                };
                doc.add_layer(layer);
            }
            _ => {
                // Gruppi o tipi futuri
                let layer = Layer {
                    id: entry.id,
                    name: entry.name,
                    kind: LayerKind::Group { children: Vec::new() },
                    visible: entry.visible,
                    locked: entry.locked,
                    opacity: entry.opacity,
                    blend_mode: entry.blend_mode,
                    transform: entry.transform,
                };
                doc.add_layer(layer);
            }
        }
    }

    doc.active_layer_id = manifest.active_layer_id;

    // 3. Ripristino selection.json (se presente nel pacchetto)
    if let Ok(mut sel_file) = archive.by_name("selection.json") {
        let mut sel_str = String::new();
        if sel_file.read_to_string(&mut sel_str).is_ok() {
            if let Ok(sel) = serde_json::from_str::<RectSelection>(&sel_str) {
                doc.selection = sel;
            }
        }
    }

    Ok(doc)
}

// Alias per compatibilità con l'API precedentemente abbozzata
pub use deserialize_document as load_pizzico;
pub use serialize_document as save_pizzico;

#[cfg(test)]
mod tests {
    use super::*;
    use pizzico_core::BlendMode;

    #[test]
    fn test_roundtrip_empty_document() {
        let doc = Document::new_empty(640, 480);
        let bytes = serialize_document(&doc).expect("Serializzazione fallita");
        assert!(!bytes.is_empty());

        let restored = deserialize_document(&bytes).expect("Deserializzazione fallita");
        assert_eq!(restored.width, 640);
        assert_eq!(restored.height, 480);
        assert_eq!(restored.layer_count(), 0);
        assert!(!restored.has_active_selection());
    }

    #[test]
    fn test_roundtrip_multi_layer_and_selection() {
        let mut doc = Document::new(800, 600, "Progetto Test Roundtrip");

        // Aggiungi un livello rosso con offset e blend mode multiply
        let id2 = doc.allocate_layer_id();
        let mut red_layer = Layer::new_raster_color(id2, "Livello Rosso", 200, 150, [255, 0, 0, 255]);
        red_layer.transform.x = 42;
        red_layer.transform.y = 84;
        red_layer.opacity = 0.75;
        red_layer.blend_mode = BlendMode::Multiply;
        doc.add_layer(red_layer);

        // Imposta una selezione attiva
        doc.set_selection(100, 120, 300, 200);
        doc.active_layer_id = Some(id2);

        let bytes = serialize_document(&doc).expect("Serializzazione fallita");
        let restored = deserialize_document(&bytes).expect("Deserializzazione fallita");

        assert_eq!(restored.width, 800);
        assert_eq!(restored.height, 600);
        assert_eq!(restored.metadata.title, "Progetto Test Roundtrip");
        assert_eq!(restored.layer_count(), 2);
        assert_eq!(restored.active_layer_id, Some(id2));

        // Verifica selezione
        assert!(restored.has_active_selection());
        assert_eq!(restored.selection.x, 100);
        assert_eq!(restored.selection.y, 120);
        assert_eq!(restored.selection.width, 300);
        assert_eq!(restored.selection.height, 200);

        // Verifica Layer 1 (Sfondo)
        let sf = restored.layers.iter().find(|l| l.name == "Sfondo").unwrap();
        assert_eq!(sf.opacity, 1.0);
        assert_eq!(sf.blend_mode, BlendMode::Normal);
        if let LayerKind::Raster { width, height, pixels } = &sf.kind {
            assert_eq!(*width, 800);
            assert_eq!(*height, 600);
            assert_eq!(&pixels[0..4], &[255, 255, 255, 255]);
        } else {
            panic!("Tipo layer atteso: Raster");
        }

        // Verifica Layer 2 (Livello Rosso)
        let red = restored.layers.iter().find(|l| l.name == "Livello Rosso").unwrap();
        assert_eq!(red.id, id2);
        assert_eq!(red.transform.x, 42);
        assert_eq!(red.transform.y, 84);
        assert_eq!(red.opacity, 0.75);
        assert_eq!(red.blend_mode, BlendMode::Multiply);
        if let LayerKind::Raster { width, height, pixels } = &red.kind {
            assert_eq!(*width, 200);
            assert_eq!(*height, 150);
            assert_eq!(&pixels[0..4], &[255, 0, 0, 255]);
        } else {
            panic!("Tipo layer atteso: Raster");
        }
    }
}
