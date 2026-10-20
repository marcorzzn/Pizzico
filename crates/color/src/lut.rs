// Pizzico — crates/color/src/lut.rs
// Riferimento manifesto: §6.1
// Licenza: MIT OR Apache-2.0

//! Interpolazione tridimensionale di 3D LUT (Zeng et al., IEEE TPAMI 2020)
//! per correzioni colore e filtri cromatici in tempo reale (<2ms).

pub struct Lut3D {
    pub size: usize,
    pub data: Vec<[f32; 3]>, // size^3 campioni RGB
}

impl Lut3D {
    pub fn new_identity(size: usize) -> Self {
        let mut data = Vec::with_capacity(size * size * size);
        for b in 0..size {
            for g in 0..size {
                for r in 0..size {
                    data.push([
                        r as f32 / (size - 1) as f32,
                        g as f32 / (size - 1) as f32,
                        b as f32 / (size - 1) as f32,
                    ]);
                }
            }
        }
        Self { size, data }
    }

    /// Esegue interpolazione trilineare per campionare il colore [r, g, b] ∈ [0, 1]
    pub fn sample_trilinear(&self, rgb: [f32; 3]) -> [f32; 3] {
        let s = (self.size - 1) as f32;
        let r = (rgb[0] * s).clamp(0.0, s);
        let g = (rgb[1] * s).clamp(0.0, s);
        let b = (rgb[2] * s).clamp(0.0, s);

        let r0 = r.floor() as usize;
        let g0 = g.floor() as usize;
        let b0 = b.floor() as usize;

        let r1 = (r0 + 1).min(self.size - 1);
        let g1 = (g0 + 1).min(self.size - 1);
        let b1 = (b0 + 1).min(self.size - 1);

        let fr = r - r0 as f32;
        let fg = g - g0 as f32;
        let fb = b - b0 as f32;

        let get = |ri, gi, bi| self.data[bi * self.size * self.size + gi * self.size + ri];

        let c000 = get(r0, g0, b0);
        let c100 = get(r1, g0, b0);
        let c010 = get(r0, g1, b0);
        let c110 = get(r1, g1, b0);
        let c001 = get(r0, g0, b1);
        let c101 = get(r1, g0, b1);
        let c011 = get(r0, g1, b1);
        let c111 = get(r1, g1, b1);

        let mut out = [0.0f32; 3];
        for i in 0..3 {
            let c00 = c000[i] * (1.0 - fr) + c100[i] * fr;
            let c10 = c010[i] * (1.0 - fr) + c110[i] * fr;
            let c01 = c001[i] * (1.0 - fr) + c101[i] * fr;
            let c11 = c011[i] * (1.0 - fr) + c111[i] * fr;

            let c0 = c00 * (1.0 - fg) + c10 * fg;
            let c1 = c01 * (1.0 - fg) + c11 * fg;

            out[i] = c0 * (1.0 - fb) + c1 * fb;
        }
        out
    }
}
