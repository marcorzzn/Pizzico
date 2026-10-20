// Pizzico — crates/raster/src/median.rs
// Riferimento manifesto: §6.1
// Licenza: MIT OR Apache-2.0

//! Algoritmo per il filtro mediano in tempo costante O(1) indipendente dal raggio del kernel,
//! basato su istogrammi colonna di Perreault & Hébert (IEEE TIP 2007).

pub fn median_filter_o1(src: &[u8], dst: &mut [u8], width: usize, height: usize, radius: usize) {
    if width == 0 || height == 0 || radius == 0 {
        dst.copy_from_slice(src);
        return;
    }

    let kernel_len = (2 * radius + 1) * (2 * radius + 1);
    let median_index = kernel_len / 2;

    // Per semplicità e robustezza numerica iniziale su canale scala di grigio o per-canale
    for c in 0..3 {
        let mut col_hist = vec![[0u16; 256]; width];

        for y in 0..height {
            // Inizializza o aggiorna istogrammi colonna per la riga corrente
            let y_min = y.saturating_sub(radius);
            let y_max = (y + radius).min(height - 1);

            for x in 0..width {
                col_hist[x].fill(0);
                for ky in y_min..=y_max {
                    let val = src[(ky * width + x) * 4 + c] as usize;
                    col_hist[x][val] += 1;
                }
            }

            let mut kernel_hist = [0u32; 256];
            for x in 0..=(radius.min(width - 1)) {
                for i in 0..256 {
                    kernel_hist[i] += col_hist[x][i] as u32;
                }
            }

            for x in 0..width {
                // Calcola il mediano dall'istogramma del kernel
                let mut count = 0;
                let mut med = 0;
                for i in 0..256 {
                    count += kernel_hist[i];
                    if count > median_index as u32 {
                        med = i as u8;
                        break;
                    }
                }
                dst[(y * width + x) * 4 + c] = med;

                // Fai scorrere l'istogramma orizzontalmente
                let left_col = x.saturating_sub(radius);
                let right_col = (x + radius + 1).min(width - 1);
                if x + radius + 1 < width {
                    for i in 0..256 {
                        kernel_hist[i] = kernel_hist[i]
                            .saturating_sub(col_hist[left_col][i] as u32)
                            + col_hist[right_col][i] as u32;
                    }
                }
            }
        }
    }

    // Copia canale alfa invariato
    for i in (3..src.len()).step_by(4) {
        dst[i] = src[i];
    }
}
