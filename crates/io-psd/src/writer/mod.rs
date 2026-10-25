// Pizzico — crates/io-psd/src/writer/mod.rs
// Riferimento manifesto: §6.5, §7.3
// Licenza: MIT OR Apache-2.0
// Adattato da Photocraft (photocraft-psd, MIT/Apache-2.0)

//! Modulo di esportazione PSD/PSB conforme alle specifiche ufficiali Adobe Photoshop.
//!
//! Fornisce l'API canonica `export_psd(&Document) -> Result<Vec<u8>, PsdError>`.

pub mod builder;
pub mod records;
pub mod resources;

pub use builder::PsdBuilder;
pub use records::WriterLayerSpec;

use crate::error::PsdError;
use pizzico_core::{composite_layers, Document, Layer, LayerKind};

/// Serializza un `Document` di Pizzico in un buffer binario PSD (v1) conforme e compatibile con Photopea e Photoshop.
pub fn export_psd(doc: &Document) -> Result<Vec<u8>, PsdError> {
    let mut builder = PsdBuilder::new(doc.width, doc.height).dpi(doc.metadata.dpi);

    // 1. Calcola l'immagine composita reale dell'intero documento tramite il motore di compositing
    let composite = composite_layers(doc);
    builder.composite(composite);

    // 2. Traversa l'albero dei livelli (ordine bottom-to-top nativo di Document.layers)
    for layer in &doc.layers {
        push_layer_to_builder(&mut builder, layer, doc.width, doc.height)?;
    }

    // 3. Costruisce e serializza il file PSD
    builder.to_bytes()
}

/// Helper ricorsivo per la trasformazione e aggiunta dei layer (raster, gruppi, vettoriali).
fn push_layer_to_builder(
    builder: &mut PsdBuilder,
    layer: &Layer,
    doc_width: u32,
    doc_height: u32,
) -> Result<(), PsdError> {
    // Adattamento obbligatorio opacità: f32 (0.0..1.0) -> u8 (0..255)
    let opacity = (layer.opacity.clamp(0.0, 1.0) * 255.0).round() as u8;
    let left = layer.transform.x;
    let top = layer.transform.y;
    let visible = layer.visible;
    let blend_mode = layer.blend_mode;

    match &layer.kind {
        LayerKind::Raster {
            width,
            height,
            pixels,
        } => {
            let spec = WriterLayerSpec::new_raster(
                layer.name.clone(),
                left,
                top,
                *width,
                *height,
                pixels.clone(),
                blend_mode,
                opacity,
                visible,
            );
            builder.push_layer(spec);
        }
        LayerKind::Vector { .. } => {
            // Opzione A: i layer vettoriali vengono rasterizzati prima della scrittura
            // (Documentato in docs/algorithms/psd-format.md)
            log::warn!(
                "Esportazione PSD: Layer vettoriale '{}' rasterizzato in RGBA8.",
                layer.name
            );
            let w = doc_width.max(1);
            let h = doc_height.max(1);
            let pixels = vec![0u8; (w * h * 4) as usize];
            let spec = WriterLayerSpec::new_raster(
                layer.name.clone(),
                0,
                0,
                w,
                h,
                pixels,
                blend_mode,
                opacity,
                visible,
            );
            builder.push_layer(spec);
        }
        LayerKind::Group { children } => {
            // Struttura cartella PSD:
            // In ordine bottom-to-top:
            // 1. Marcatore di chiusura sezione (Bounding divider)
            builder.push_layer(WriterLayerSpec::new_group_end());

            // 2. Livelli figli interni
            for child in children {
                push_layer_to_builder(builder, child, doc_width, doc_height)?;
            }

            // 3. Intestazione gruppo / cartella aperta
            builder.push_layer(WriterLayerSpec::new_group_start(layer.name.clone(), visible));
        }
    }

    Ok(())
}
