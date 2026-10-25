// Pizzico — crates/color/src/mat.rs
// Adapted from LightCraft (MIT OR Apache-2.0)
// Scientific references: Bradford chromatic adaptation (CIECAM97s / ICC spec)

use serde::{Deserialize, Serialize};

/// Row-major 3×3 matrix for color transformations.
#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct Mat3(pub [[f64; 3]; 3]);

impl Mat3 {
    pub const IDENTITY: Mat3 = Mat3([[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]]);

    pub fn diag(a: f64, b: f64, c: f64) -> Mat3 {
        Mat3([[a, 0.0, 0.0], [0.0, b, 0.0], [0.0, 0.0, c]])
    }

    pub fn mul(&self, o: &Mat3) -> Mat3 {
        let mut r = [[0.0; 3]; 3];
        for i in 0..3 {
            for j in 0..3 {
                r[i][j] = (0..3).map(|k| self.0[i][k] * o.0[k][j]).sum();
            }
        }
        Mat3(r)
    }

    pub fn apply(&self, v: [f64; 3]) -> [f64; 3] {
        let m = &self.0;
        [
            m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
            m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
            m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
        ]
    }

    pub fn apply_f32(&self, v: [f32; 3]) -> [f32; 3] {
        let r = self.apply([v[0] as f64, v[1] as f64, v[2] as f64]);
        [r[0] as f32, r[1] as f32, r[2] as f32]
    }

    pub fn determinant(&self) -> f64 {
        let m = &self.0;
        m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
            - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
            + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
    }

    pub fn inverse(&self) -> Option<Mat3> {
        let d = self.determinant();
        if d.abs() < 1e-300 {
            return None;
        }
        let m = &self.0;
        let i = 1.0 / d;
        Some(Mat3([
            [
                (m[1][1] * m[2][2] - m[1][2] * m[2][1]) * i,
                (m[0][2] * m[2][1] - m[0][1] * m[2][2]) * i,
                (m[0][1] * m[1][2] - m[0][2] * m[1][1]) * i,
            ],
            [
                (m[1][2] * m[2][0] - m[1][0] * m[2][2]) * i,
                (m[0][0] * m[2][2] - m[0][2] * m[2][0]) * i,
                (m[0][2] * m[1][0] - m[0][0] * m[1][2]) * i,
            ],
            [
                (m[1][0] * m[2][1] - m[1][1] * m[2][0]) * i,
                (m[0][1] * m[2][0] - m[0][0] * m[2][1]) * i,
                (m[0][0] * m[1][1] - m[0][1] * m[1][0]) * i,
            ],
        ]))
    }

    pub fn transpose(&self) -> Mat3 {
        let m = &self.0;
        Mat3([
            [m[0][0], m[1][0], m[2][0]],
            [m[0][1], m[1][1], m[2][1]],
            [m[0][2], m[1][2], m[2][2]],
        ])
    }

    /// As f32 (row-major), for WebGPU shader uniforms and kernels.
    pub fn to_f32(&self) -> [[f32; 3]; 3] {
        self.0.map(|r| r.map(|v| v as f32))
    }
}

/// CIE xy chromaticity coordinate.
#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct Xy {
    pub x: f64,
    pub y: f64,
}

impl Xy {
    pub const fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }

    /// XYZ with Y = 1.
    pub fn to_xyz(self) -> [f64; 3] {
        [self.x / self.y, 1.0, (1.0 - self.x - self.y) / self.y]
    }

    pub fn from_xyz(v: [f64; 3]) -> Xy {
        let s = v[0] + v[1] + v[2];
        if s <= 0.0 {
            D65
        } else {
            Xy::new(v[0] / s, v[1] / s)
        }
    }
}

pub const D65: Xy = Xy::new(0.3127, 0.3290);
pub const D50: Xy = Xy::new(0.3457, 0.3585);

/// The Bradford cone-response matrix (XYZ → sharpened cones).
pub const BRADFORD: Mat3 = Mat3([
    [0.8951, 0.2664, -0.1614],
    [-0.7502, 1.7135, 0.0367],
    [0.0389, -0.0685, 1.0296],
]);

/// Bradford chromatic adaptation matrix (XYZ → XYZ) from white `src` to white `dst`.
pub fn bradford(src: Xy, dst: Xy) -> Mat3 {
    if src == dst {
        return Mat3::IDENTITY;
    }
    let s = BRADFORD.apply(src.to_xyz());
    let d = BRADFORD.apply(dst.to_xyz());
    let Some(inv) = BRADFORD.inverse() else {
        return Mat3::IDENTITY;
    };
    inv.mul(&Mat3::diag(d[0] / s[0], d[1] / s[1], d[2] / s[2]))
        .mul(&BRADFORD)
}
