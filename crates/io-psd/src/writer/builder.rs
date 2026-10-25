// Pizzico — crates/io-psd/src/writer/builder.rs
// Riferimento manifesto: §6.5, §7.3
// Licenza: MIT OR Apache-2.0
// Adattato da Photocraft (photocraft-psd, MIT/Apache-2.0)

//! `PsdBuilder`: Assemblatore ad alto livello del file binario Adobe PSD (v1).
//!
//! Genera file conformi alle specifiche ufficiali Adobe Photoshop, supportando:
//! - Header 8BPS con 4 canali (RGBA) a 8 bit.
//! - Sezione Image Resources con ResolutionInfo (DPI) e VersionInfo (has_real_merged_data).
//! - Sezione Layer Information con Layer Records, tagged blocks `luni`/`lyid`/`lsct`,
//!   blending ranges standard a 32 byte e canali RLE PackBits.
//! - Sezione Image Data (Composite) con compressione RLE PackBits e matting su sfondo bianco.

use crate::error::PsdError;
use crate::rle::compress_packbits;
use crate::writer::records::{compress_layer_channels, write_layer_record, WriterLayerSpec};
use crate::writer::resources::{
    build_version_info_resource, ImageResource, ResolutionInfo, RES_ID_RESOLUTION_INFO,
    RES_ID_VERSION_INFO,
};
use byteorder::{BigEndian, WriteBytesExt};
use std::io::Write;

/// Costruttore e serializzatore binario del file PSD.
pub struct PsdBuilder {
    pub width: u32,
    pub height: u32,
    pub dpi: f32,
    pub layers: Vec<WriterLayerSpec>,
    pub composite_rgba: Vec<u8>,
}

impl PsdBuilder {
    /// Inizializza un nuovo builder con le dimensioni del documento in pixel.
    pub fn new(width: u32, height: u32) -> Self {
        Self {
            width,
            height,
            dpi: 72.0,
            layers: Vec::new(),
            composite_rgba: Vec::new(),
        }
    }

    /// Imposta i DPI per la risorsa ResolutionInfo (1005).
    pub fn dpi(mut self, dpi: f32) -> Self {
        self.dpi = dpi;
        self
    }

    /// Aggiunge un layer alla lista (i layer vanno inseriti dal fondo verso la cima).
    pub fn push_layer(&mut self, spec: WriterLayerSpec) -> &mut Self {
        self.layers.push(spec);
        self
    }

    /// Fornisce l'immagine composita dell'intero canvas in formato RGBA 8-bit interleaved.
    pub fn composite(&mut self, rgba: Vec<u8>) -> &mut Self {
        self.composite_rgba = rgba;
        self
    }

