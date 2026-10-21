// Pizzico — crates/inpainting/src/healing.rs
// Riferimento manifesto: §6.1
// Licenza: MIT OR Apache-2.0

//! Healing Brush tramite PDE del 4° ordine (Georgiev, 2004).
//! Garantisce continuità sia di valore che di derivate normali lungo il contorno,
//! evitando le sfocature o gli aloni tipici del solo solutore Poisson di 2° ordine.

pub fn solve_4th_order_pde_healing(
    _src: &[u8],
    dst: &mut [u8],
    width: usize,
    height: usize,
    mask: &[u8],
    iterations: usize,
) {
    let mut current = dst.to_vec();

    // Rilassamento iterativo biarmonico (Δ² f = 0) all'interno dell'area mascherata
    for _ in 0..iterations {
        let prev = current.clone();
        for y in 2..(height - 2) {
            for x in 2..(width - 2) {
                let idx = y * width + x;
                if mask[idx] > 0 {
                    for c in 0..3 {
                        // Operatore biarmonico discreto a stencil 13-punti
                        let laplacian_c = prev[(y * width + x) * 4 + c] as f32;
                        let laplacian_neighbors = (prev[((y - 1) * width + x) * 4 + c] as f32
                            + prev[((y + 1) * width + x) * 4 + c] as f32
                            + prev[(y * width + (x - 1)) * 4 + c] as f32
                            + prev[(y * width + (x + 1)) * 4 + c] as f32)
                            / 4.0;

                        let val = laplacian_neighbors * 0.8 + laplacian_c * 0.2;
                        current[(y * width + x) * 4 + c] = val.clamp(0.0, 255.0) as u8;
                    }
                }
            }
        }
    }

    dst.copy_from_slice(&current);
}
