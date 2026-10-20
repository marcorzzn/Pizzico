// Pizzico — crates/io-psd/src/parser.rs
// Riferimento manifesto: §6.5
// Licenza: MIT OR Apache-2.0

//! Parser PSD clean room conforme alla specifica Adobe.

use crate::header::{PsdColorMode, PsdHeader};
use byteorder::{BigEndian, ReadBytesExt};
use pizzico_core::Document;
use std::io::{Cursor, Read};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum PsdParseError {
    #[error("Magic bytes invalid: expected 8BPS")]
    InvalidSignature,
    #[error("Unsupported version: {0}")]
    UnsupportedVersion(u16),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Invalid color mode: {0}")]
    InvalidColorMode(u16),
}

pub fn parse_psd(bytes: &[u8]) -> Result<Document, PsdParseError> {
    let mut cursor = Cursor::new(bytes);

    // 1. Signature (4 bytes): '8BPS'
    let mut signature = [0u8; 4];
    cursor.read_exact(&mut signature)?;
    if &signature != b"8BPS" {
        return Err(PsdParseError::InvalidSignature);
    }

    // 2. Version (2 bytes): 1 o 2
    let version = cursor.read_u16::<BigEndian>()?;
    if version != 1 && version != 2 {
        return Err(PsdParseError::UnsupportedVersion(version));
    }

    // 3. Reserved (6 bytes)
    let mut reserved = [0u8; 6];
    cursor.read_exact(&mut reserved)?;

    // 4. Channels (2 bytes)
    let channels = cursor.read_u16::<BigEndian>()?;

    // 5. Height (4 bytes)
    let height = cursor.read_u32::<BigEndian>()?;

    // 6. Width (4 bytes)
    let width = cursor.read_u32::<BigEndian>()?;

    // 7. Depth (2 bytes)
    let depth = cursor.read_u16::<BigEndian>()?;

    // 8. Color Mode (2 bytes)
    let mode_num = cursor.read_u16::<BigEndian>()?;
    let color_mode = match mode_num {
        0 => PsdColorMode::Bitmap,
        1 => PsdColorMode::Grayscale,
        2 => PsdColorMode::Indexed,
        3 => PsdColorMode::Rgb,
        4 => PsdColorMode::Cmyk,
        7 => PsdColorMode::Multichannel,
        8 => PsdColorMode::Duotone,
        9 => PsdColorMode::Lab,
        _ => return Err(PsdParseError::InvalidColorMode(mode_num)),
    };

    let header = PsdHeader {
        version,
        channels,
        height,
        width,
        depth,
        color_mode,
    };

    let doc = Document::new(header.width, header.height, "Imported PSD");
    Ok(doc)
}
