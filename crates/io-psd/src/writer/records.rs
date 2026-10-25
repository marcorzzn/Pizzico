// Pizzico — crates/io-psd/src/writer/records.rs
// Riferimento manifesto: §6.5, §7.3
// Licenza: MIT OR Apache-2.0
// Adattato da Photocraft (photocraft-psd, MIT/Apache-2.0)

//! Scrittura dei Layer Records, channel information, tagged blocks (`luni`, `lyid`, `lsct`)
//! e compressione PackBits RLE dei singoli canali.

use crate::error::PsdError;
use crate::rle::compress_packbits;
use byteorder::{BigEndian, WriteBytesExt};
use pizzico_core::BlendMode;
use std::io::Write;

/// Specifica di un livello o marcatore di gruppo per il writer PSD.
#[derive(Debug, Clone)]
pub struct WriterLayerSpec {
    pub name: String,
    pub left: i32,
    pub top: i32,
    pub width: u32,
    pub height: u32,
    pub rgba: Vec<u8>,
    pub blend_mode: BlendMode,
    pub opacity: u8,
    pub visible: bool,
    pub is_group_start: bool,
    pub is_group_end: bool,
}

impl WriterLayerSpec {
    pub fn new_raster(
        name: impl Into<String>,
        left: i32,
        top: i32,
        width: u32,
        height: u32,
        rgba: Vec<u8>,
        blend_mode: BlendMode,
        opacity: u8,
        visible: bool,
    ) -> Self {
        Self {
            name: name.into(),
            left,
            top,
            width,
            height,
            rgba,
            blend_mode,
            opacity,
            visible,
            is_group_start: false,
            is_group_end: false,
        }
    }

    pub fn new_group_start(name: impl Into<String>, visible: bool) -> Self {
        Self {
            name: name.into(),
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            rgba: Vec::new(),
            blend_mode: BlendMode::Normal,
            opacity: 255,
            visible,
            is_group_start: true,
            is_group_end: false,
        }
    }

    pub fn new_group_end() -> Self {
        Self {
            name: "</Layer set>".to_string(),
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            rgba: Vec::new(),
            blend_mode: BlendMode::Normal,
            opacity: 255,
            visible: false,
            is_group_start: false,
            is_group_end: true,
        }
    }

    pub fn blend_mode_key(&self) -> [u8; 4] {
        if self.is_group_start {
            return *b"pass"; // Pass-through per cartelle
        }
        match self.blend_mode {
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
        }
    }
}

/// Dati pre-compressi dei canali di un singolo livello.
pub struct CompressedLayerData {
    pub channel_sizes: Vec<(i16, u32)>,
    pub channel_payload: Vec<u8>,
}

/// Comprime i 4 canali (R, G, B, A) di un layer in formato RLE PackBits con tabella scansioni.
pub fn compress_layer_channels(
    width: u32,
    height: u32,
    rgba: &[u8],
) -> Result<CompressedLayerData, PsdError> {
    let w = width as usize;
    let h = height as usize;
    let total_pixels = w * h;

    if total_pixels == 0 {
        // Livello vuoto (es. cartella o layer 0x0)
        let channels = vec![(-1i16, 2u32), (0, 2), (1, 2), (2, 2)];
        let mut payload = Vec::new();
        for _ in 0..4 {
            let _ = payload.write_u16::<BigEndian>(0); // Raw, 0 bytes
        }
        return Ok(CompressedLayerData {
            channel_sizes: channels,
            channel_payload: payload,
        });
    }

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

    // Secondo specifica Adobe PSD, l'ordine canonico dei canali per layer records è:
    // Canale 0 (R), Canale 1 (G), Canale 2 (B), Canale -1 (Alpha di trasparenza).
    let planes: [(i16, &[u8]); 4] = [
        (0, &r_plane),
        (1, &g_plane),
        (2, &b_plane),
        (-1, &a_plane),
    ];

    let mut channel_sizes = Vec::with_capacity(4);
    let mut channel_payload = Vec::new();

    for (ch_id, plane) in planes {
        let mut scanline_lens = Vec::with_capacity(h);
        let mut scanlines = Vec::with_capacity(h);

        for y in 0..h {
            let row = &plane[y * w..(y + 1) * w];
            let comp = compress_packbits(row);
            scanline_lens.push(comp.len() as u16);
            scanlines.push(comp);
        }

        // Calcola lunghezza totale del canale:
        // 2 byte compressione + (h * 2) byte lunghezze + byte compressi
        let mut total_channel_len = 2 + (h * 2);
        for s in &scanlines {
            total_channel_len += s.len();
        }

        // Scrittura payload del canale
        channel_payload.write_u16::<BigEndian>(1)?; // Compressione 1 = RLE PackBits
        for len in &scanline_lens {
            channel_payload.write_u16::<BigEndian>(*len)?;
        }
        for s in &scanlines {
            channel_payload.write_all(s)?;
        }

        channel_sizes.push((ch_id, total_channel_len as u32));
    }

    Ok(CompressedLayerData {
        channel_sizes,
        channel_payload,
    })
}

