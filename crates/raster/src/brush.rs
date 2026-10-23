// Pizzico — crates/raster/src/brush.rs
// Riferimento manifesto: §3.1, §4, §6.1, §10 Fase 1
// Licenza: MIT OR Apache-2.0

//! Motore di rasterizzazione e disegno a pennello (Brush Engine).
//! Supporta:
//! - Tratti interpolati continui (Bresenham / step-spacing sub-pixel)
//! - Anti-aliasing radiale basato sulla distanza dal centro
//! - Sfumatura regolabile tramite durezza (hardness: 0.0 = morbido, 1.0 = netto)
//! - Alpha compositing Porter-Duff Over deterministico
//! - Calcolo dei bounding box sporchi (dirty rect) per Undo/Redo compatto

use pizzico_core::layer::{Layer, LayerKind};

/// Configurazione delle proprietà del pennello grafico.
#[derive(Debug, Clone, PartialEq)]
pub struct Brush {
    /// Raggio del tratto in pixel.
    pub radius: f32,
    /// Durezza del bordo: 0.0 (sfumato/airbrush) ..= 1.0 (netto/hard round).
    pub hardness: f32,
    /// Colore solido RGBA (8-bit per canale).
    pub color: [u8; 4],
    /// Opacità globale del tratto: 0.0 ..= 1.0.
    pub opacity: f32,
}

impl Default for Brush {
    fn default() -> Self {
        Self {
            radius: 10.0,
            hardness: 0.8,
            color: [0, 0, 0, 255],
            opacity: 1.0,
        }
    }
}

/// Bounding box rettangolare (min_x, min_y, width, height) in coordinate pixel documento.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BoundingBox {
    pub min_x: u32,
    pub min_y: u32,
    pub width: u32,
    pub height: u32,
}

impl BoundingBox {
    pub fn new(min_x: u32, min_y: u32, width: u32, height: u32) -> Self {
        Self { min_x, min_y, width, height }
    }

    /// Unione di due bounding box.
    pub fn union(&self, other: &Self) -> Self {
        let min_x = self.min_x.min(other.min_x);
        let min_y = self.min_y.min(other.min_y);
        let max_x = (self.min_x + self.width).max(other.min_x + other.width);
        let max_y = (self.min_y + self.height).max(other.min_y + other.height);
        Self {
            min_x,
            min_y,
            width: max_x - min_x,
            height: max_y - min_y,
        }
    }
}

/// Disegna un singolo punto/timbro circolare sul livello raster.
/// Restituisce il bounding box dei pixel modificati, oppure `None` se il timbro cade fuori dal livello.
pub fn stamp(layer: &mut Layer, center: (f32, f32), brush: &Brush) -> Option<BoundingBox> {
    apply_stamp(layer, center, brush, false, None)
}

/// Disegna un singolo timbro con clipping rettangolare (es. per selezione attiva).
pub fn stamp_clipped(
    layer: &mut Layer,
    center: (f32, f32),
    brush: &Brush,
    clip_bounds: Option<BoundingBox>,
) -> Option<BoundingBox> {
    apply_stamp(layer, center, brush, false, clip_bounds)
}

/// Disegna un singolo timbro in modalità gomma (cancella riducendo l'alpha).
pub fn eraser_stamp(layer: &mut Layer, center: (f32, f32), brush: &Brush) -> Option<BoundingBox> {
    apply_stamp(layer, center, brush, true, None)
}

/// Disegna un singolo timbro in modalità gomma con clipping rettangolare.
pub fn eraser_stamp_clipped(
    layer: &mut Layer,
    center: (f32, f32),
    brush: &Brush,
    clip_bounds: Option<BoundingBox>,
) -> Option<BoundingBox> {
    apply_stamp(layer, center, brush, true, clip_bounds)
}

