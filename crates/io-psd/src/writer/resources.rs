// Pizzico — crates/io-psd/src/writer/resources.rs
// Riferimento manifesto: §6.5, §7.3
// Licenza: MIT OR Apache-2.0
// Adattato da Photocraft (photocraft-psd, MIT/Apache-2.0)

//! Sezione Image Resources (blocchi con signature `8BIM`).
//!
//! Include:
//! - Risorsa 1005 (`ResolutionInfo`): DPI orizzontale e verticale in formato fixed-point 16.16.
//! - Risorsa 1057 (`VersionInfo`): Flag `has_real_merged_data = true` e stringhe compatibilità Adobe.

use crate::error::PsdError;
use byteorder::{BigEndian, WriteBytesExt};
use std::io::Write;

/// ID risorsa risoluzione (DPI).
pub const RES_ID_RESOLUTION_INFO: u16 = 1005;
/// ID risorsa informazioni di versione e composito reale.
pub const RES_ID_VERSION_INFO: u16 = 1057;

/// Struttura ResolutionInfo standard Adobe PSD (risorsa 1005, 16 bytes).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ResolutionInfo {
    /// Risoluzione orizzontale in formato 16.16 fixed-point (pixels per inch).
    pub h_res_fixed: u32,
    /// Unità di visualizzazione orizzontale (1 = pixels/inch, 2 = pixels/cm).
    pub h_res_unit: u16,
    /// Unità righello per larghezza (1 = in, 2 = cm, 3 = pt, 4 = pica, 5 = column).
    pub width_unit: u16,
    /// Risoluzione verticale in formato 16.16 fixed-point (pixels per inch).
    pub v_res_fixed: u32,
    /// Unità di visualizzazione verticale (1 = pixels/inch, 2 = pixels/cm).
    pub v_res_unit: u16,
    /// Unità righello per altezza.
    pub height_unit: u16,
}

impl ResolutionInfo {
    /// Costruisce una struttura ResolutionInfo dato il valore DPI.
    pub fn from_dpi(dpi: f32) -> Self {
        let fixed = ((dpi.max(1.0) as f64) * 65536.0).round() as u32;
        Self {
            h_res_fixed: fixed,
            h_res_unit: 1, // pixels per inch
            width_unit: 1, // inches
            v_res_fixed: fixed,
            v_res_unit: 1,
            height_unit: 1,
        }
    }

    /// Serializza i 16 byte esatti del blocco ResolutionInfo.
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut out = Vec::with_capacity(16);
        let _ = out.write_u32::<BigEndian>(self.h_res_fixed);
        let _ = out.write_u16::<BigEndian>(self.h_res_unit);
        let _ = out.write_u16::<BigEndian>(self.width_unit);
        let _ = out.write_u32::<BigEndian>(self.v_res_fixed);
        let _ = out.write_u16::<BigEndian>(self.v_res_unit);
        let _ = out.write_u16::<BigEndian>(self.height_unit);
        out
    }
}

/// Codifica una stringa Unicode Adobe (lunghezza in caratteri `u32` BE + caratteri UTF-16 BE).
fn encode_adobe_unicode_string(s: &str) -> Vec<u8> {
    let utf16: Vec<u16> = s.encode_utf16().collect();
    let mut out = Vec::with_capacity(4 + utf16.len() * 2);
    let _ = out.write_u32::<BigEndian>(utf16.len() as u32);
    for ch in utf16 {
        let _ = out.write_u16::<BigEndian>(ch);
    }
    out
}

/// Genera i byte della risorsa 1057 (VersionInfo) con `has_real_merged_data = true`.
pub fn build_version_info_resource(has_real_merged_data: bool) -> Vec<u8> {
    let mut out = Vec::new();
    let _ = out.write_u32::<BigEndian>(1); // Version = 1
    out.push(if has_real_merged_data { 1 } else { 0 }); // has_real_merged_data

    let writer_str = encode_adobe_unicode_string("Adobe Photoshop");
    out.extend_from_slice(&writer_str);

    let reader_str = encode_adobe_unicode_string("Adobe Photoshop 2026");
    out.extend_from_slice(&reader_str);

    let _ = out.write_u32::<BigEndian>(1); // file_version = 1
    out
}

/// Un blocco Image Resource `8BIM`.
pub struct ImageResource {
    pub id: u16,
    pub name: Vec<u8>,
    pub data: Vec<u8>,
}

impl ImageResource {
    pub fn new(id: u16, data: Vec<u8>) -> Self {
        Self {
            id,
            name: Vec::new(),
            data,
        }
    }

    /// Serializza il singolo blocco `8BIM` con allineamento pari.
    pub fn write<W: Write>(&self, w: &mut W) -> Result<(), PsdError> {
        w.write_all(b"8BIM")?;
        w.write_u16::<BigEndian>(self.id)?;

        // Pascal string per il nome: 1 byte lunghezza + caratteri.
        // Se la lunghezza totale (1 + len) è dispari, viene aggiunto un byte di padding
        // in modo che l'intero header del nome sia allineato a 2 byte.
        let name_len = self.name.len().min(255) as u8;
        w.write_u8(name_len)?;
        if name_len > 0 {
            w.write_all(&self.name[..name_len as usize])?;
        }
        let total_name_len = 1 + (name_len as usize);
        if total_name_len % 2 != 0 {
            w.write_u8(0)?; // padding a 2 byte
        }

        // Dimensione dati + dati
        w.write_u32::<BigEndian>(self.data.len() as u32)?;
        w.write_all(&self.data)?;

        // Padding dei dati a 2 byte
        if self.data.len() % 2 != 0 {
            w.write_u8(0)?;
        }

        Ok(())
    }
}
