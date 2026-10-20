// Pizzico — crates/text/src/lib.rs
// Riferimento manifesto: §3.1, §4, §6.4
// Licenza: MIT OR Apache-2.0

//! # Pizzico Typography Engine
//!
//! Integrazione di `rustybuzz` per lo shaping tipografico avanzato OpenType:
//! - Calcolo metriche e posizionamento glifi (advance, offset x/y)
//! - Supporto a legature e kerning
//!
//! ## Riferimenti (§6.4)
//! - HarfBuzz / rustybuzz.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlyphPosition {
    pub glyph_id: u32,
    pub cluster: u32,
    pub x_advance: i32,
    pub y_advance: i32,
    pub x_offset: i32,
    pub y_offset: i32,
}

pub struct TextShaper;

impl TextShaper {
    pub fn shape_text(font_bytes: &[u8], text: &str) -> Option<Vec<GlyphPosition>> {
        let face = rustybuzz::Face::from_slice(font_bytes, 0)?;
        let mut buffer = rustybuzz::UnicodeBuffer::new();
        buffer.push_str(text);
        buffer.guess_segment_properties();

        let glyph_buffer = rustybuzz::shape(&face, &[], buffer);
        let infos = glyph_buffer.glyph_infos();
        let positions = glyph_buffer.glyph_positions();

        let mut out = Vec::with_capacity(infos.len());
        for (info, pos) in infos.iter().zip(positions.iter()) {
            out.push(GlyphPosition {
                glyph_id: info.glyph_id,
                cluster: info.cluster,
                x_advance: pos.x_advance,
                y_advance: pos.y_advance,
                x_offset: pos.x_offset,
                y_offset: pos.y_offset,
            });
        }

        Some(out)
    }
}
