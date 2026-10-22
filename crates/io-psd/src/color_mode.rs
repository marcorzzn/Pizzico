// Pizzico — crates/io-psd/src/color_mode.rs
// Riferimento manifesto: §6.5
// Licenza: MIT OR Apache-2.0

//! Sezione Color Mode Data del formato Adobe Photoshop.
//!
//! Contiene i dati di colore specifici (es. tavolozza di 768 byte per la modalità Indexed,
//! o curve di densità per Duotone). Per le immagini RGB o CMYK standard, la lunghezza è tipicamente 0.

use crate::error::PsdError;
use byteorder::{BigEndian, ReadBytesExt, WriteBytesExt};
use serde::{Deserialize, Serialize};
use std::io::{Read, Write};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PsdColorModeData {
    pub data: Vec<u8>,
}

impl PsdColorModeData {
    pub fn empty() -> Self {
        Self { data: Vec::new() }
    }

    /// Esegue il parsing della sezione Color Mode Data leggendo prima la lunghezza a 32 bit.
    pub fn parse<R: Read>(reader: &mut R) -> Result<Self, PsdError> {
        let length = reader.read_u32::<BigEndian>()? as usize;
        let mut data = vec![0u8; length];
        if length > 0 {
            reader.read_exact(&mut data)?;
        }
        Ok(Self { data })
    }

    /// Serializza la sezione Color Mode Data.
    pub fn write<W: Write>(&self, writer: &mut W) -> Result<(), PsdError> {
        writer.write_u32::<BigEndian>(self.data.len() as u32)?;
        if !self.data.is_empty() {
            writer.write_all(&self.data)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    #[test]
    fn test_parse_empty_color_mode_data() {
        let buf = [0u8; 4]; // Length 0
        let mut cursor = Cursor::new(&buf);
        let cmd = PsdColorModeData::parse(&mut cursor).expect("Parsing color mode data");
        assert_eq!(cmd.data.len(), 0);
    }

    #[test]
    fn test_parse_indexed_palette() {
        let mut buf = Vec::new();
        buf.extend_from_slice(&768u32.to_be_bytes());
        buf.extend_from_slice(&vec![128u8; 768]);

        let mut cursor = Cursor::new(&buf);
        let cmd = PsdColorModeData::parse(&mut cursor).expect("Parsing 768 bytes palette");
        assert_eq!(cmd.data.len(), 768);
        assert_eq!(cmd.data[0], 128);
    }
}
