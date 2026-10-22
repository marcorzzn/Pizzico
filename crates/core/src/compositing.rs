// Pizzico — crates/core/src/compositing.rs
// Riferimento manifesto: §6.1
// Licenza: MIT OR Apache-2.0

//! Algoritmi di compositing multi-livello con supporto a trasparenza e blending,
//! basati sulle formulazioni di Smith (1995) e Porter-Duff.

use crate::blend::blend_pixel;
use crate::document::Document;
use crate::layer::{Layer, LayerKind};

#[derive(Debug, Clone)]
pub struct CompositeBuffer {
    pub width: u32,
    pub height: u32,
    pub data: Vec<u8>, // RGBA 8-bit per channel
}

impl CompositeBuffer {
    pub fn new(width: u32, height: u32) -> Self {
        Self {
            width,
            height,
            data: vec![0; (width * height * 4) as usize],
        }
    }

    pub fn clear(&mut self, color: [u8; 4]) {
        for pixel in self.data.chunks_exact_mut(4) {
            pixel.copy_from_slice(&color);
        }
    }
}

/// Fonde tutti i livelli visibili del documento in un unico buffer RGBA (Smith 1995).
pub fn composite_layers(doc: &Document) -> Vec<u8> {
    let mut buffer = CompositeBuffer::new(doc.width, doc.height);

    for layer in doc.layers.iter().filter(|l| l.visible) {
        composite_single_layer(&mut buffer, layer);
    }

    buffer.data
}

/// Helper di compatibilità per slice di livelli arbitrari.
pub fn composite_layer_slice(layers: &[Layer], width: u32, height: u32) -> CompositeBuffer {
    let mut buffer = CompositeBuffer::new(width, height);

    for layer in layers.iter().filter(|l| l.visible) {
        composite_single_layer(&mut buffer, layer);
    }

    buffer
}

fn composite_single_layer(target: &mut CompositeBuffer, layer: &Layer) {
    if let LayerKind::Raster {
        width: l_w,
        height: l_h,
        ref pixels,
    } = layer.kind
    {
        for y in 0..l_h {
            let target_y = layer.transform.y + y as i32;
            if target_y < 0 || target_y >= target.height as i32 {
                continue;
            }
            for x in 0..l_w {
                let target_x = layer.transform.x + x as i32;
                if target_x < 0 || target_x >= target.width as i32 {
                    continue;
                }

                let src_idx = ((y * l_w + x) * 4) as usize;
                let dst_idx = ((target_y as u32 * target.width + target_x as u32) * 4) as usize;

                if src_idx + 3 >= pixels.len() || dst_idx + 3 >= target.data.len() {
                    continue;
                }

                let src_norm = [
                    pixels[src_idx] as f32 / 255.0,
                    pixels[src_idx + 1] as f32 / 255.0,
                    pixels[src_idx + 2] as f32 / 255.0,
                    (pixels[src_idx + 3] as f32 / 255.0) * layer.opacity,
                ];

                let dst_norm = [
                    target.data[dst_idx] as f32 / 255.0,
                    target.data[dst_idx + 1] as f32 / 255.0,
                    target.data[dst_idx + 2] as f32 / 255.0,
                    target.data[dst_idx + 3] as f32 / 255.0,
                ];

                let out = blend_pixel(src_norm, dst_norm, layer.blend_mode);

                target.data[dst_idx] = (out[0].clamp(0.0, 1.0) * 255.0).round() as u8;
                target.data[dst_idx + 1] = (out[1].clamp(0.0, 1.0) * 255.0).round() as u8;
                target.data[dst_idx + 2] = (out[2].clamp(0.0, 1.0) * 255.0).round() as u8;
                target.data[dst_idx + 3] = (out[3].clamp(0.0, 1.0) * 255.0).round() as u8;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::document::Document;
    use crate::layer::Layer;

    #[test]
    fn test_composite_single_layer() {
        let mut doc = Document::new_empty(2, 2);
        let id = doc.allocate_layer_id();
        let red_layer = Layer::new_raster_color(id, "Red", 2, 2, [255, 0, 0, 255]);
        doc.add_layer(red_layer);

        let buffer = composite_layers(&doc);
        assert_eq!(buffer.len(), 2 * 2 * 4);
        for chunk in buffer.chunks_exact(4) {
            assert_eq!(chunk, [255, 0, 0, 255]);
        }
    }

    #[test]
    fn test_composite_red_and_transparent_blue_makes_purple() {
        let mut doc = Document::new_empty(2, 2);

        // Livello 1: Rosso opaco
        let id1 = doc.allocate_layer_id();
        doc.add_layer(Layer::new_raster_color(id1, "Rosso", 2, 2, [255, 0, 0, 255]));

        // Livello 2: Blu con trasparenza ~50% (alpha 128)
        let id2 = doc.allocate_layer_id();
        doc.add_layer(Layer::new_raster_color(id2, "Blu", 2, 2, [0, 0, 255, 128]));

        let buffer = composite_layers(&doc);

        for chunk in buffer.chunks_exact(4) {
            // Il canale rosso si attenua (~127) e il canale blu emerge (~128), creando viola
            assert!(chunk[0] > 100 && chunk[0] < 150, "Red value was {}", chunk[0]);
            assert_eq!(chunk[1], 0, "Green value was {}", chunk[1]);
            assert!(chunk[2] > 100 && chunk[2] < 150, "Blue value was {}", chunk[2]);
            assert_eq!(chunk[3], 255, "Alpha value was {}", chunk[3]);
        }
    }

    #[test]
    fn test_invisible_layer_is_ignored() {
        let mut doc = Document::new_empty(2, 2);

        let id1 = doc.allocate_layer_id();
        doc.add_layer(Layer::new_raster_color(id1, "Rosso", 2, 2, [255, 0, 0, 255]));

        let id2 = doc.allocate_layer_id();
        let mut blue_layer = Layer::new_raster_color(id2, "Blu", 2, 2, [0, 0, 255, 255]);
        blue_layer.visible = false;
        doc.add_layer(blue_layer);

        let buffer = composite_layers(&doc);
        for chunk in buffer.chunks_exact(4) {
            assert_eq!(chunk, [255, 0, 0, 255]);
        }
    }
}
