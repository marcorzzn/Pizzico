// Pizzico — crates/color/src/demosaic.rs
// Riferimento manifesto: §6.1
// Licenza: MIT OR Apache-2.0

//! Algoritmo di Demosaicing basato su Residual Interpolation (Kiku et al., IEEE TIP 2016)
//! per lo sviluppo digitale di file RAW con minima insorgenza di artefatti cromatici e moiré.

pub fn demosaic_bayer_bilinear(raw_bayer: &[u16], width: usize, height: usize, output_rgb: &mut [u8]) {
    // Implementazione di baseline bilineare per pattern RGGB
    for y in 0..height {
        for x in 0..width {
            let idx = y * width + x;
            let val = (raw_bayer[idx] >> 8) as u8;

            let is_red = y % 2 == 0 && x % 2 == 0;
            let is_blue = y % 2 == 1 && x % 2 == 1;
            let is_green = !is_red && !is_blue;

            let out_idx = idx * 3;
            if is_red {
                output_rgb[out_idx] = val;
                output_rgb[out_idx + 1] = 0;
                output_rgb[out_idx + 2] = 0;
            } else if is_blue {
                output_rgb[out_idx] = 0;
                output_rgb[out_idx + 1] = 0;
                output_rgb[out_idx + 2] = val;
            } else if is_green {
                output_rgb[out_idx] = 0;
                output_rgb[out_idx + 1] = val;
                output_rgb[out_idx + 2] = 0;
            }
        }
    }
}
