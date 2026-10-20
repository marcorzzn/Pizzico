// Pizzico — crates/raster/src/sparse.rs
// Riferimento manifesto: §6.1
// Licenza: MIT OR Apache-2.0

//! Approssimazioni sparse ad alte prestazioni per filtri convolutivi,
//! basato su Schuster et al. (PACMCGIT 2020).

pub struct SparseKernel {
    pub offsets: Vec<(i32, i32)>,
    pub weights: Vec<f32>,
}

impl SparseKernel {
    pub fn new_gaussian_approximation(sigma: f32) -> Self {
        // Approssimazione sparsa con campionamento su cerchi concentrici
        let mut offsets = vec![(0, 0)];
        let mut weights = vec![1.0];

        let steps = 8;
        let r = sigma.max(1.0);
        for i in 0..steps {
            let angle = (i as f32) * std::f32::consts::PI * 2.0 / (steps as f32);
            let dx = (angle.cos() * r).round() as i32;
            let dy = (angle.sin() * r).round() as i32;
            offsets.push((dx, dy));
            weights.push(0.5);
        }

        let total_weight: f32 = weights.iter().sum();
        for w in &mut weights {
            *w /= total_weight;
        }

        Self { offsets, weights }
    }

    pub fn apply(&self, src: &[u8], dst: &mut [u8], width: usize, height: usize) {
        for y in 0..height {
            for x in 0..width {
                let mut acc = [0.0f32; 4];
                for (offset, &weight) in self.offsets.iter().zip(&self.weights) {
                    let nx = (x as i32 + offset.0).clamp(0, width as i32 - 1) as usize;
                    let ny = (y as i32 + offset.1).clamp(0, height as i32 - 1) as usize;
                    let idx = (ny * width + nx) * 4;

                    for c in 0..4 {
                        acc[c] += src[idx + c] as f32 * weight;
                    }
                }
                let out_idx = (y * width + x) * 4;
                for c in 0..4 {
                    dst[out_idx + c] = acc[c].clamp(0.0, 255.0) as u8;
                }
            }
        }
    }
}