fn apply_stamp(
    layer: &mut Layer,
    center: (f32, f32),
    brush: &Brush,
    is_eraser: bool,
    clip_bounds: Option<BoundingBox>,
) -> Option<BoundingBox> {
    let (cx, cy) = center;
    let r = brush.radius.max(0.5);

    if let LayerKind::Raster { width, height, pixels } = &mut layer.kind {
        let doc_w = *width;
        let doc_h = *height;

        let mut min_x = (cx - r).floor().max(0.0) as u32;
        let mut max_x = (cx + r).ceil().min(doc_w as f32 - 1.0) as u32;
        let mut min_y = (cy - r).floor().max(0.0) as u32;
        let mut max_y = (cy + r).ceil().min(doc_h as f32 - 1.0) as u32;

        if let Some(clip) = clip_bounds {
            min_x = min_x.max(clip.min_x);
            let clip_max_x = clip.min_x + clip.width.saturating_sub(1);
            let clip_max_y = clip.min_y + clip.height.saturating_sub(1);
            max_x = max_x.min(clip_max_x);
            min_y = min_y.max(clip.min_y);
            max_y = max_y.min(clip_max_y);
        }

        if min_x > max_x || min_y > max_y {
            return None;
        }

        let hardness = brush.hardness.clamp(0.0, 1.0);
        let r_inner = r * hardness.min(0.999);
        let r_delta = (r - r_inner).max(0.001);

        let brush_r = brush.color[0] as f32;
        let brush_g = brush.color[1] as f32;
        let brush_b = brush.color[2] as f32;
        let brush_base_a = (brush.color[3] as f32 / 255.0) * brush.opacity.clamp(0.0, 1.0);

        for py in min_y..=max_y {
            let dy = (py as f32 + 0.5) - cy;
            let dy2 = dy * dy;

            for px in min_x..=max_x {
                let dx = (px as f32 + 0.5) - cx;
                let dist = (dx * dx + dy2).sqrt();

                if dist > r {
                    continue;
                }

                // Calcolo fattore di caduta (falloff) radiale
                let factor = if dist <= r_inner {
                    1.0
                } else {
                    let t = (dist - r_inner) / r_delta;
                    (1.0 - t).clamp(0.0, 1.0)
                };

                let effective_alpha = brush_base_a * factor;
                if effective_alpha <= 0.0 {
                    continue;
                }

                let idx = ((py * doc_w + px) * 4) as usize;
                let dst_r = pixels[idx] as f32;
                let dst_g = pixels[idx + 1] as f32;
                let dst_b = pixels[idx + 2] as f32;
                let dst_a = pixels[idx + 3] as f32 / 255.0;

                if is_eraser {
                    // Modalità Gomma: attenua l'alpha esistente
                    let new_a = (dst_a * (1.0 - effective_alpha)).clamp(0.0, 1.0);
                    pixels[idx + 3] = (new_a * 255.0).round() as u8;
                } else {
                    // Modalità Pennello: Porter-Duff Over compositing standard
                    let out_a = effective_alpha + dst_a * (1.0 - effective_alpha);
                    if out_a > 0.0 {
                        let out_r = (brush_r * effective_alpha + dst_r * dst_a * (1.0 - effective_alpha)) / out_a;
                        let out_g = (brush_g * effective_alpha + dst_g * dst_a * (1.0 - effective_alpha)) / out_a;
                        let out_b = (brush_b * effective_alpha + dst_b * dst_a * (1.0 - effective_alpha)) / out_a;

                        pixels[idx] = out_r.round().clamp(0.0, 255.0) as u8;
                        pixels[idx + 1] = out_g.round().clamp(0.0, 255.0) as u8;
                        pixels[idx + 2] = out_b.round().clamp(0.0, 255.0) as u8;
                        pixels[idx + 3] = (out_a * 255.0).round().clamp(0.0, 255.0) as u8;
                    }
                }
            }
        }

        Some(BoundingBox::new(min_x, min_y, max_x - min_x + 1, max_y - min_y + 1))
    } else {
        None
    }
}

/// Disegna un tratto continuo tra due punti `from` e `to` con interpolazione lineare.
/// Garantisce continuità visiva senza buchi né sovrapposizioni eccessive.
/// Restituisce il bounding box complessivo dell'intero segmento.
pub fn stroke(
    layer: &mut Layer,
    from: (f32, f32),
    to: (f32, f32),
    brush: &Brush,
) -> Option<BoundingBox> {
    stroke_internal(layer, from, to, brush, false, None)
}

/// Disegna un tratto continuo limitato da un bounding box di ritaglio (clipping).
pub fn stroke_clipped(
    layer: &mut Layer,
    from: (f32, f32),
    to: (f32, f32),
    brush: &Brush,
    clip_bounds: Option<BoundingBox>,
) -> Option<BoundingBox> {
    stroke_internal(layer, from, to, brush, false, clip_bounds)
}

/// Disegna un tratto continuo in modalità gomma tra due punti.
pub fn eraser_stroke(
    layer: &mut Layer,
    from: (f32, f32),
    to: (f32, f32),
    brush: &Brush,
) -> Option<BoundingBox> {
    stroke_internal(layer, from, to, brush, true, None)
}

/// Disegna un tratto continuo in modalità gomma con clipping.
pub fn eraser_stroke_clipped(
    layer: &mut Layer,
    from: (f32, f32),
    to: (f32, f32),
    brush: &Brush,
    clip_bounds: Option<BoundingBox>,
) -> Option<BoundingBox> {
    stroke_internal(layer, from, to, brush, true, clip_bounds)
}

