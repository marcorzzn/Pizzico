// Pizzico — crates/color/src/spaces.rs
// Adapted from LightCraft (MIT OR Apache-2.0)
// Scientific references: CIE 1931 xyY / ITU-R BT.709 / ITU-R BT.2020 / DCI-P3

use crate::mat::{bradford, Mat3, D50, D65, Xy};
use serde::{Deserialize, Serialize};

/// Enumeration of primary supported color spaces in Pizzico.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum ColorSpace {
    #[default]
    Srgb,
    DisplayP3,
    LinearRgb,
    AdobeRgb,
    Rec2020,
    ProPhoto,
}

/// An RGB colour space: primaries and white point.
#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct RgbSpace {
    pub name: &'static str,
    pub r: Xy,
    pub g: Xy,
    pub b: Xy,
    pub white: Xy,
}

pub const SRGB: RgbSpace = RgbSpace {
    name: "sRGB",
    r: Xy::new(0.64, 0.33),
    g: Xy::new(0.30, 0.60),
    b: Xy::new(0.15, 0.06),
    white: D65,
};

pub const DISPLAY_P3: RgbSpace = RgbSpace {
    name: "Display P3",
    r: Xy::new(0.680, 0.320),
    g: Xy::new(0.265, 0.690),
    b: Xy::new(0.150, 0.060),
    white: D65,
};

pub const REC2020: RgbSpace = RgbSpace {
    name: "Rec.2020",
    r: Xy::new(0.708, 0.292),
    g: Xy::new(0.170, 0.797),
    b: Xy::new(0.131, 0.046),
    white: D65,
};

pub const PROPHOTO: RgbSpace = RgbSpace {
    name: "ProPhoto RGB",
    r: Xy::new(0.734699, 0.265301),
    g: Xy::new(0.159597, 0.840403),
    b: Xy::new(0.036598, 0.000105),
    white: D50,
};

pub const ADOBE_RGB: RgbSpace = RgbSpace {
    name: "Adobe RGB (1998)",
    r: Xy::new(0.64, 0.33),
    g: Xy::new(0.21, 0.71),
    b: Xy::new(0.15, 0.06),
    white: D65,
};

/// The internal working space for high-precision operations: Linear Rec.2020 / D65.
pub const WORKING: RgbSpace = REC2020;

impl RgbSpace {
    /// Matrix taking linear RGB in this space to XYZ (white Y = 1) relative to its own white.
    pub fn to_xyz(&self) -> Mat3 {
        let p = [self.r.to_xyz(), self.g.to_xyz(), self.b.to_xyz()];
        let m = Mat3([
            [p[0][0], p[1][0], p[2][0]],
            [p[0][1], p[1][1], p[2][1]],
            [p[0][2], p[1][2], p[2][2]],
        ]);
        let s = m.inverse().map_or([1.0; 3], |inv| inv.apply(self.white.to_xyz()));
        m.mul(&Mat3::diag(s[0], s[1], s[2]))
    }

    /// Inverse of `to_xyz`.
    pub fn from_xyz(&self) -> Mat3 {
        self.to_xyz().inverse().unwrap_or(Mat3::IDENTITY)
    }

    /// Luminance weights (the Y row of `to_xyz`).
    pub fn luma(&self) -> [f64; 3] {
        self.to_xyz().0[1]
    }

    /// Linear RGB in `self` → linear RGB in `dst`, Bradford-adapting between white points.
    pub fn to_space(&self, dst: &RgbSpace) -> Mat3 {
        let adapt = bradford(self.white, dst.white);
        dst.from_xyz().mul(&adapt).mul(&self.to_xyz())
    }
}

pub fn srgb_to_linear(c: f32) -> f32 {
    if c <= 0.04045 {
        c / 12.92
    } else {
        ((c + 0.055) / 1.055).powf(2.4)
    }
}

pub fn linear_to_srgb(c: f32) -> f32 {
    if c <= 0.0031308 {
        c * 12.92
    } else {
        1.055 * c.powf(1.0 / 2.4) - 0.055
    }
}

/// Convert an RGB color triplet between color spaces.
pub fn convert_color(color: [f32; 3], from: ColorSpace, to: ColorSpace) -> [f32; 3] {
    if from == to {
        return color;
    }

    // Step 1: Linearize source
    let lin_src = match from {
        ColorSpace::Srgb => [
            srgb_to_linear(color[0]),
            srgb_to_linear(color[1]),
            srgb_to_linear(color[2]),
        ],
        ColorSpace::DisplayP3 => [
            srgb_to_linear(color[0]), // Display P3 uses sRGB transfer curve
            srgb_to_linear(color[1]),
            srgb_to_linear(color[2]),
        ],
        ColorSpace::AdobeRgb => [
            color[0].max(0.0).powf(2.19921875),
            color[1].max(0.0).powf(2.19921875),
            color[2].max(0.0).powf(2.19921875),
        ],
        ColorSpace::LinearRgb | ColorSpace::Rec2020 | ColorSpace::ProPhoto => color,
    };

    // Step 2: Chromatic matrix conversion between linear spaces
    let src_space = space_of(from);
    let dst_space = space_of(to);
    let lin_dst = if let (Some(s), Some(d)) = (src_space, dst_space) {
        let m = s.to_space(&d);
        m.apply_f32(lin_src)
    } else {
        lin_src
    };

    // Step 3: Delinearize / apply destination transfer curve
    match to {
        ColorSpace::Srgb | ColorSpace::DisplayP3 => [
            linear_to_srgb(lin_dst[0]),
            linear_to_srgb(lin_dst[1]),
            linear_to_srgb(lin_dst[2]),
        ],
        ColorSpace::AdobeRgb => [
            lin_dst[0].max(0.0).powf(1.0 / 2.19921875),
            lin_dst[1].max(0.0).powf(1.0 / 2.19921875),
            lin_dst[2].max(0.0).powf(1.0 / 2.19921875),
        ],
        ColorSpace::LinearRgb | ColorSpace::Rec2020 | ColorSpace::ProPhoto => lin_dst,
    }
}

fn space_of(cs: ColorSpace) -> Option<RgbSpace> {
    match cs {
        ColorSpace::Srgb | ColorSpace::LinearRgb => Some(SRGB),
        ColorSpace::DisplayP3 => Some(DISPLAY_P3),
        ColorSpace::AdobeRgb => Some(ADOBE_RGB),
        ColorSpace::Rec2020 => Some(REC2020),
        ColorSpace::ProPhoto => Some(PROPHOTO),
    }
}
