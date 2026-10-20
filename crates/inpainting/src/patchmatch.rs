// Pizzico — crates/inpainting/src/patchmatch.rs
// Riferimento manifesto: §6.1
// Licenza: MIT OR Apache-2.0

//! PatchMatch: Nearest-Neighbor Field (NNF) random sampling e propagazione (Barnes et al., SIGGRAPH 2009).
//! Consente Content-Aware Fill con accelerazione di 20-100x rispetto a brute force.

use rand::rngs::SmallRng;
use rand::{Rng, SeedableRng};

#[derive(Clone, Copy, Debug)]
pub struct PatchCoord {
    pub x: i32,
    pub y: i32,
    pub distance: f32,
}

pub struct PatchMatch {
    pub patch_radius: i32,
    pub iterations: usize,
}

impl Default for PatchMatch {
    fn default() -> Self {
        Self {
            patch_radius: 3,
            iterations: 5,
        }
    }
}

impl PatchMatch {
    pub fn new(patch_radius: i32, iterations: usize) -> Self {
        Self {
            patch_radius,
            iterations,
        }
    }

    /// Inizializza un Nearest Neighbor Field casuale tra target e source
    pub fn initialize_nnf(
        &self,
        width: usize,
        height: usize,
        mask: &[u8],
    ) -> Vec<PatchCoord> {
        let mut rng = SmallRng::seed_from_u64(42);
        let mut nnf = Vec::with_capacity(width * height);

        for y in 0..height {
            for x in 0..width {
                // Se è all'interno della maschera da riempire, cerca un offset valido esterno
                let in_hole = mask[y * width + x] > 0;
                let (rx, ry) = if in_hole {
                    (
                        rng.gen_range(0..width) as i32,
                        rng.gen_range(0..height) as i32,
                    )
                } else {
                    (x as i32, y as i32)
                };

                nnf.push(PatchCoord {
                    x: rx,
                    y: ry,
                    distance: if in_hole { f32::MAX } else { 0.0 },
                });
            }
        }

        nnf
    }
}
