// Pizzico — crates/vector/src/offset.rs
// Riferimento manifesto: §6.2
// Licenza: MIT OR Apache-2.0

//! Calcolo dell'offset di curve e poligoni (analogo concettuale all'approccio Inkscape path-offset,
//! implementato ex-novo in clean room).

use crate::bezier::Point2D;

pub fn offset_polyline(points: &[Point2D], distance: f32) -> Vec<Point2D> {
    if points.len() < 2 {
        return points.to_vec();
    }

    let mut result = Vec::with_capacity(points.len());

    for i in 0..points.len() {
        let prev = if i == 0 { points[0] } else { points[i - 1] };
        let next = if i + 1 >= points.len() { points[i] } else { points[i + 1] };

        let dx = next.x - prev.x;
        let dy = next.y - prev.y;
        let len = (dx * dx + dy * dy).sqrt();

        if len > 1e-6 {
            let nx = -dy / len * distance;
            let ny = dx / len * distance;
            result.push(Point2D::new(points[i].x + nx, points[i].y + ny));
        } else {
            result.push(points[i]);
        }
    }

    result
}
