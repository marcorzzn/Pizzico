// Pizzico — crates/io-psd/src/image_data.rs
// Riferimento manifesto: §6.1, §6.5
// Licenza: MIT OR Apache-2.0

//! Decodifica e assemblaggio dei canali colore (R, G, B, Alpha) in buffer RGBA 8-bit standard.

use crate::error::PsdError;
use crate::layer_records::PsdLayerRecord;
use crate::rle::{compress_packbits, decompress_packbits};
use byteorder::{BigEndian, ReadBytesExt, WriteBytesExt};
use std::collections::HashMap;
use std::io::{Read, Write};

#[derive(Debug, Clone)]
pub struct DecodedLayerPixels {
    pub width: u32,
    pub height: u32,
    pub rgba: Vec<u8>,
}

/// Decodifica i dati dei canali di un livello PSD e li assembla in un buffer interleaved RGBA 8-bit.
pub fn parse_layer_channel_data<R: Read>(
    reader: &mut R,
    record: &PsdLayerRecord,
) -> Result<DecodedLayerPixels, PsdError> {
    let width = record.width() as usize;
    let height = record.height() as usize;
    let total_pixels = width * height;

    if total_pixels == 0 {
        return Ok(DecodedLayerPixels {
            width: record.width(),
            height: record.height(),
            rgba: Vec::new(),
        });
    }

    let mut channels_map: HashMap<i16, Vec<u8>> = HashMap::new();

    for channel in &record.channels {
        let compression = reader.read_u16::<BigEndian>()?;
        let channel_data = match compression {
            0 => {
                // Raw uncompressed data
                let mut data = vec![0u8; total_pixels];
                reader.read_exact(&mut data)?;
                data
            }
            1 => {
                // RLE PackBits
                // Legge la tabella delle lunghezze delle scansioni (2 byte per riga)
                let mut scanline_lens = Vec::with_capacity(height);
                for _ in 0..height {
                    scanline_lens.push(reader.read_u16::<BigEndian>()? as usize);
                }

                let mut decompressed = Vec::with_capacity(total_pixels);
                for len in scanline_lens {
                    let mut scanline_bytes = vec![0u8; len];
                    reader.read_exact(&mut scanline_bytes)?;
                    let scanline = decompress_packbits(&scanline_bytes, width)?;
                    decompressed.extend_from_slice(&scanline);
                }
                decompressed
            }
            other => return Err(PsdError::UnsupportedCompression(other)),
        };

        channels_map.insert(channel.channel_id, channel_data);
    }

    // Ricostruisce il buffer RGBA piano per piano (interleaved)
    let red_ch = channels_map.get(&0);
    let green_ch = channels_map.get(&1);
    let blue_ch = channels_map.get(&2);
    let alpha_ch = channels_map.get(&-1);

    let mut rgba = Vec::with_capacity(total_pixels * 4);
    for idx in 0..total_pixels {
        let r = red_ch.and_then(|c| c.get(idx)).copied().unwrap_or(0);
        let g = green_ch.and_then(|c| c.get(idx)).copied().unwrap_or(0);
        let b = blue_ch.and_then(|c| c.get(idx)).copied().unwrap_or(0);
        let a = alpha_ch.and_then(|c| c.get(idx)).copied().unwrap_or(255);

        rgba.push(r);
        rgba.push(g);
        rgba.push(b);
        rgba.push(a);
    }

    Ok(DecodedLayerPixels {
        width: record.width(),
        height: record.height(),
        rgba,
    })
}

/// Codifica un buffer RGBA 8-bit in canali RLE PackBits per un livello PSD sintetico.
pub fn write_layer_channel_data<W: Write>(
    writer: &mut W,
    width: u32,
    height: u32,
    rgba: &[u8],
) -> Result<Vec<(i16, u32)>, PsdError> {
    let w = width as usize;
    let h = height as usize;
    let total_pixels = w * h;

    let mut r_plane = Vec::with_capacity(total_pixels);
    let mut g_plane = Vec::with_capacity(total_pixels);
    let mut b_plane = Vec::with_capacity(total_pixels);
    let mut a_plane = Vec::with_capacity(total_pixels);

    for chunk in rgba.chunks_exact(4) {
        r_plane.push(chunk[0]);
        g_plane.push(chunk[1]);
        b_plane.push(chunk[2]);
        a_plane.push(chunk[3]);
    }

    let channels: [(i16, &[u8]); 4] = [
        (0, &r_plane),
        (1, &g_plane),
        (2, &b_plane),
        (-1, &a_plane),
    ];

    let mut channel_sizes = Vec::new();

    for (ch_id, plane) in channels {
        let mut compressed_scanlines = Vec::with_capacity(h);
        let mut scanline_lens = Vec::with_capacity(h);

        for y in 0..h {
            let row = &plane[y * w..(y + 1) * w];
            let comp = compress_packbits(row);
            scanline_lens.push(comp.len() as u16);
            compressed_scanlines.push(comp);
        }

        // Calcola dimensione totale canale: 2 byte (compressione = 1) + (h * 2) tabella + scansioni compresse
        let mut total_channel_len = 2 + (h * 2);
        for scan in &compressed_scanlines {
            total_channel_len += scan.len();
        }

        writer.write_u16::<BigEndian>(1)?; // Compressione RLE PackBits
        for len in &scanline_lens {
            writer.write_u16::<BigEndian>(*len)?;
        }
        for scan in &compressed_scanlines {
            writer.write_all(scan)?;
        }

        channel_sizes.push((ch_id, total_channel_len as u32));
    }

    Ok(channel_sizes)
}
