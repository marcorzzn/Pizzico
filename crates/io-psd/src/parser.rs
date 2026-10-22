// Pizzico — crates/io-psd/src/parser.rs
// Riferimento manifesto: §3.1, §4, §6.1, §6.5
// Licenza: MIT OR Apache-2.0

//! Parser PSD clean room completo conforme alla specifica ufficiale Adobe Photoshop.
//! Converte le sezioni Header, Color Mode, Image Resources, Layer Records e Channel Image Data
//! in una struttura `pizzico_core::Document`.

use crate::color_mode::PsdColorModeData;
use crate::error::PsdError;
use crate::header::PsdHeader;
use crate::image_data::parse_layer_channel_data;
use crate::image_resources::PsdImageResources;
use crate::layer_records::PsdLayerRecord;
use byteorder::{BigEndian, ReadBytesExt};
use pizzico_core::{Document, Layer};
use std::io::{Cursor, Read};

/// Risultato dettagliato del parsing PSD con metadati grezzi e documento Pizzico.
pub struct PsdParseResult {
    pub header: PsdHeader,
    pub color_mode_data: PsdColorModeData,
    pub image_resources: PsdImageResources,
    pub layer_records: Vec<PsdLayerRecord>,
    pub document: Document,
}

/// Esegue il parsing completo di un buffer binario PSD e restituisce un `Document` di Pizzico.
pub fn parse_psd(bytes: &[u8]) -> Result<Document, PsdError> {
    let res = parse_psd_detailed(bytes)?;
    Ok(res.document)
}

/// Esegue il parsing completo di un buffer binario PSD restituendo metadati dettagliati.
pub fn parse_psd_detailed(bytes: &[u8]) -> Result<PsdParseResult, PsdError> {
    let mut cursor = Cursor::new(bytes);

    // ── 1. File Header (26 bytes) ─────────────────────────────────────────────
    let header = PsdHeader::parse(&mut cursor)?;

    // ── 2. Color Mode Data Section ────────────────────────────────────────────
    let color_mode_data = PsdColorModeData::parse(&mut cursor)?;

    // ── 3. Image Resources Section ────────────────────────────────────────────
    let image_resources = PsdImageResources::parse(&mut cursor)?;

    // ── 4. Layer and Mask Information Section ─────────────────────────────────
    let mut layer_records = Vec::new();
    let mut layer_pixel_buffers = Vec::new();

    let layer_and_mask_length = cursor.read_u32::<BigEndian>()? as usize;
    if layer_and_mask_length > 0 {
        let start_pos = cursor.position();

        let layer_info_length = cursor.read_u32::<BigEndian>()? as usize;
        if layer_info_length > 0 {
            let layer_count_raw = cursor.read_i16::<BigEndian>()?;
            let layer_count = layer_count_raw.abs() as usize;

            // Legge tutti i Layer Records
            for _ in 0..layer_count {
                let record = PsdLayerRecord::parse(&mut cursor)?;
                layer_records.push(record);
            }

            // Legge i Channel Image Data per ciascun layer
            for record in &layer_records {
                let pixels = parse_layer_channel_data(&mut cursor, record)?;
                layer_pixel_buffers.push(pixels);
            }
        }

        // Salta eventuali dati rimanenti nella sezione Layer and Mask
        let bytes_read = (cursor.position() - start_pos) as usize;
        if bytes_read < layer_and_mask_length {
            let skip_len = layer_and_mask_length - bytes_read;
            let mut skip_buf = vec![0u8; skip_len];
            let _ = cursor.read_exact(&mut skip_buf);
        }
    }

    // ── 5. Costruzione del Documento Pizzico ──────────────────────────────────
    let mut doc = Document::new_empty(header.width, header.height);
    doc.metadata.title = "Imported PSD".to_string();

    if !layer_records.is_empty() {
        for (i, record) in layer_records.iter().enumerate() {
            let id = doc.allocate_layer_id();
            let pixels = layer_pixel_buffers
                .get(i)
                .map(|p| p.rgba.clone())
                .unwrap_or_default();

            let mut layer = Layer::new_raster_with_pixels(
                id,
                &record.name,
                record.width(),
                record.height(),
                pixels,
            );

            layer.transform.x = record.left;
            layer.transform.y = record.top;
            layer.opacity = (record.opacity as f32) / 255.0;
            layer.visible = record.visible;
            layer.blend_mode = record.blend_mode;

            doc.add_layer(layer);
        }
    } else {
        // Se il PSD non contiene una struttura a livelli, prova a leggere l'immagine composita
        // della Sezione 5 (Image Data)
        let compression = cursor.read_u16::<BigEndian>().unwrap_or(0);
        if compression == 0 {
            // Raw image data
            let total_pixels = (header.width * header.height) as usize;
            let mut raw_data = vec![0u8; total_pixels * header.channels as usize];
            if cursor.read_exact(&mut raw_data).is_ok() {
                let mut rgba = Vec::with_capacity(total_pixels * 4);
                let w_h = total_pixels;
                for idx in 0..total_pixels {
                    let r = raw_data.get(idx).copied().unwrap_or(255);
                    let g = if header.channels >= 2 {
                        raw_data.get(w_h + idx).copied().unwrap_or(r)
                    } else {
                        r
                    };
                    let b = if header.channels >= 3 {
                        raw_data.get(2 * w_h + idx).copied().unwrap_or(r)
                    } else {
                        r
                    };
                    let a = if header.channels >= 4 {
                        raw_data.get(3 * w_h + idx).copied().unwrap_or(255)
                    } else {
                        255
                    };
                    rgba.push(r);
                    rgba.push(g);
                    rgba.push(b);
                    rgba.push(a);
                }
                let bg_id = doc.allocate_layer_id();
                let bg_layer = Layer::new_raster_with_pixels(
                    bg_id,
                    "Sfondo Composito",
                    header.width,
                    header.height,
                    rgba,
                );
                doc.add_layer(bg_layer);
            }
        }
    }

    Ok(PsdParseResult {
        header,
        color_mode_data,
        image_resources,
        layer_records,
        document: doc,
    })
}
