// Pizzico — crates/core/src/compositing.rs
// Riferimento manifesto: §6.1
// Licenza: MIT OR Apache-2.0

//! Algoritmi di compositing multi-livello con supporto a trasparenza, maschere
//! e premoltiplicazione alpha, basati su Smith (1995).

use crate::blend::blend_pixel;
use crate::layer::Layer;

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

pub fn composite_layers(layers: &[Layer], width: u32, height: u32) -> CompositeBuffer {
    let mut buffer = CompositeBuffer::new(width, height);
    buffer.clear([255, 255, 255, 255]); // Sfondo bianco predefinito

    for layer in layers.iter().filter(|l| l.visible) {
        composite_single_layer(&mut buffer, layer);
    }

    buffer
}

fn composite_single_layer(target: &mut CompositeBuffer, layer: &Layer) {
    if let crate::layer::LayerContent::Raster(ref raster_data) = layer.content {
        let l_w = raster_data.width;
        let l_h = raster_data.height;

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

                if src_idx + 3 >= raster_data.pixels.len() || dst_idx + 3 >= target.data.len() {
                    continue;
                }

                let src_norm = [
                    raster_data.pixels[src_idx] as f32 / 255.0,
                    raster_data.pixels[src_idx + 1] as f32 / 255.0,
                    raster_data.pixels[src_idx + 2] as f32 / 255.0,
                    (raster_data.pixels[src_idx + 3] as f32 / 255.0) * layer.opacity,
                ];

                let dst_norm = [
                    target.data[dst_idx] as f32 / 255.0,
                    target.data[dst_idx + 1] as f32 / 255.0,
                    target.data[dst_idx + 2] as f32 / 255.0,
                    target.data[dst_idx + 3] as f32 / 255.0,
                ];

                let out = blend_pixel(src_norm, dst_norm, layer.blend_mode);

                target.data[dst_idx] = (out[0].clamp(0.0, 1.0) * 255.0) as u8;
                target.data[dst_idx + 1] = (out[1].clamp(0.0, 1.0) * 255.0) as u8;
                target.data[dst_idx + 2] = (out[2].clamp(0.0, 1.0) * 255.0) as u8;
                target.data[dst_idx + 3] = (out[3].clamp(0.0, 1.0) * 255.0) as u8;
            }
        }
    }
}
