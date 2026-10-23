// Pizzico — crates/io-native/src/export.rs
// Riferimento manifesto: §3.1, §4, §9, §10 Fase 1
// Licenza: MIT OR Apache-2.0

use std::io::Cursor;
use image::codecs::jpeg::JpegEncoder;
use image::codecs::png::PngEncoder;
use image::codecs::webp::WebPEncoder;
use image::{ExtendedColorType, ImageEncoder};
use pizzico_core::{composite_layers, Document};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ExportError {
    #[error("Dimensioni non valide: width={0}, height={1}")]
    InvalidDimensions(u32, u32),

    #[error("Buffer non corrispondente alle dimensioni: attesi {expected} byte, trovati {found}")]
    BufferMismatch { expected: usize, found: usize },

    #[error("Errore di codifica immagine: {0}")]
    EncodingError(#[from] image::ImageError),

    #[error("Errore I/O: {0}")]
    Io(#[from] std::io::Error),
}

/// Esporta il documento renderizzato in formato PNG (lossless con canale alpha).
pub fn export_png(doc: &Document) -> Result<Vec<u8>, ExportError> {
    if doc.width == 0 || doc.height == 0 {
        return Err(ExportError::InvalidDimensions(doc.width, doc.height));
    }
    let composite = composite_layers(doc);
    export_png_from_rgba(&composite, doc.width, doc.height)
}

/// Codifica un buffer RGBA grezzo in un'immagine PNG.
pub fn export_png_from_rgba(rgba: &[u8], width: u32, height: u32) -> Result<Vec<u8>, ExportError> {
    let expected = (width as usize) * (height as usize) * 4;
    if rgba.len() != expected {
        return Err(ExportError::BufferMismatch {
            expected,
            found: rgba.len(),
        });
    }

    let mut cursor = Cursor::new(Vec::new());
    let encoder = PngEncoder::new(&mut cursor);
    encoder.write_image(rgba, width, height, ExtendedColorType::Rgba8)?;
    Ok(cursor.into_inner())
}

/// Esporta il documento renderizzato in formato JPEG.
/// Poiché JPEG non supporta il canale alpha, le trasparenze vengono composte su sfondo bianco (#FFFFFF).
/// Il parametro `quality` accetta valori da 1 a 100.
pub fn export_jpeg(doc: &Document, quality: u8) -> Result<Vec<u8>, ExportError> {
    if doc.width == 0 || doc.height == 0 {
        return Err(ExportError::InvalidDimensions(doc.width, doc.height));
    }
    let composite = composite_layers(doc);
    export_jpeg_from_rgba(&composite, doc.width, doc.height, quality)
}

/// Codifica un buffer RGBA grezzo in un'immagine JPEG applicando blend su bianco per i canali trasparenti.
pub fn export_jpeg_from_rgba(
    rgba: &[u8],
    width: u32,
    height: u32,
    quality: u8,
) -> Result<Vec<u8>, ExportError> {
    let expected = (width as usize) * (height as usize) * 4;
    if rgba.len() != expected {
        return Err(ExportError::BufferMismatch {
            expected,
            found: rgba.len(),
        });
    }

    let quality = quality.clamp(1, 100);
    let pixel_count = (width as usize) * (height as usize);
    let mut rgb_buf = Vec::with_capacity(pixel_count * 3);

    // Compositing della trasparenza su sfondo bianco (#FFFFFF) per compatibilità JPEG standard
    for chunk in rgba.chunks_exact(4) {
        let r = chunk[0] as u32;
        let g = chunk[1] as u32;
        let b = chunk[2] as u32;
        let a = chunk[3] as u32;
        let inv_a = 255 - a;

        let out_r = ((r * a + 255 * inv_a + 127) / 255) as u8;
        let out_g = ((g * a + 255 * inv_a + 127) / 255) as u8;
        let out_b = ((b * a + 255 * inv_a + 127) / 255) as u8;

        rgb_buf.push(out_r);
        rgb_buf.push(out_g);
        rgb_buf.push(out_b);
    }

    let mut cursor = Cursor::new(Vec::new());
    let encoder = JpegEncoder::new_with_quality(&mut cursor, quality);
    encoder.write_image(&rgb_buf, width, height, ExtendedColorType::Rgb8)?;
    Ok(cursor.into_inner())
}

/// Esporta il documento in formato WebP (pure-Rust lossless con canale alpha).
pub fn export_webp(doc: &Document, _quality: u8) -> Result<Vec<u8>, ExportError> {
    if doc.width == 0 || doc.height == 0 {
        return Err(ExportError::InvalidDimensions(doc.width, doc.height));
    }
    let composite = composite_layers(doc);
    export_webp_from_rgba(&composite, doc.width, doc.height)
}

/// Codifica un buffer RGBA grezzo in un'immagine WebP lossless.
pub fn export_webp_from_rgba(rgba: &[u8], width: u32, height: u32) -> Result<Vec<u8>, ExportError> {
    let expected = (width as usize) * (height as usize) * 4;
    if rgba.len() != expected {
        return Err(ExportError::BufferMismatch {
            expected,
            found: rgba.len(),
        });
    }

    let mut cursor = Cursor::new(Vec::new());
    let encoder = WebPEncoder::new_lossless(&mut cursor);
    encoder.write_image(rgba, width, height, ExtendedColorType::Rgba8)?;
    Ok(cursor.into_inner())
}

#[cfg(test)]
mod tests {
    use super::*;
    use pizzico_core::Layer;

    fn make_test_document() -> Document {
        let mut doc = Document::new(10, 10, "Test Export Doc");
        let id = doc.allocate_layer_id();
        let layer1 = Layer::new_raster_color(id, "Sfondo Rosso", 10, 10, [255, 0, 0, 255]);
        doc.add_layer(layer1);
        doc
    }

    #[test]
    fn test_export_png_valid_magic() {
        let doc = make_test_document();
        let bytes = export_png(&doc).expect("PNG export failed");
        assert!(!bytes.is_empty());
        // PNG magic number: 0x89 'P' 'N' 'G' 0x0D 0x0A 0x1A 0x0A
        assert_eq!(&bytes[0..8], b"\x89PNG\r\n\x1a\n");
    }

    #[test]
    fn test_export_jpeg_valid_soi_marker() {
        let doc = make_test_document();
        let bytes = export_jpeg(&doc, 85).expect("JPEG export failed");
        assert!(!bytes.is_empty());
        // JPEG SOI marker: 0xFF 0xD8
        assert_eq!(&bytes[0..2], &[0xFF, 0xD8]);
        // JPEG EOI marker: 0xFF 0xD9
        assert_eq!(&bytes[bytes.len() - 2..], &[0xFF, 0xD9]);
    }

    #[test]
    fn test_export_webp_valid_riff_header() {
        let doc = make_test_document();
        let bytes = export_webp(&doc, 90).expect("WebP export failed");
        assert!(!bytes.is_empty());
        // WebP RIFF header: "RIFF" .... "WEBP"
        assert_eq!(&bytes[0..4], b"RIFF");
        assert_eq!(&bytes[8..12], b"WEBP");
    }
}
