// Pizzico — crates/io-psd/src/layer_records.rs
// Riferimento manifesto: §6.1, §6.5
// Licenza: MIT OR Apache-2.0

//! Strutture per la decodifica dei Layer Records, rettangoli di coordinate,
//! canali colore/alpha, modalità di fusione (blend modes) e visibilità.

use crate::error::PsdError;
use byteorder::{BigEndian, ReadBytesExt, WriteBytesExt};
use pizzico_core::BlendMode;
use serde::{Deserialize, Serialize};
use std::io::{Cursor, Read, Write};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PsdChannelInfo {
    pub channel_id: i16,
    pub data_length: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PsdLayerRecord {
    pub top: i32,
    pub left: i32,
    pub bottom: i32,
    pub right: i32,
    pub channels: Vec<PsdChannelInfo>,
    pub blend_mode_key: [u8; 4],
    pub blend_mode: BlendMode,
    pub opacity: u8,
    pub clipping: u8,
    pub flags: u8,
    pub visible: bool,
    pub name: String,
}

impl PsdLayerRecord {
    pub fn width(&self) -> u32 {
        (self.right - self.left).max(0) as u32
    }

    pub fn height(&self) -> u32 {
        (self.bottom - self.top).max(0) as u32
    }

    /// Converte la chiave ASCII a 4 byte del blend mode PSD nel tipo `BlendMode` di Pizzico.
    pub fn parse_blend_mode(key: &[u8; 4]) -> BlendMode {
        match key {
            b"norm" => BlendMode::Normal,
            b"mul " => BlendMode::Multiply,
            b"scrn" => BlendMode::Screen,
            b"over" => BlendMode::Overlay,
            b"dark" => BlendMode::Darken,
            b"lite" => BlendMode::Lighten,
            b"div " => BlendMode::ColorDodge,
            b"idiv" => BlendMode::ColorBurn,
            b"hLit" => BlendMode::HardLight,
            b"sLit" => BlendMode::SoftLight,
            b"diff" => BlendMode::Difference,
            b"smud" => BlendMode::Exclusion,
            _ => BlendMode::Normal, // Fallback standard
        }
    }

    /// Esegue il parsing di un singolo Layer Record.
    pub fn parse<R: Read>(reader: &mut R) -> Result<Self, PsdError> {
        let top = reader.read_i32::<BigEndian>()?;
        let left = reader.read_i32::<BigEndian>()?;
        let bottom = reader.read_i32::<BigEndian>()?;
        let right = reader.read_i32::<BigEndian>()?;

        let channel_count = reader.read_u16::<BigEndian>()? as usize;
        let mut channels = Vec::with_capacity(channel_count);
        for _ in 0..channel_count {
            let channel_id = reader.read_i16::<BigEndian>()?;
            let data_length = reader.read_u32::<BigEndian>()?;
            channels.push(PsdChannelInfo {
                channel_id,
                data_length,
            });
        }

        let mut sig = [0u8; 4];
        reader.read_exact(&mut sig)?;
        if &sig != b"8BIM" {
            return Err(PsdError::InvalidLayerRecord(format!(
                "Firma blend mode non valida: {:?}",
                sig
            )));
        }

        let mut blend_mode_key = [0u8; 4];
        reader.read_exact(&mut blend_mode_key)?;
        let blend_mode = Self::parse_blend_mode(&blend_mode_key);

        let opacity = reader.read_u8()?;
        let clipping = reader.read_u8()?;
        let flags = reader.read_u8()?;
        let _filler = reader.read_u8()?;

        // Nella specifica Adobe PSD: bit 1 dei flags indica invisibilità:
        // 0 = visibile, 1 = invisibile.
        let visible = (flags & (1 << 1)) == 0;

        let extra_length = reader.read_u32::<BigEndian>()? as usize;
        let mut extra_bytes = vec![0u8; extra_length];
        reader.read_exact(&mut extra_bytes)?;

        let mut name = String::new();
        if extra_length >= 4 {
            let mut extra_cursor = Cursor::new(&extra_bytes[..]);

            // 1. Layer mask data
            let mask_len = extra_cursor.read_u32::<BigEndian>()? as usize;
            if mask_len > 0 {
                let mut mask_skip = vec![0u8; mask_len];
                let _ = extra_cursor.read_exact(&mut mask_skip);
            }

            // 2. Layer blending ranges data
            if (extra_cursor.position() as usize) + 4 <= extra_length {
                let ranges_len = extra_cursor.read_u32::<BigEndian>()? as usize;
                if ranges_len > 0 {
                    let mut ranges_skip = vec![0u8; ranges_len];
                    let _ = extra_cursor.read_exact(&mut ranges_skip);
                }
            }

            // 3. Layer Name (Pascal string allineata a multipli di 4 byte)
            if (extra_cursor.position() as usize) < extra_length {
                let name_len = extra_cursor.read_u8()? as usize;
                let mut name_raw = vec![0u8; name_len];
                let _ = extra_cursor.read_exact(&mut name_raw);
                name = String::from_utf8_lossy(&name_raw).to_string();

                // Allineamento a multipli di 4 byte
                let total_name_bytes = 1 + name_len;
                let rem = total_name_bytes % 4;
                if rem != 0 {
                    let pad = 4 - rem;
                    let mut pad_bytes = vec![0u8; pad];
                    let _ = extra_cursor.read_exact(&mut pad_bytes);
                }
            }
        }

        if name.is_empty() {
            name = "Livello Senza Nome".to_string();
        }

        Ok(Self {
            top,
            left,
            bottom,
            right,
            channels,
            blend_mode_key,
            blend_mode,
            opacity,
            clipping,
            flags,
            visible,
            name,
        })
    }

    /// Serializza un Layer Record nel formato binario PSD.
    pub fn write<W: Write>(&self, writer: &mut W) -> Result<(), PsdError> {
        writer.write_i32::<BigEndian>(self.top)?;
        writer.write_i32::<BigEndian>(self.left)?;
        writer.write_i32::<BigEndian>(self.bottom)?;
        writer.write_i32::<BigEndian>(self.right)?;

        writer.write_u16::<BigEndian>(self.channels.len() as u16)?;
        for ch in &self.channels {
            writer.write_i16::<BigEndian>(ch.channel_id)?;
            writer.write_u32::<BigEndian>(ch.data_length)?;
        }

        writer.write_all(b"8BIM")?;
        writer.write_all(&self.blend_mode_key)?;
        writer.write_u8(self.opacity)?;
        writer.write_u8(self.clipping)?;

        let mut flags = self.flags;
        if !self.visible {
            flags |= 1 << 1;
        } else {
            flags &= !(1 << 1);
        }
        writer.write_u8(flags)?;
        writer.write_u8(0)?; // filler

        // Extra data: mask_len(0), ranges_len(0), name
        let mut extra = Vec::new();
        extra.write_u32::<BigEndian>(0)?; // mask len = 0
        extra.write_u32::<BigEndian>(0)?; // ranges len = 0

        let name_bytes = self.name.as_bytes();
        let name_len = name_bytes.len().min(255) as u8;
        extra.write_u8(name_len)?;
        extra.write_all(&name_bytes[..name_len as usize])?;

        let total_name_bytes = 1 + name_len as usize;
        let rem = total_name_bytes % 4;
        if rem != 0 {
            let pad = 4 - rem;
            extra.write_all(&vec![0u8; pad])?;
        }

        writer.write_u32::<BigEndian>(extra.len() as u32)?;
        writer.write_all(&extra)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_layer_record_roundtrip() {
        let original = PsdLayerRecord {
            top: 10,
            left: 20,
            bottom: 310,
            right: 420,
            channels: vec![
                PsdChannelInfo {
                    channel_id: 0,
                    data_length: 100,
                },
                PsdChannelInfo {
                    channel_id: 1,
                    data_length: 100,
                },
                PsdChannelInfo {
                    channel_id: 2,
                    data_length: 100,
                },
                PsdChannelInfo {
                    channel_id: -1,
                    data_length: 100,
                },
            ],
            blend_mode_key: *b"norm",
            blend_mode: BlendMode::Normal,
            opacity: 255,
            clipping: 0,
            flags: 0,
            visible: true,
            name: "Layer Test".to_string(),
        };

        assert_eq!(original.width(), 400);
        assert_eq!(original.height(), 300);

        let mut buf = Vec::new();
        original.write(&mut buf).expect("Write LayerRecord");

        let mut cursor = Cursor::new(&buf);
        let parsed = PsdLayerRecord::parse(&mut cursor).expect("Parse LayerRecord");

        assert_eq!(original.top, parsed.top);
        assert_eq!(original.left, parsed.left);
        assert_eq!(original.bottom, parsed.bottom);
        assert_eq!(original.right, parsed.right);
        assert_eq!(original.name, parsed.name);
        assert_eq!(original.visible, parsed.visible);
        assert_eq!(original.opacity, parsed.opacity);
        assert_eq!(original.blend_mode, parsed.blend_mode);
        assert_eq!(original.channels.len(), parsed.channels.len());
    }
}
