// Pizzico — crates/inpainting/src/poisson.rs
// Riferimento manifesto: §6.1
// Licenza: MIT OR Apache-2.0

//! Seamless Cloning basato su equazione di Poisson:
//! Δf = div(v) con condizioni al contorno di Dirichlet (Di Martino et al., IPOL 2016).

pub fn poisson_seamless_clone(
    source: &[u8],
    destination: &mut [u8],
    width: usize,
    height: usize,
    mask: &[u8],
    iterations: usize,
) {
    let mut f = destination.to_vec();

    for _ in 0..iterations {
        let prev = f.clone();
        for y in 1..(height - 1) {
            for x in 1..(width - 1) {
                let idx = y * width + x;
                if mask[idx] > 0 {
                    for c in 0..3 {
                        // Campo di gradiente guidato da source: div(v)
                        let src_c = source[(y * width + x) * 4 + c] as f32;
                        let src_n = source[((y - 1) * width + x) * 4 + c] as f32;
                        let src_s = source[((y + 1) * width + x) * 4 + c] as f32;
                        let src_w = source[(y * width + (x - 1)) * 4 + c] as f32;
                        let src_e = source[(y * width + (x + 1)) * 4 + c] as f32;
                        let laplacian_src = 4.0 * src_c - (src_n + src_s + src_w + src_e);

                        let prev_n = prev[((y - 1) * width + x) * 4 + c] as f32;
                        let prev_s = prev[((y + 1) * width + x) * 4 + c] as f32;
                        let prev_w = prev[(y * width + (x - 1)) * 4 + c] as f32;
                        let prev_e = prev[(y * width + (x + 1)) * 4 + c] as f32;

                        let next_val = (laplacian_src + prev_n + prev_s + prev_w + prev_e) / 4.0;
                        f[(y * width + x) * 4 + c] = next_val.clamp(0.0, 255.0) as u8;
                    }
                }
            }
        }
    }

    destination.copy_from_slice(&f);
}
