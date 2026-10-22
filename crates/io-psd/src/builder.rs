// Pizzico — crates/io-psd/src/builder.rs
// Riferimento manifesto: §6.5
// Licenza: MIT OR Apache-2.0

//! Generatore di file Adobe Photoshop (PSD) sintetici conformi alla specifica.
//! Usato per test di regressione, suite del corpus e verifica roundtrip.

use crate::error::PsdError;
use crate::header::{PsdColorMode, PsdHeader};
use crate::image_data::write_layer_channel_data;
use crate::layer_records::{PsdChannelInfo, PsdLayerRecord};
use byteorder::{BigEndian, WriteBytesExt};
use pizzico_core::BlendMode;
use std::io::Write;

pub struct SyntheticLayer {
    pub name: String,
    pub top: i32,
    pub left: i32,
    pub width: u32,
    pub height: u32,
    pub opacity: u8,
    pub visible: bool,
    pub blend_mode: BlendMode,
    pub rgba: Vec<u8>,
}

/// Genera un file binario PSD valido contenente l'intestazione e i livelli specificati.
pub fn generate_synthetic_psd(
    width: u32,
    height: u32,
    layers: &[SyntheticLayer],
) -> Result<Vec<u8>, PsdError> {
    let mut out = Vec::new();

    // ── 1. File Header (26 bytes) ─────────────────────────────────────────────
    let header = PsdHeader {
        version: 1,
        channels: 4, // RGBA
        height,
        width,
        depth: 8,
        color_mode: PsdColorMode::Rgb,
    };
    header.write(&mut out)?;

    // ── 2. Color Mode Data (Empty for RGB) ────────────────────────────────────
    out.write_u32::<BigEndian>(0)?;

    // ── 3. Image Resources Section (Empty) ────────────────────────────────────
    out.write_u32::<BigEndian>(0)?;

    // ── 4. Layer and Mask Information Section ─────────────────────────────────
    let mut layer_info_bytes = Vec::new();

    // Conteggio layer (signed i16)
    layer_info_bytes.write_i16::<BigEndian>(layers.len() as i16)?;

    // Per ciascun layer, calcoliamo prima i canali compressi
    let mut channels_data_per_layer = Vec::new();
    let mut records = Vec::new();

    for l in layers {
        let mut ch_buf = Vec::new();
        let ch_sizes = write_layer_channel_data(&mut ch_buf, l.width, l.height, &l.rgba)?;
        channels_data_per_layer.push(ch_buf);

        let blend_mode_key = match l.blend_mode {
            BlendMode::Normal => *b"norm",
            BlendMode::Multiply => *b"mul ",
            BlendMode::Screen => *b"scrn",
            BlendMode::Overlay => *b"over",
            BlendMode::Darken => *b"dark",
            BlendMode::Lighten => *b"lite",
            BlendMode::ColorDodge => *b"div ",
            BlendMode::ColorBurn => *b"idiv",
            BlendMode::HardLight => *b"hLit",
            BlendMode::SoftLight => *b"sLit",
            BlendMode::Difference => *b"diff",
            BlendMode::Exclusion => *b"smud",
        };

        let channels = ch_sizes
            .into_iter()
            .map(|(channel_id, data_length)| PsdChannelInfo {
                channel_id,
                data_length,
            })
            .collect();

        records.push(PsdLayerRecord {
            top: l.top,
            left: l.left,
            bottom: l.top + l.height as i32,
            right: l.left + l.width as i32,
            channels,
            blend_mode_key,
            blend_mode: l.blend_mode,
            opacity: l.opacity,
            clipping: 0,
            flags: 0,
            visible: l.visible,
            name: l.name.clone(),
        });
    }

    // Scrivi tutti i Layer Records
    for rec in &records {
        rec.write(&mut layer_info_bytes)?;
    }

    // Scrivi i Channel Image Data per ciascun layer
    for ch_buf in channels_data_per_layer {
        layer_info_bytes.write_all(&ch_buf)?;
    }

    // Sezione 4: Lunghezza totale (4 bytes) + Layer Info Lunghezza (4 bytes) + Dati
    let layer_info_len = layer_info_bytes.len() as u32;
    let section_len = 4 + layer_info_len;

    out.write_u32::<BigEndian>(section_len)?;
    out.write_u32::<BigEndian>(layer_info_len)?;
    out.write_all(&layer_info_bytes)?;

    // ── 5. Image Data Section (Composite Image, compression = 0 Raw) ─────────
    out.write_u16::<BigEndian>(0)?; // Raw compression
    let total_pixels = (width * height) as usize;
    // 4 canali: R, G, B, A (tutti bianchi opachi per composite fallback)
    out.write_all(&vec![255u8; total_pixels * 4])?;

    Ok(out)
}
