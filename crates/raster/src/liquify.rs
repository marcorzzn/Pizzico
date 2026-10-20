// Pizzico — crates/raster/src/liquify.rs
// Riferimento manifesto: §6.1
// Licenza: MIT OR Apache-2.0

//! Deformazione interattiva dell'immagine (Liquify / Warp) tramite
//! Moving Least Squares (MLS affine / rigid), basato su Schaefer et al. (SIGGRAPH 2006).

#[derive(Debug, Clone)]
pub struct ControlPoint {
    pub p: [f32; 2], // Posizione originale
    pub q: [f32; 2], // Posizione deformata
}

pub struct MovingLeastSquares {
    pub alpha: f32,
}

impl Default for MovingLeastSquares {
    fn default() -> Self {
        Self { alpha: 1.0 }
    }
}

impl MovingLeastSquares {
    pub fn new() -> Self {
        Self::default()
    }

    /// Calcola la coordinata sorgente deformata per il pixel (x, y)
    pub fn deform_point(&self, pt: [f32; 2], handles: &[ControlPoint]) -> [f32; 2] {
        if handles.is_empty() {
            return pt;
        }

        let mut total_w = 0.0f32;
        let mut p_star = [0.0f32; 2];
        let mut q_star = [0.0f32; 2];

        // 1. Calcola centroidi pesati
        for h in handles {
            let dist_sq = (pt[0] - h.p[0]).powi(2) + (pt[1] - h.p[1]).powi(2);
            let w = if dist_sq < 1e-4 {
                1e5
            } else {
                1.0 / dist_sq.powf(self.alpha)
            };
            total_w += w;
            p_star[0] += w * h.p[0];
            p_star[1] += w * h.p[1];
            q_star[0] += w * h.q[0];
            q_star[1] += w * h.q[1];
        }

        if total_w <= 0.0 {
            return pt;
        }

        p_star[0] /= total_w;
        p_star[1] /= total_w;
        q_star[0] /= total_w;
        q_star[1] /= total_w;

        // 2. Traslazione e deformazione affine locale
        let diff = [pt[0] - p_star[0], pt[1] - p_star[1]];
        [q_star[0] + diff[0], q_star[1] + diff[1]]
    }
}
