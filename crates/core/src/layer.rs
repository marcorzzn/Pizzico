// Pizzico — crates/core/src/layer.rs
// Riferimento manifesto: §5.3, §5.4, §6.1
// Licenza: MIT OR Apache-2.0

//! Struttura unificata e polimorfica dei livelli (Canvas Polimorfico Unificato §5.4).
//! Ogni livello può contenere dati raster, tracciati vettoriali, testo o regolazioni.

use crate::blend::BlendMode;
use serde::{Deserialize, Serialize};

pub type LayerId = u64;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum LayerKind {
    Raster,
    Vector,
    Text,
    Adjustment,
    Group,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transform2D {
    pub x: i32,
    pub y: i32,
    pub scale_x: f32,
    pub scale_y: f32,
    pub rotation_rad: f32,
}

impl Default for Transform2D {
    fn default() -> Self {
        Self {
            x: 0,
            y: 0,
            scale_x: 1.0,
            scale_y: 1.0,
            rotation_rad: 0.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RasterData {
    pub width: u32,
    pub height: u32,
    pub pixels: Vec<u8>, // RGBA 8-bit
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LayerContent {
    Raster(RasterData),
    Vector(String), // SVG path definition o struttura vettoriale interna
    Text {
        text: String,
        font_family: String,
        font_size: f32,
    },
    Group(Vec<LayerId>),
    None,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Layer {
    pub id: LayerId,
    pub name: String,
    pub kind: LayerKind,
    pub visible: bool,
    pub locked: bool,
    pub opacity: f32,
    pub blend_mode: BlendMode,
    pub transform: Transform2D,
    pub content: LayerContent,
}

impl Layer {
    pub fn new_raster(id: LayerId, name: String, width: u32, height: u32) -> Self {
        Self {
            id,
            name,
            kind: LayerKind::Raster,
            visible: true,
            locked: false,
            opacity: 1.0,
            blend_mode: BlendMode::Normal,
            transform: Transform2D::default(),
            content: LayerContent::Raster(RasterData {
                width,
                height,
                pixels: vec![0; (width * height * 4) as usize],
            }),
        }
    }
}