fn stroke_internal(
    layer: &mut Layer,
    from: (f32, f32),
    to: (f32, f32),
    brush: &Brush,
    is_eraser: bool,
    clip_bounds: Option<BoundingBox>,
) -> Option<BoundingBox> {
    let (x0, y0) = from;
    let (x1, y1) = to;
    let dx = x1 - x0;
    let dy = y1 - y0;
    let dist = (dx * dx + dy * dy).sqrt();

    // Spacing adattivo: un quarto del raggio, con minimo di 1.0 pixel
    let step_dist = (brush.radius * 0.25).max(1.0);
    let steps = (dist / step_dist).ceil() as usize;

    let mut total_bbox: Option<BoundingBox> = None;

    if steps == 0 {
        return apply_stamp(layer, to, brush, is_eraser, clip_bounds);
    }

    for i in 0..=steps {
        let t = i as f32 / steps as f32;
        let pt = (x0 + t * dx, y0 + t * dy);
        if let Some(bbox) = apply_stamp(layer, pt, brush, is_eraser, clip_bounds) {
            total_bbox = Some(match total_bbox {
                Some(current) => current.union(&bbox),
                None => bbox,
            });
        }
    }

    total_bbox
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_single_stamp() {
        let mut layer = Layer::new_raster_color(1, "Test", 100, 100, [255, 255, 255, 255]);
        let brush = Brush {
            radius: 5.0,
            hardness: 1.0,
            color: [255, 0, 0, 255],
            opacity: 1.0,
        };

        let bbox = stamp(&mut layer, (50.0, 50.0), &brush);
        assert!(bbox.is_some());
        let b = bbox.unwrap();
        assert!(b.min_x <= 50 && b.min_x + b.width >= 50);

        if let LayerKind::Raster { width, pixels, .. } = &layer.kind {
            let center_idx = ((50 * width + 50) * 4) as usize;
            assert_eq!(&pixels[center_idx..center_idx + 4], &[255, 0, 0, 255]);
        }
    }

    #[test]
    fn test_stroke_interpolation() {
        let mut layer = Layer::new_raster_color(1, "Test", 50, 50, [0, 0, 0, 0]);
        let brush = Brush {
            radius: 2.0,
            hardness: 1.0,
            color: [0, 255, 0, 255],
            opacity: 1.0,
        };

        let bbox = stroke(&mut layer, (10.0, 10.0), (30.0, 10.0), &brush);
        assert!(bbox.is_some());

        // Punto intermedio (20, 10) deve essere colorato
        if let LayerKind::Raster { width, pixels, .. } = &layer.kind {
            let mid_idx = ((10 * width + 20) * 4) as usize;
            assert_eq!(&pixels[mid_idx..mid_idx + 4], &[0, 255, 0, 255]);
        }
    }

    #[test]
    fn test_eraser_reduces_alpha() {
        let mut layer = Layer::new_raster_color(1, "Test", 20, 20, [100, 100, 100, 255]);
        let brush = Brush {
            radius: 3.0,
            hardness: 1.0,
            color: [0, 0, 0, 255],
            opacity: 1.0,
        };

        let _ = eraser_stamp(&mut layer, (10.0, 10.0), &brush);

        if let LayerKind::Raster { width, pixels, .. } = &layer.kind {
            let center_idx = ((10 * width + 10) * 4) as usize;
            // L'alpha al centro deve essere azzerato
            assert_eq!(pixels[center_idx + 3], 0);
        }
    }

    #[test]
    fn test_stroke_clipped_to_selection() {
        let mut layer = Layer::new_raster_color(1, "Test", 100, 100, [255, 255, 255, 255]);
        let brush = Brush {
            radius: 5.0,
            hardness: 1.0,
            color: [255, 0, 0, 255],
            opacity: 1.0,
        };

        // Selezione attiva tra (30, 30) e (70, 70)
        let clip = Some(BoundingBox::new(30, 30, 40, 40));

        // Tratto che attraversa da (10, 50) a (90, 50)
        let bbox = stroke_clipped(&mut layer, (10.0, 50.0), (90.0, 50.0), &brush, clip);
        assert!(bbox.is_some());
        let b = bbox.unwrap();
        assert!(b.min_x >= 30);
        assert!(b.min_x + b.width <= 71);

        if let LayerKind::Raster { width, pixels, .. } = &layer.kind {
            // Fuori dalla selezione: (20, 50) deve rimanere bianco puro
            let outside_idx = ((50 * width + 20) * 4) as usize;
            assert_eq!(&pixels[outside_idx..outside_idx + 4], &[255, 255, 255, 255]);

            // Fuori dalla selezione: (80, 50) deve rimanere bianco puro
            let outside_idx2 = ((50 * width + 80) * 4) as usize;
            assert_eq!(&pixels[outside_idx2..outside_idx2 + 4], &[255, 255, 255, 255]);

            // Dentro la selezione: (50, 50) deve essere rosso
            let inside_idx = ((50 * width + 50) * 4) as usize;
            assert_eq!(&pixels[inside_idx..inside_idx + 4], &[255, 0, 0, 255]);
        }
    }
}
