// Pizzico — crates/raster/src/recursive.rs
// Riferimento manifesto: §6.1
// Licenza: MIT OR Apache-2.0

//! Filtro ricorsivo a tempo costante O(1) e Summed-Area Tables (SAT)
//! per sfocatura rapida, basato su Nehab et al. (SIGGRAPH Asia 2011).

pub fn box_blur_recursive(src: &[u8], dst: &mut [u8], width: usize, height: usize, radius: usize) {
    if width == 0 || height == 0 || radius == 0 {
        dst.copy_from_slice(src);
        return;
    }

    let mut temp = vec![0u8; src.len()];

    // Passata orizzontale separabile
    for y in 0..height {
        for c in 0..4 {
            let mut sum: u32 = 0;
            let mut count: u32 = 0;

            // Inizializza finestra
            for x in 0..=radius.min(width - 1) {
                sum += src[(y * width + x) * 4 + c] as u32;
                count += 1;
            }

            for x in 0..width {
                // Aggiungi elemento entrante a destra
                if x + radius < width && x > 0 {
                    sum += src[(y * width + x + radius) * 4 + c] as u32;
                    count += 1;
                }
                // Sottrai elemento uscente a sinistra
                if x > radius {
                    sum -= src[(y * width + (x - radius - 1)) * 4 + c] as u32;
                    count -= 1;
                }
                temp[(y * width + x) * 4 + c] = (sum / count.max(1)) as u8;
            }
        }
    }

    // Passata verticale separabile
    for x in 0..width {
        for c in 0..4 {
            let mut sum: u32 = 0;
            let mut count: u32 = 0;

            for y in 0..=radius.min(height - 1) {
                sum += temp[(y * width + x) * 4 + c] as u32;
                count += 1;
            }

            for y in 0..height {
                if y + radius < height && y > 0 {
                    sum += temp[((y + radius) * width + x) * 4 + c] as u32;
                    count += 1;
                }
                if y > radius {
                    sum -= temp[((y - radius - 1) * width + x) * 4 + c] as u32;
                    count -= 1;
                }
                dst[(y * width + x) * 4 + c] = (sum / count.max(1)) as u8;
            }
        }
    }
}
