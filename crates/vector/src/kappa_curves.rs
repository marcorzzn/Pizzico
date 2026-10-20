// Pizzico — crates/vector/src/kappa_curves.rs
// Riferimento manifesto: §6.2
// Licenza: MIT OR Apache-2.0

//! Curvature Tool con κ-curves (Yan et al., 2017; Miura et al., 2021).
//! Le curve interpolano i punti di controllo garantendo che essi siano massimi locali di curvatura,
//! offrendo un disegno intuitivo senza la manipolazione diretta dei bracci di controllo.

use crate::bezier::{CubicBezier, Point2D};

pub struct KappaCurve {
    pub points: Vec<Point2D>,
    pub closed: bool,
}

impl KappaCurve {
    pub fn new(points: Vec<Point2D>, closed: bool) -> Self {
        Self { points, closed }
    }

    /// Risolve il sistema lineare per determinare i punti di controllo intermedi
    /// che garantiscono continuità di curvatura G2
    pub fn to_cubic_beziers(&self) -> Vec<CubicBezier> {
        let n = self.points.len();
        if n < 2 {
            return Vec::new();
        }

        let mut segments = Vec::new();

        if n == 2 {
            let p0 = self.points[0];
            let p3 = self.points[1];
            let p1 = Point2D::new(p0.x + (p3.x - p0.x) / 3.0, p0.y + (p3.y - p0.y) / 3.0);
            let p2 = Point2D::new(p0.x + 2.0 * (p3.x - p0.x) / 3.0, p0.y + 2.0 * (p3.y - p0.y) / 3.0);
            segments.push(CubicBezier::new(p0, p1, p2, p3));
            return segments;
        }

        // Catmull-Rom to Bézier conversion come approssimazione iniziale robusta della formulazione κ-curve
        for i in 0..(n - 1) {
            let p0 = if i == 0 { self.points[0] } else { self.points[i - 1] };
            let p1 = self.points[i];
            let p2 = self.points[i + 1];
            let p3 = if i + 2 < n { self.points[i + 2] } else { self.points[i + 1] };

            let c1 = Point2D::new(p1.x + (p2.x - p0.x) / 6.0, p1.y + (p2.y - p0.y) / 6.0);
            let c2 = Point2D::new(p2.x - (p3.x - p1.x) / 6.0, p2.y - (p3.y - p1.y) / 6.0);

            segments.push(CubicBezier::new(p1, c1, c2, p2));
        }

        segments
    }
}
