// Pizzico — crates/io-psd/src/image_resources.rs
// Riferimento manifesto: §6.5
// Licenza: MIT OR Apache-2.0

//! Sezione Image Resources del formato Adobe Photoshop.
//!
//! Contiene una serie di blocchi con firma `'8BIM'` che memorizzano metadati
//! del documento come risoluzione DPI (`0x03ED`), guide e griglie (`0x0408`),
//! e informazioni sullo stato dei livelli.

use crate::error::PsdError;
use byteorder::{BigEndian, ReadBytesExt, WriteBytesExt};
use serde::{Deserialize, Serialize};
use std::io::{Cursor, Read, Write};

pub const RESOURCE_SIGNATURE_8BIM: &[u8; 4] = b"8BIM";
pub const RESOURCE_SIGNATURE_MESA: &[u8; 4] = b"MeSa";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ImageResourceBlock {
    pub signature: [u8; 4],
    pub resource_id: u16,
    pub name: String,
    pub data: Vec<u8>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PsdImageResources {
    pub blocks: Vec<ImageResourceBlock>,
}

impl PsdImageResources {
    pub fn empty() -> Self {
        Self { blocks: Vec::new() }
    }

    /// Esegue il parsing della sezione Image Resources leggendo prima la lunghezza complessiva.
    pub fn parse<R: Read>(reader: &mut R) -> Result<Self, PsdError> {
        let length = reader.read_u32::<BigEndian>()? as usize;
        if length == 0 {
            return Ok(Self::empty());
        }

        let mut section_bytes = vec![0u8; length];
        reader.read_exact(&mut section_bytes)?;

        let mut cursor = Cursor::new(&section_bytes[..]);
        let mut blocks = Vec::new();

        while (cursor.position() as usize) < length {
            // Verifica che ci siano abbastanza byte per firma + id (almeno 6 byte)
            if length - (cursor.position() as usize) < 6 {
                break;
            }

            let mut sig = [0u8; 4];
            if cursor.read_exact(&mut sig).is_err() {
                break;
            }

            if &sig != RESOURCE_SIGNATURE_8BIM && &sig != RESOURCE_SIGNATURE_MESA {
                // Se la firma non corrisponde a '8BIM'/'MeSa', non è un blocco valido o siamo arrivati al padding finale
                break;
            }

            let resource_id = match cursor.read_u16::<BigEndian>() {
                Ok(id) => id,
                Err(_) => break,
            };

            // Pascal string: 1 byte lunghezza, caratteri, padding ad allineamento pari
            let name_len = match cursor.read_u8() {
                Ok(l) => l as usize,
                Err(_) => break,
            };

            let mut name_bytes = vec![0u8; name_len];
            if cursor.read_exact(&mut name_bytes).is_err() {
                break;
            }
            let name = String::from_utf8_lossy(&name_bytes).to_string();

            // Allineamento pari: totale byte del nome = 1 (lunghezza) + name_len
            let total_name_bytes = 1 + name_len;
            if total_name_bytes % 2 != 0 {
                let _ = cursor.read_u8(); // Padding nullo
            }

            // Dimensione dati blocco
            let data_size = match cursor.read_u32::<BigEndian>() {
                Ok(s) => s as usize,
                Err(_) => break,
            };

            let mut block_data = vec![0u8; data_size];
            if cursor.read_exact(&mut block_data).is_err() {
                break;
            }

            // Padding dati ad allineamento pari
            if data_size % 2 != 0 {
                let _ = cursor.read_u8();
            }

            blocks.push(ImageResourceBlock {
                signature: sig,
                resource_id,
                name,
                data: block_data,
            });
        }

        Ok(Self { blocks })
    }

    /// Serializza tutti i blocchi delle risorse immagine con la lunghezza complessiva.
    pub fn write<W: Write>(&self, writer: &mut W) -> Result<(), PsdError> {
        let mut block_bytes = Vec::new();
        for block in &self.blocks {
            block_bytes.write_all(&block.signature)?;
            block_bytes.write_u16::<BigEndian>(block.resource_id)?;

            let name_raw = block.name.as_bytes();
            let name_len = name_raw.len().min(255) as u8;
            block_bytes.write_u8(name_len)?;
            block_bytes.write_all(&name_raw[..name_len as usize])?;

            let total_name_bytes = 1 + name_len as usize;
            if total_name_bytes % 2 != 0 {
                block_bytes.write_u8(0)?;
            }

            block_bytes.write_u32::<BigEndian>(block.data.len() as u32)?;
            block_bytes.write_all(&block.data)?;
            if block.data.len() % 2 != 0 {
                block_bytes.write_u8(0)?;
            }
        }

        writer.write_u32::<BigEndian>(block_bytes.len() as u32)?;
        writer.write_all(&block_bytes)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_empty_resources() {
        let buf = [0u8; 4];
        let mut cursor = Cursor::new(&buf);
        let res = PsdImageResources::parse(&mut cursor).expect("Empty resources");
        assert_eq!(res.blocks.len(), 0);
    }

    #[test]
    fn test_roundtrip_resource_block() {
        let original = PsdImageResources {
            blocks: vec![ImageResourceBlock {
                signature: *RESOURCE_SIGNATURE_8BIM,
                resource_id: 0x03ED, // ResolutionInfo
                name: "Resolution".to_string(),
                data: vec![0, 72, 0, 0],
            }],
        };

        let mut buf = Vec::new();
        original.write(&mut buf).expect("Write resource");

        let mut cursor = Cursor::new(&buf);
        let parsed = PsdImageResources::parse(&mut cursor).expect("Parse resource");
        assert_eq!(parsed.blocks.len(), 1);
        assert_eq!(parsed.blocks[0].resource_id, 0x03ED);
        assert_eq!(parsed.blocks[0].name, "Resolution");
        assert_eq!(parsed.blocks[0].data, vec![0, 72, 0, 0]);
    }
}
