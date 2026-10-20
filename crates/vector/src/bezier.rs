// Pizzico — crates/vector/src/bezier.rs
// Riferimento manifesto: §6.2
// Licenza: MIT OR Apache-2.0

//! Curve Bézier cubiche parametriche:
//! B(t) = (1−t)³P0 + 3(1−t)²tP1 + 3(1−t)t²P2 + t³P3
//! secondo Lyche & Merrien (2014).

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Point2D {
    pub x: f32,
    pub y: f32,
}

impl Point2D {
    pub fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CubicBezier {
    pub p0: Point2D,
    pub p1: Point2D,
    pub p2: Point2D,
    pub p3: Point2D,
}

impl CubicBezier {
    pub fn new(p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D) -> Self {
        Self { p0, p1, p2, p3 }
    }

    /// Valuta la curva al parametro t ∈ [0, 1] con l'algoritmo di de Casteljau
    pub fn evaluate(&self, t: f32) -> Point2D {
        let u = 1.0 - t;
        let tt = t * t;
        let uu = u * u;
        let uuu = uu * u;
        let ttt = tt * t;

        let x = uuu * self.p0.x + 3.0 * uu * t * self.p1.x + 3.0 * u * tt * self.p2.x + ttt * self.p3.x;
        let y = uuu * self.p0.y + 3.0 * uu * t * self.p1.y + 3.0 * u * tt * self.p2.y + ttt * self.p3.y;

        Point2D::new(x, y)
    }

    /// Calcola la derivata prima B'(t) per ottenere il vettore tangente
    pub fn derivative(&self, t: f32) -> Point2D {
        let u = 1.0 - t;
        let dx = 3.0 * u * u * (self.p1.x - self.p0.x)
            + 6.0 * u * t * (self.p2.x - self.p1.x)
            + 3.0 * t * t * (self.p3.x - self.p2.x);
        let dy = 3.0 * u * u * (self.p1.y - self.p0.y)
            + 6.0 * u * t * (self.p2.y - self.p1.y)
            + 3.0 * t * t * (self.p3.y - self.p2.y);
        Point2D::new(dx, dy)
    }
}