    /// Serializza l'intero documento in un vettore di byte conforme allo standard PSD.
    pub fn to_bytes(&self) -> Result<Vec<u8>, PsdError> {
        let mut out = Vec::new();

        // ── 1. File Header (26 bytes) ─────────────────────────────────────────────
        out.write_all(b"8BPS")?; // Signature
        out.write_u16::<BigEndian>(1)?; // Version = 1 (PSD)
        out.write_all(&[0u8; 6])?; // 6 bytes reserved = 0
        out.write_u16::<BigEndian>(4)?; // Channels = 4 (R, G, B, A)
        out.write_u32::<BigEndian>(self.height)?; // Height
        out.write_u32::<BigEndian>(self.width)?; // Width
        out.write_u16::<BigEndian>(8)?; // Depth = 8 bit
        out.write_u16::<BigEndian>(3)?; // ColorMode = 3 (RGB)

        // ── 2. Color Mode Data (4 bytes) ──────────────────────────────────────────
        // Per RGB la modalità colore non ha tabella palette, lunghezza = 0
        out.write_u32::<BigEndian>(0)?;

        // ── 3. Image Resources Section ────────────────────────────────────────────
        let mut res_section_bytes = Vec::new();

        // 3a. Risorsa 1005: ResolutionInfo (DPI)
        let res_info = ResolutionInfo::from_dpi(self.dpi);
        let res_block_1005 = ImageResource::new(RES_ID_RESOLUTION_INFO, res_info.to_bytes());
        res_block_1005.write(&mut res_section_bytes)?;

        // 3b. Risorsa 1057: VersionInfo (Maximize Compatibility)
        let version_data = build_version_info_resource(true);
        let res_block_1057 = ImageResource::new(RES_ID_VERSION_INFO, version_data);
        res_block_1057.write(&mut res_section_bytes)?;

        // Scrive lunghezza totale sezione risorse + byte
        out.write_u32::<BigEndian>(res_section_bytes.len() as u32)?;
        out.write_all(&res_section_bytes)?;

        // ── 4. Layer and Mask Information Section ─────────────────────────────────
        let mut layer_info_bytes = Vec::new();

        // Pre-comprime i dati di tutti i layer
        let mut compressed_layers = Vec::with_capacity(self.layers.len());
        for layer in &self.layers {
            let comp = compress_layer_channels(layer.width, layer.height, &layer.rgba)?;
            compressed_layers.push(comp);
        }

        // Il conteggio dei layer viene scritto con segno negativo:
        // -N indica ad Adobe Photoshop e Photopea che il primo canale alpha del composito
        // rappresenta la trasparenza reale del documento unito.
        let layer_count = -(self.layers.len() as i16);
        layer_info_bytes.write_i16::<BigEndian>(layer_count)?;

        // Scrive tutti i Layer Records
        for (idx, layer) in self.layers.iter().enumerate() {
            let layer_id = (idx as u32) + 1;
            let ch_sizes = &compressed_layers[idx].channel_sizes;
            write_layer_record(&mut layer_info_bytes, layer, layer_id, ch_sizes)?;
        }

        // Scrive tutti i Channel Image Data per ciascun layer
        for comp in &compressed_layers {
            layer_info_bytes.write_all(&comp.channel_payload)?;
        }

        // Sezione 4 Header:
        // Section Length (4 bytes) = 4 (per layer_info_len) + layer_info_len
        let mut layer_info_len = layer_info_bytes.len() as u32;
        let mut section_len = 4 + layer_info_len;

        // Allineamento a 2 byte se necessario
        let pad_layer_info = if layer_info_len % 2 != 0 {
            layer_info_bytes.push(0);
            layer_info_len += 1;
            section_len += 1;
            true
        } else {
            false
        };
        let _ = pad_layer_info;

        out.write_u32::<BigEndian>(section_len)?;
        out.write_u32::<BigEndian>(layer_info_len)?;
        out.write_all(&layer_info_bytes)?;

        // ── 5. Image Data Section (Composite Image) ───────────────────────────────
        // Compressione RLE PackBits (1) per l'immagine unita
        out.write_u16::<BigEndian>(1)?;

        let w = self.width as usize;
        let h = self.height as usize;
        let total_pixels = w * h;

        // Se non è stato fornito un composito esplicito, crea uno sfondo bianco opaco
        let composite_buf = if self.composite_rgba.len() == total_pixels * 4 {
            &self.composite_rgba[..]
        } else {
            &vec![255u8; total_pixels * 4][..]
        };

        // De-interleave dei piani con matting su bianco per RGB secondo specifica Adobe PSD
        let mut r_plane = Vec::with_capacity(total_pixels);
        let mut g_plane = Vec::with_capacity(total_pixels);
        let mut b_plane = Vec::with_capacity(total_pixels);
        let mut a_plane = Vec::with_capacity(total_pixels);

        for chunk in composite_buf.chunks_exact(4) {
            let r = chunk[0] as u32;
            let g = chunk[1] as u32;
            let b = chunk[2] as u32;
            let a = chunk[3] as u32;

            // Matte formula Adobe: se a == 0 -> bianco (255)
            // altrimenti ((color * alpha + 127) / 255 + 255 - alpha)
            let matted_r = if a == 0 {
                255
            } else {
                ((r * a + 127) / 255 + 255 - a).min(255) as u8
            };
            let matted_g = if a == 0 {
                255
            } else {
                ((g * a + 127) / 255 + 255 - a).min(255) as u8
            };
            let matted_b = if a == 0 {
                255
            } else {
                ((b * a + 127) / 255 + 255 - a).min(255) as u8
            };

            r_plane.push(matted_r);
            g_plane.push(matted_g);
            b_plane.push(matted_b);
            a_plane.push(chunk[3]);
        }

        let planes = [&r_plane, &g_plane, &b_plane, &a_plane];
        let mut all_scanlines = Vec::with_capacity(4 * h);
        let mut all_lens = Vec::with_capacity(4 * h);

        for plane in planes {
            for y in 0..h {
                let row = &plane[y * w..(y + 1) * w];
                let comp = compress_packbits(row);
                all_lens.push(comp.len() as u16);
                all_scanlines.push(comp);
            }
        }

        // Scrive la tabella delle lunghezze scansioni (4 * h * 2 bytes)
        for len in &all_lens {
            out.write_u16::<BigEndian>(*len)?;
        }

        // Scrive le scansioni compresse RLE
        for scan in &all_scanlines {
            out.write_all(scan)?;
        }

        Ok(out)
    }
}
