// Pizzico — crates/core/src/layer.rs
// Riferimento manifesto: §4, §5.3, §5.4, §6.1
// Licenza: MIT OR Apache-2.0

//! Struttura unificata e polimorfica dei livelli (Canvas Polimorfico Unificato §5.4).
//! Ogni livello può contenere dati raster, tracciati vettoriali o gerarchie a gruppi.

use crate::blend::BlendMode;
use serde::{Deserialize, Serialize};

pub type LayerId = u64;

/// Tipologia e contenuto del livello grafico.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum LayerKind {
    /// Livello con buffer bitmap RGBA 8-bit a risoluzione fissa.
    Raster {
        width: u32,
        height: u32,
        pixels: Vec<u8>,
    },
    /// Livello vettoriale basato su tracciati analitici (§5.4).
    Vector {
        paths: Vec<String>,
    },
    /// Livello contenitore per gerarchie annidate e raggruppamenti (§5.3).
    Group {
        children: Vec<Layer>,
    },
}

/// Alias per compatibilità con codice precedente
pub type LayerContent = LayerKind;

/// Trasformazione 2D affine applicata al livello.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
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

/// Singolo livello all'interno del Documento Pizzico.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Layer {
    pub id: LayerId,
    pub name: String,
    pub kind: LayerKind,
    pub visible: bool,
    pub locked: bool,
    pub opacity: f32,
    pub blend_mode: BlendMode,
    pub transform: Transform2D,
}

impl Layer {
    /// Crea un nuovo livello raster vuoto (pixel trasparenti [0, 0, 0, 0]).
    pub fn new_raster(id: LayerId, name: impl Into<String>, width: u32, height: u32) -> Self {
        Self {
            id,
            name: name.into(),
            kind: LayerKind::Raster {
                width,
                height,
                pixels: vec![0; (width * height * 4) as usize],
            },
            visible: true,
            locked: false,
            opacity: 1.0,
            blend_mode: BlendMode::Normal,
            transform: Transform2D::default(),
        }
    }

    /// Crea un nuovo livello raster con un buffer di pixel RGBA esistente.
    pub fn new_raster_with_pixels(
        id: LayerId,
        name: impl Into<String>,
        width: u32,
        height: u32,
        pixels: Vec<u8>,
    ) -> Self {
        Self {
            id,
            name: name.into(),
            kind: LayerKind::Raster {
                width,
                height,
                pixels,
            },
            visible: true,
            locked: false,
            opacity: 1.0,
            blend_mode: BlendMode::Normal,
            transform: Transform2D::default(),
        }
    }

    /// Crea un nuovo livello raster riempito uniformemente con un colore RGBA solido.
    pub fn new_raster_color(
        id: LayerId,
        name: impl Into<String>,
        width: u32,
        height: u32,
        color: [u8; 4],
    ) -> Self {
        let total_pixels = (width * height) as usize;
        let mut pixels = Vec::with_capacity(total_pixels * 4);
        for _ in 0..total_pixels {
            pixels.extend_from_slice(&color);
        }
        Self::new_raster_with_pixels(id, name, width, height, pixels)
    }

    /// Crea un nuovo livello vettoriale (stub per Fase 2).
    pub fn new_vector(id: LayerId, name: impl Into<String>) -> Self {
        Self {
            id,
            name: name.into(),
            kind: LayerKind::Vector { paths: Vec::new() },
            visible: true,
            locked: false,
            opacity: 1.0,
            blend_mode: BlendMode::Normal,
            transform: Transform2D::default(),
        }
    }

    /// Crea un nuovo gruppo di livelli (stub gerarchico).
    pub fn new_group(id: LayerId, name: impl Into<String>) -> Self {
        Self {
            id,
            name: name.into(),
            kind: LayerKind::Group {
                children: Vec::new(),
            },
            visible: true,
            locked: false,
            opacity: 1.0,
            blend_mode: BlendMode::Normal,
            transform: Transform2D::default(),
        }
    }
}
