// Pizzico — crates/vector/src/stroke.rs
// Riferimento manifesto: §6.2
// Licenza: MIT OR Apache-2.0

//! Espansione del tratto geometrico (Stroke Expansion) ad alte prestazioni,
//! orientata alla pipeline GPU con approssimazione a spirali di Eulero (Levien & Uguray, PACMCGIT 2024).

use crate::bezier::Point2D;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LineCap {
    Butt,
    Round,
    Square,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LineJoin {
    Miter,
    Round,
    Bevel,
}

pub struct StrokeStyle {
    pub width: f32,
    pub cap: LineCap,
    pub join: LineJoin,
    pub miter_limit: f32,
}

pub struct StrokeExpander;

impl StrokeExpander {
    /// Genera la mesh / poligoni di contorno per il tratto lungo una polilinea
    pub fn expand_polyline(points: &[Point2D], style: &StrokeStyle) -> (Vec<Point2D>, Vec<[u32; 3]>) {
        let mut vertices = Vec::new();
        let mut indices = Vec::new();

        if points.len() < 2 {
            return (vertices, indices);
        }

        let half_width = style.width / 2.0;

        for i in 0..(points.len() - 1) {
            let p1 = points[i];
            let p2 = points[i + 1];

            let dx = p2.x - p1.x;
            let dy = p2.y - p1.y;
            let len = (dx * dx + dy * dy).sqrt();
            if len <= 1e-6 {
                continue;
            }

            let nx = -dy / len * half_width;
            let ny = dx / len * half_width;

            let base_idx = vertices.len() as u32;

            vertices.push(Point2D::new(p1.x + nx, p1.y + ny));
            vertices.push(Point2D::new(p1.x - nx, p1.y - ny));
            vertices.push(Point2D::new(p2.x + nx, p2.y + ny));
            vertices.push(Point2D::new(p2.x - nx, p2.y - ny));

            indices.push([base_idx, base_idx + 1, base_idx + 2]);
            indices.push([base_idx + 1, base_idx + 3, base_idx + 2]);
        }

        (vertices, indices)
    }
}