/// Serializza il record di un livello (Layer Record) nella sezione Layer Info.
pub fn write_layer_record<W: Write>(
    w: &mut W,
    spec: &WriterLayerSpec,
    layer_id: u32,
    channel_sizes: &[(i16, u32)],
) -> Result<(), PsdError> {
    let top = spec.top;
    let left = spec.left;
    let bottom = spec.top + (spec.height as i32);
    let right = spec.left + (spec.width as i32);

    w.write_i32::<BigEndian>(top)?;
    w.write_i32::<BigEndian>(left)?;
    w.write_i32::<BigEndian>(bottom)?;
    w.write_i32::<BigEndian>(right)?;

    w.write_u16::<BigEndian>(channel_sizes.len() as u16)?;
    for (ch_id, len) in channel_sizes {
        w.write_i16::<BigEndian>(*ch_id)?;
        w.write_u32::<BigEndian>(*len)?;
    }

    w.write_all(b"8BIM")?;
    w.write_all(&spec.blend_mode_key())?;
    w.write_u8(spec.opacity)?;
    w.write_u8(0)?; // clipping = 0

    // Flags: bit 1 indica "hidden" (1 = nascosto, 0 = visibile)
    let flags: u8 = if spec.visible { 0 } else { 1 << 1 };
    w.write_u8(flags)?;
    w.write_u8(0)?; // filler

    // --- Extra Data ---
    let mut extra = Vec::new();

    // 1. Mask data length: 0
    extra.write_u32::<BigEndian>(0)?;

    // 2. Blending ranges: 4 canali (composite + R + G + B), 8 byte ciascuno = 32 bytes
    extra.write_u32::<BigEndian>(32)?;
    for _ in 0..4 {
        extra.write_all(&[0, 0, 255, 255, 0, 0, 255, 255])?;
    }

    // 3. Layer Name come Pascal string allineata a 4 byte
    let ascii_name: Vec<u8> = spec
        .name
        .chars()
        .map(|c| if c.is_ascii() { c as u8 } else { b'_' })
        .collect();
    let name_len = ascii_name.len().min(255) as u8;
    extra.write_u8(name_len)?;
    extra.write_all(&ascii_name[..name_len as usize])?;

    let total_name_bytes = 1 + (name_len as usize);
    let rem = total_name_bytes % 4;
    if rem != 0 {
        let pad = 4 - rem;
        for _ in 0..pad {
            extra.write_u8(0)?;
        }
    }

    // 4. Tagged blocks (`8BIM`):
    // 4a. `luni`: Nome Unicode completo UTF-16 BE
    let utf16: Vec<u16> = spec.name.encode_utf16().collect();
    let luni_payload_len = 4 + (utf16.len() * 2);
    extra.write_all(b"8BIM")?;
    extra.write_all(b"luni")?;
    extra.write_u32::<BigEndian>(luni_payload_len as u32)?;
    extra.write_u32::<BigEndian>(utf16.len() as u32)?;
    for ch in utf16 {
        extra.write_u16::<BigEndian>(ch)?;
    }
    if luni_payload_len % 2 != 0 {
        extra.write_u8(0)?; // padding a 2 byte per tagged block
    }

    // 4b. `lyid`: Layer ID univoco
    extra.write_all(b"8BIM")?;
    extra.write_all(b"lyid")?;
    extra.write_u32::<BigEndian>(4)?;
    extra.write_u32::<BigEndian>(layer_id)?;

    // 4c. `lsct`: Section Divider per gruppi/cartelle
    if spec.is_group_start {
        // Tipo 1 = Open folder
        extra.write_all(b"8BIM")?;
        extra.write_all(b"lsct")?;
        extra.write_u32::<BigEndian>(12)?;
        extra.write_u32::<BigEndian>(1)?; // Open folder
        extra.write_all(b"8BIM")?;
        extra.write_all(b"pass")?;
    } else if spec.is_group_end {
        // Tipo 3 = Bounding section divider
        extra.write_all(b"8BIM")?;
        extra.write_all(b"lsct")?;
        extra.write_u32::<BigEndian>(4)?;
        extra.write_u32::<BigEndian>(3)?; // Bounding section divider
    }

    // Scrive la lunghezza totale di extra data e poi il buffer
    w.write_u32::<BigEndian>(extra.len() as u32)?;
    w.write_all(&extra)?;

    Ok(())
}
