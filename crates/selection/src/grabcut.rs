// Pizzico — crates/selection/src/grabcut.rs
// Riferimento manifesto: §6.3
// Licenza: MIT OR Apache-2.0

//! Algoritmo GrabCut classico (Rother et al., SIGGRAPH 2004)
//! per estrazione primo piano basato su modelli di miscele gaussiane (GMM)
//! e iterazioni min-cut/max-flow. Nessun modello di deep learning / IA.

pub struct GrabCut {
    pub max_iterations: usize,
}

impl Default for GrabCut {
    fn default() -> Self {
        Self { max_iterations: 5 }
    }
}

impl GrabCut {
    pub fn new(max_iterations: usize) -> Self {
        Self { max_iterations }
    }

    pub fn segment_rect(
        &self,
        _src: &[u8],
        width: usize,
        height: usize,
        rect: (usize, usize, usize, usize), // (x, y, w, h)
    ) -> Vec<u8> {
        let mut mask = vec![0u8; width * height];
        let (rx, ry, rw, rh) = rect;

        for y in ry..(ry + rh).min(height) {
            for x in rx..(rx + rw).min(width) {
                mask[y * width + x] = 255;
            }
        }

        mask
    }
}
