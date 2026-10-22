// Pizzico — crates/io-psd/src/header.rs
// Riferimento manifesto: §6.5
// Licenza: MIT OR Apache-2.0

//! Struttura e parsing dell'intestazione (File Header) PSD/PSB (26 byte).
//!
//! Secondo la specifica Adobe:
//! - 4 bytes: Signature `'8BPS'`
//! - 2 bytes: Version (1 = PSD, 2 = PSB)
//! - 6 bytes: Riservati (devono essere zero)
//! - 2 bytes: Numero canali (1–56)
//! - 4 bytes: Altezza (pixel)
//! - 4 bytes: Larghezza (pixel)
//! - 2 bytes: Profondità (1, 8, 16, 32 bit per canale)
//! - 2 bytes: Modalità colore (Bitmap, Grayscale, Indexed, RGB, CMYK, etc.)

use crate::error::PsdError;
use byteorder::{BigEndian, ReadBytesExt, WriteBytesExt};
use serde::{Deserialize, Serialize};
use std::io::{Read, Write};

pub const PSD_SIGNATURE: &[u8; 4] = b"8BPS";
pub const HEADER_SIZE: usize = 26;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PsdColorMode {
    Bitmap = 0,
    Grayscale = 1,
    Indexed = 2,
    Rgb = 3,
    Cmyk = 4,
    Multichannel = 7,
    Duotone = 8,
    Lab = 9,
}

impl PsdColorMode {
    pub fn from_u16(val: u16) -> Result<Self, PsdError> {
        match val {
            0 => Ok(Self::Bitmap),
            1 => Ok(Self::Grayscale),
            2 => Ok(Self::Indexed),
            3 => Ok(Self::Rgb),
            4 => Ok(Self::Cmyk),
            7 => Ok(Self::Multichannel),
            8 => Ok(Self::Duotone),
            9 => Ok(Self::Lab),
            other => Err(PsdError::InvalidColorMode(other)),
        }
    }

    pub fn to_u16(self) -> u16 {
        self as u16
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PsdHeader {
    pub version: u16,
    pub channels: u16,
    pub height: u32,
    pub width: u32,
    pub depth: u16,
    pub color_mode: PsdColorMode,
}

impl PsdHeader {
    /// Esegue il parsing dell'intestazione di 26 byte da un flusso di lettura Big-Endian.
    pub fn parse<R: Read>(reader: &mut R) -> Result<Self, PsdError> {
        let mut signature = [0u8; 4];
        reader.read_exact(&mut signature)?;
        if &signature != PSD_SIGNATURE {
            return Err(PsdError::InvalidSignature(signature));
        }

        let version = reader.read_u16::<BigEndian>()?;
        if version != 1 && version != 2 {
            return Err(PsdError::UnsupportedVersion(version));
        }

        let mut reserved = [0u8; 6];
        reader.read_exact(&mut reserved)?;

        let channels = reader.read_u16::<BigEndian>()?;
        let height = reader.read_u32::<BigEndian>()?;
        let width = reader.read_u32::<BigEndian>()?;
        let depth = reader.read_u16::<BigEndian>()?;
        let mode_raw = reader.read_u16::<BigEndian>()?;
        let color_mode = PsdColorMode::from_u16(mode_raw)?;

        Ok(Self {
            version,
            channels,
            height,
            width,
            depth,
            color_mode,
        })
    }

    /// Serializza l'intestazione PSD nel formato canonico Big-Endian di 26 byte.
    pub fn write<W: Write>(&self, writer: &mut W) -> Result<(), PsdError> {
        writer.write_all(PSD_SIGNATURE)?;
        writer.write_u16::<BigEndian>(self.version)?;
        writer.write_all(&[0u8; 6])?;
        writer.write_u16::<BigEndian>(self.channels)?;
        writer.write_u32::<BigEndian>(self.height)?;
        writer.write_u32::<BigEndian>(self.width)?;
        writer.write_u16::<BigEndian>(self.depth)?;
        writer.write_u16::<BigEndian>(self.color_mode.to_u16())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    #[test]
    fn test_parse_valid_header() {
        let mut buf = Vec::new();
        buf.extend_from_slice(b"8BPS");
        buf.extend_from_slice(&1u16.to_be_bytes()); // Version 1 (PSD)
        buf.extend_from_slice(&[0u8; 6]); // Reserved
        buf.extend_from_slice(&4u16.to_be_bytes()); // 4 Channels (RGBA)
        buf.extend_from_slice(&600u32.to_be_bytes()); // Height 600
        buf.extend_from_slice(&800u32.to_be_bytes()); // Width 800
        buf.extend_from_slice(&8u16.to_be_bytes()); // 8-bit depth
        buf.extend_from_slice(&3u16.to_be_bytes()); // RGB Color Mode

        assert_eq!(buf.len(), HEADER_SIZE);

        let mut cursor = Cursor::new(&buf);
        let header = PsdHeader::parse(&mut cursor).expect("Header valido");

        assert_eq!(header.version, 1);
        assert_eq!(header.channels, 4);
        assert_eq!(header.height, 600);
        assert_eq!(header.width, 800);
        assert_eq!(header.depth, 8);
        assert_eq!(header.color_mode, PsdColorMode::Rgb);
    }

    #[test]
    fn test_reject_invalid_signature() {
        let mut buf = vec![0u8; 26];
        buf[0..4].copy_from_slice(b"JPEG");
        let mut cursor = Cursor::new(&buf);
        let err = PsdHeader::parse(&mut cursor).unwrap_err();
        match err {
            PsdError::InvalidSignature(sig) => assert_eq!(&sig, b"JPEG"),
            _ => panic!("Atteso InvalidSignature"),
        }
    }

    #[test]
    fn test_reject_unsupported_version() {
        let mut buf = vec![0u8; 26];
        buf[0..4].copy_from_slice(b"8BPS");
        buf[4..6].copy_from_slice(&3u16.to_be_bytes()); // Versione 3 (inesistente)
        let mut cursor = Cursor::new(&buf);
        let err = PsdHeader::parse(&mut cursor).unwrap_err();
        match err {
            PsdError::UnsupportedVersion(v) => assert_eq!(v, 3),
            _ => panic!("Atteso UnsupportedVersion"),
        }
    }

    #[test]
    fn test_roundtrip_write_parse() {
        let original = PsdHeader {
            version: 1,
            channels: 3,
            height: 1080,
            width: 1920,
            depth: 8,
            color_mode: PsdColorMode::Rgb,
        };

        let mut out = Vec::new();
        original.write(&mut out).expect("Scrittura riuscita");
        assert_eq!(out.len(), 26);

        let mut cursor = Cursor::new(&out);
        let parsed = PsdHeader::parse(&mut cursor).expect("Parsing riuscito");
        assert_eq!(original, parsed);
    }
}
