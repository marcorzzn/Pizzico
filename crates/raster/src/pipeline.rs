// Pizzico — crates/raster/src/pipeline.rs
// Riferimento manifesto: §6.1
// Licenza: MIT OR Apache-2.0

//! Pipeline computazionale con separazione esplicita tra definizione dell'algoritmo
//! e strategia di scheduling/tiling, basata su Ragan-Kelley et al. (PLDI 2013).

pub struct RasterPipeline;

impl RasterPipeline {
    /// Esegue una trasformazione punto-a-punto con tiling della memoria per ottimizzare la cache L1/L2
    pub fn process_tiled<F>(src: &[u8], dst: &mut [u8], width: usize, height: usize, tile_size: usize, op: F)
    where
        F: Fn([u8; 4]) -> [u8; 4] + Sync + Send,
    {
        for ty in (0..height).step_by(tile_size) {
            let tile_h = tile_size.min(height - ty);
            for tx in (0..width).step_by(tile_size) {
                let tile_w = tile_size.min(width - tx);

                for y in ty..(ty + tile_h) {
                    for x in tx..(tx + tile_w) {
                        let idx = (y * width + x) * 4;
                        if idx + 3 < src.len() && idx + 3 < dst.len() {
                            let in_pixel = [src[idx], src[idx + 1], src[idx + 2], src[idx + 3]];
                            let out_pixel = op(in_pixel);
                            dst[idx] = out_pixel[0];
                            dst[idx + 1] = out_pixel[1];
                            dst[idx + 2] = out_pixel[2];
                            dst[idx + 3] = out_pixel[3];
                        }
                    }
                }
            }
        }
    }
}
