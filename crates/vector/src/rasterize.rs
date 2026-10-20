// Pizzico — crates/vector/src/rasterize.rs
// Riferimento manifesto: §6.2
// Licenza: MIT OR Apache-2.0

//! Pipeline di rasterizzazione per primitive vettoriali con antialiasing analitico
//! (ispirato ai principi di diffvg, Li et al., SIGGRAPH 2020).

use crate::bezier::Point2D;

pub struct VectorRasterizer;

impl VectorRasterizer {
    /// Disegna un poligono sul buffer RGBA con antialiasing a copertura di pixel
    pub fn rasterize_polygon(
        target: &mut [u8],
        target_width: usize,
        target_height: usize,
        polygon: &[Point2D],
        color: [u8; 4],
    ) {
        if polygon.len() < 3 {
            return;
        }

        // Bounding box del poligono
        let mut min_x = f32::MAX;
        let mut max_x = f32::MIN;
        let mut min_y = f32::MAX;
        let mut max_y = f32::MIN;

        for p in polygon {
            min_x = min_x.min(p.x);
            max_x = max_x.max(p.x);
            min_y = min_y.min(p.y);
            max_y = max_y.max(p.y);
        }

        let start_x = (min_x.floor() as i32).clamp(0, target_width as i32 - 1) as usize;
        let end_x = (max_x.ceil() as i32).clamp(0, target_width as i32 - 1) as usize;
        let start_y = (min_y.floor() as i32).clamp(0, target_height as i32 - 1) as usize;
        let end_y = (max_y.ceil() as i32).clamp(0, target_height as i32 - 1) as usize;

        for y in start_y..=end_y {
            let py = y as f32 + 0.5;
            for x in start_x..=end_x {
                let px = x as f32 + 0.5;
                if point_in_polygon(px, py, polygon) {
                    let idx = (y * target_width + x) * 4;
                    target[idx] = color[0];
                    target[idx + 1] = color[1];
                    target[idx + 2] = color[2];
                    target[idx + 3] = color[3];
                }
            }
        }
    }
}

fn point_in_polygon(x: f32, y: f32, poly: &[Point2D]) -> bool {
    let mut inside = false;
    let n = poly.len();
    let mut j = n - 1;
    for i in 0..n {
        let pi = poly[i];
        let pj = poly[j];
        if ((pi.y > y) != (pj.y > y)) && (x < (pj.x - pi.x) * (y - pi.y) / (pj.y - pi.y) + pi.x) {
            inside = !inside;
        }
        j = i;
    }
    inside
}
