// Pizzico — crates/selection/src/wand.rs
// Riferimento manifesto: §6.3
// Licenza: MIT OR Apache-2.0

//! Strumento Bacchetta Magica (Magic Wand):
//! Segmentazione per similarità di colore con sogliatura e propagazione connessa 4-way.

use std::collections::VecDeque;

pub fn magic_wand_selection(
    src: &[u8],
    width: usize,
    height: usize,
    start_x: usize,
    start_y: usize,
    tolerance: f32,
) -> Vec<u8> {
    let mut mask = vec![0u8; width * height];
    if start_x >= width || start_y >= height {
        return mask;
    }

    let seed_idx = (start_y * width + start_x) * 4;
    let seed_rgb = [
        src[seed_idx] as f32,
        src[seed_idx + 1] as f32,
        src[seed_idx + 2] as f32,
    ];

    let mut queue = VecDeque::new();
    queue.push_back((start_x, start_y));
    mask[start_y * width + start_x] = 255;

    let tol_sq = (tolerance * 255.0).powi(2);

    while let Some((x, y)) = queue.pop_front() {
        let neighbors = [
            (x.wrapping_sub(1), y),
            (x + 1, y),
            (x, y.wrapping_sub(1)),
            (x, y + 1),
        ];

        for (nx, ny) in neighbors {
            if nx < width && ny < height {
                let p_idx = ny * width + nx;
                if mask[p_idx] == 0 {
                    let c_idx = p_idx * 4;
                    let diff_sq = (src[c_idx] as f32 - seed_rgb[0]).powi(2)
                        + (src[c_idx + 1] as f32 - seed_rgb[1]).powi(2)
                        + (src[c_idx + 2] as f32 - seed_rgb[2]).powi(2);

                    if diff_sq <= tol_sq {
                        mask[p_idx] = 255;
                        queue.push_back((nx, ny));
                    }
                }
            }
        }
    }

    mask
}
