// Pizzico — crates/color/src/icc.rs
// Adapted from LightCraft (MIT OR Apache-2.0)
// Scientific references: ICC.1:2010 (Profile version 4.3.0.0), moxcms Pure-Rust CMS

use crate::mat::{bradford, Mat3, D50};
use crate::spaces::{RgbSpace, ADOBE_RGB, DISPLAY_P3, PROPHOTO, REC2020, SRGB};
use moxcms::{
    ColorProfile, DataColorSpace, LocalizableString, Matrix3d, ProfileText,
    RenderingIntent, ToneReprCurve, Xyzd,
};
use serde::{Deserialize, Serialize};

/// Well-known RGB spaces recognised from ICC colorants or container tags.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum NamedSpace {
    Srgb,
    DisplayP3,
    AdobeRgb,
    ProPhoto,
    Rec2020,
}

impl NamedSpace {
    pub const ALL: [NamedSpace; 5] = [
        NamedSpace::Srgb,
        NamedSpace::DisplayP3,
        NamedSpace::AdobeRgb,
        NamedSpace::ProPhoto,
        NamedSpace::Rec2020,
    ];

    pub fn rgb_space(self) -> RgbSpace {
        match self {
            NamedSpace::Srgb => SRGB,
            NamedSpace::DisplayP3 => DISPLAY_P3,
            NamedSpace::AdobeRgb => ADOBE_RGB,
            NamedSpace::ProPhoto => PROPHOTO,
            NamedSpace::Rec2020 => REC2020,
        }
    }

    /// The space's standard encoding curve.
    pub fn trc(self) -> Trc {
        match self {
            NamedSpace::Srgb | NamedSpace::DisplayP3 => Trc::Srgb,
            NamedSpace::AdobeRgb => Trc::Gamma(563.0 / 256.0),
            NamedSpace::ProPhoto => Trc::Gamma(1.8),
            NamedSpace::Rec2020 => Trc::Rec709,
        }
    }

    /// Linear RGB → XYZ (D50 PCS, Bradford-adapted), as an ICC matrix/TRC profile stores it.
    pub fn to_xyz_d50(self) -> Mat3 {
        rgb_to_xyz_d50(&self.rgb_space())
    }

    pub fn name(self) -> &'static str {
        self.rgb_space().name
    }

    /// Recognise a space from its D50-adapted colorant matrix.
    pub fn recognize(to_xyz_d50: &Mat3) -> Option<NamedSpace> {
        NamedSpace::ALL.into_iter().find(|n| {
            let m = n.to_xyz_d50();
            (0..3).all(|r| (0..3).all(|c| (m.0[r][c] - to_xyz_d50.0[r][c]).abs() < 0.004))
        })
    }
}

/// Linear RGB → XYZ relative to D50 (Bradford), the ICC PCS.
pub fn rgb_to_xyz_d50(space: &RgbSpace) -> Mat3 {
    bradford(space.white, D50).mul(&space.to_xyz())
}

/// A transfer curve (encoded value → linear light), as found in ICC `curv`/`para` tags.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum Trc {
    Linear,
    Srgb,
    Gamma(f32),
    Rec709,
    Parametric(Vec<f32>),
    Table(Vec<u16>),
}

impl Trc {
    pub fn to_linear(&self, v: f32) -> f32 {
        if v < 0.0 {
            return -self.to_linear(-v);
        }
        match self {
            Trc::Linear => v,
            Trc::Srgb => crate::transfer::srgb_to_linear(v),
            Trc::Gamma(g) => v.powf(*g),
            Trc::Rec709 => {
                if v < 0.081 {
                    v / 4.5
                } else {
                    ((v + 0.099) / 1.099).powf(1.0 / 0.45)
                }
            }
            Trc::Parametric(p) => eval_parametric(p, v),
            Trc::Table(t) => eval_table(t, v),
        }
    }

    pub fn from_linear(&self, v: f32) -> f32 {
        if v < 0.0 {
            return -self.from_linear(-v);
        }
        match self {
            Trc::Linear => v,
            Trc::Srgb => crate::transfer::linear_to_srgb(v),
            Trc::Gamma(g) => {
                if *g > 0.0 {
                    v.powf(1.0 / g)
                } else {
                    v
                }
            }
            Trc::Rec709 => {
                if v < 0.018 {
                    v * 4.5
                } else {
                    1.099 * v.powf(0.45) - 0.099
                }
            }
            Trc::Parametric(_) | Trc::Table(_) => {
                let (mut lo, mut hi) = (0.0f32, 1.0f32);
                while self.to_linear(hi) < v && hi < 1e6 {
                    hi *= 2.0;
                }
                for _ in 0..40 {
                    let mid = 0.5 * (lo + hi);
                    if self.to_linear(mid) < v {
                        lo = mid;
                    } else {
                        hi = mid;
                    }
                }
                0.5 * (lo + hi)
            }
        }
    }

    pub fn is_linear(&self) -> bool {
        match self {
            Trc::Linear => true,
            Trc::Gamma(g) => (*g - 1.0).abs() < 1e-4,
            Trc::Parametric(p) => p.len() == 1 && (p[0] - 1.0).abs() < 1e-4,
            Trc::Table(t) => t.is_empty(),
            _ => false,
        }
    }
}

fn eval_parametric(p: &[f32], x: f32) -> f32 {
    let pw = |b: f32, g: f32| if b > 0.0 { b.powf(g) } else { 0.0 };
    match p.len() {
        1 => pw(x, p[0]),
        3 => {
            let (g, a, b) = (p[0], p[1], p[2]);
            if a != 0.0 && x >= -b / a {
                pw(a * x + b, g)
            } else {
                0.0
            }
        }
        4 => {
            let (g, a, b, c) = (p[0], p[1], p[2], p[3]);
            if a != 0.0 && x >= -b / a {
                pw(a * x + b, g) + c
            } else {
                c
            }
        }
        5 => {
            let (g, a, b, c, d) = (p[0], p[1], p[2], p[3], p[4]);
            if x >= d {
                pw(a * x + b, g)
            } else {
                c * x
            }
        }
        7 => {
            let (g, a, b, c, d, e, f) = (p[0], p[1], p[2], p[3], p[4], p[5], p[6]);
            if x >= d {
                pw(a * x + b, g) + e
            } else {
                c * x + f
            }
        }
        _ => x,
    }
}

fn eval_table(t: &[u16], x: f32) -> f32 {
    match t.len() {
        0 => x,
        1 => x.powf(t[0] as f32 / 256.0),
        n => {
            let pos = x * (n - 1) as f32;
            let i = (pos.floor() as usize).min(n - 2);
            let f = pos - i as f32;
            let a = t[i] as f32 / 65535.0;
            let b = t[i + 1] as f32 / 65535.0;
            a + (b - a) * f
        }
    }
}

/// Colour model of the profile's device space.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum IccColorModel {
    Rgb,
    Gray,
    Cmyk,
    Other,
}

/// How a profile can be applied.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum IccKind {
    /// RGB matrix/TRC (shaper) profile.
    MatrixTrc { to_xyz_d50: Mat3, trc: [Trc; 3] },
    /// Grayscale profile with a `kTRC`.
    Gray { trc: Trc },
    /// LUT-based (A2B), CMYK or needs a full CMS conversion.
    NeedsCms,
}

/// Summary of a parsed ICC profile.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct IccInfo {
    pub model: IccColorModel,
    pub kind: IccKind,
    pub named: Option<NamedSpace>,
    pub description: Option<String>,
}

/// Parse an ICC profile from raw bytes (never panics).
pub fn parse(bytes: &[u8]) -> Option<IccInfo> {
    let p = std::panic::catch_unwind(|| ColorProfile::new_from_slice(bytes)).ok()?.ok()?;
    Some(info_of(&p))
}

fn info_of(p: &ColorProfile) -> IccInfo {
    let description = p.description.as_ref().and_then(text_of);
    let model = match p.color_space {
        DataColorSpace::Rgb => IccColorModel::Rgb,
        DataColorSpace::Gray => IccColorModel::Gray,
        DataColorSpace::Cmyk => IccColorModel::Cmyk,
        _ => IccColorModel::Other,
    };
    let has_lut = p.lut_a_to_b_perceptual.is_some() || p.lut_a_to_b_colorimetric.is_some();
    let kind = if model == IccColorModel::Rgb && p.is_matrix_shaper() && p.pcs == DataColorSpace::Xyz {
        let c = [p.red_colorant, p.green_colorant, p.blue_colorant];
        let to_xyz_d50 = Mat3([
            [c[0].x, c[1].x, c[2].x],
            [c[0].y, c[1].y, c[2].y],
            [c[0].z, c[1].z, c[2].z],
        ]);
        let trcs = [&p.red_trc, &p.green_trc, &p.blue_trc];
        let trc = trcs.map(|t| t.as_ref().map(trc_from_icc).unwrap_or(Trc::Srgb));
        if to_xyz_d50.determinant().abs() > 1e-6 && trc.iter().all(valid_trc) {
            IccKind::MatrixTrc { to_xyz_d50, trc }
        } else {
            IccKind::NeedsCms
        }
    } else if model == IccColorModel::Gray && p.gray_trc.is_some() && !has_lut {
        let trc = p.gray_trc.as_ref().map(trc_from_icc).unwrap_or(Trc::Srgb);
        if valid_trc(&trc) {
            IccKind::Gray { trc }
        } else {
            IccKind::NeedsCms
        }
    } else {
        IccKind::NeedsCms
    };
    let named = match &kind {
        IccKind::MatrixTrc { to_xyz_d50, .. } => NamedSpace::recognize(to_xyz_d50),
        _ => None,
    };
    IccInfo {
        model,
        kind,
        named,
        description,
    }
}

fn valid_trc(t: &Trc) -> bool {
    match t {
        Trc::Parametric(p) => matches!(p.len(), 1 | 3 | 4 | 5 | 7) && p.iter().all(|v| v.is_finite()),
        Trc::Gamma(g) => g.is_finite() && *g > 0.0,
        _ => true,
    }
}

fn text_of(t: &ProfileText) -> Option<String> {
    let s = match t {
        ProfileText::PlainString(s) => s.clone(),
        ProfileText::Localizable(v) => v.first().map(|l| l.value.clone())?,
        ProfileText::Description(d) => {
            if d.unicode_string.is_empty() {
                d.ascii_string.clone()
            } else {
                d.unicode_string.clone()
            }
        }
    };
    let s = s.trim_end_matches('\0').trim().to_string();
    if s.is_empty() {
        None
    } else {
        Some(s)
    }
}

fn trc_from_icc(t: &ToneReprCurve) -> Trc {
    match t {
        ToneReprCurve::Lut(v) if v.is_empty() => Trc::Linear,
        ToneReprCurve::Lut(v) if v.len() == 1 => Trc::Gamma(v[0] as f32 / 256.0),
        ToneReprCurve::Lut(v) => Trc::Table(v.clone()),
        ToneReprCurve::Parametric(p) => Trc::Parametric(p.clone()),
    }
}

fn trc_to_icc(t: &Trc) -> ToneReprCurve {
    match t {
        Trc::Linear => ToneReprCurve::Parametric(vec![1.0]),
        Trc::Srgb => ToneReprCurve::Parametric(vec![
            2.4,
            1.0 / 1.055,
            0.055 / 1.055,
            1.0 / 12.92,
            0.04045,
        ]),
        Trc::Gamma(g) => ToneReprCurve::Parametric(vec![*g]),
        Trc::Rec709 => ToneReprCurve::Parametric(vec![
            1.0 / 0.45,
            1.0 / 1.099,
            0.099 / 1.099,
            1.0 / 4.5,
            0.081,
        ]),
        Trc::Parametric(p) => ToneReprCurve::Parametric(p.clone()),
        Trc::Table(v) => ToneReprCurve::Lut(v.clone()),
    }
}

fn xyzd(v: [f64; 3]) -> Xyzd {
    Xyzd {
        x: v[0],
        y: v[1],
        z: v[2],
    }
}

const ICC_D50: [f64; 3] = [0.9642, 1.0, 0.8249];

/// Build an ICC v4 display-class matrix/TRC profile for `space` with the given encoding curve.
pub fn write_matrix_trc(space: &RgbSpace, trc: &Trc) -> Vec<u8> {
    let m = rgb_to_xyz_d50(space).0;
    let mut p = ColorProfile::new_srgb();
    p.cicp = None;
    p.red_colorant = xyzd([m[0][0], m[1][0], m[2][0]]);
    p.green_colorant = xyzd([m[0][1], m[1][1], m[2][1]]);
    p.blue_colorant = xyzd([m[0][2], m[1][2], m[2][2]]);
    let curve = trc_to_icc(trc);
    p.red_trc = Some(curve.clone());
    p.green_trc = Some(curve.clone());
    p.blue_trc = Some(curve);
    p.white_point = xyzd(ICC_D50);
    p.media_white_point = Some(xyzd(ICC_D50));
    p.chromatic_adaptation = Some(Matrix3d {
        v: bradford(space.white, D50).0,
    });
    p.rendering_intent = RenderingIntent::Perceptual;
    let desc = match trc {
        t if t.is_linear() => format!("{} (linear)", space.name),
        _ => space.name.to_string(),
    };
    p.description = Some(ProfileText::Localizable(vec![LocalizableString::new(
        "en".into(),
        "US".into(),
        desc,
    )]));
    p.copyright = Some(ProfileText::Localizable(vec![LocalizableString::new(
        "en".into(),
        "US".into(),
        "No copyright, use freely".into(),
    )]));
    align_tags(&fixed_date(p.encode().unwrap_or_default()))
}

fn fixed_date(mut b: Vec<u8>) -> Vec<u8> {
    if let Some(date) = b.get_mut(24..36) {
        date.fill(0);
    }
    b
}

fn align_tags(b: &[u8]) -> Vec<u8> {
    let be = |i: usize| {
        b.get(i..i + 4)
            .map(|s| u32::from_be_bytes([s[0], s[1], s[2], s[3]]) as usize)
    };
    let Some(n) = be(128) else { return b.to_vec() };
    let table_end = 132 + 12 * n;
    let tags: Option<Vec<(usize, usize)>> = (0..n)
        .map(|t| Some((be(132 + 12 * t + 4)?, be(132 + 12 * t + 8)?)))
        .collect();
    let Some(tags) = tags.filter(|t| {
        table_end <= b.len() && t.iter().all(|&(o, l)| o >= table_end && o + l <= b.len())
    }) else {
        return b.to_vec();
    };
    let mut out = b[..table_end].to_vec();
    let mut placed: Vec<((usize, usize), usize)> = Vec::new();
    for (t, &(off, len)) in tags.iter().enumerate() {
        let new_off = match placed.iter().find(|(k, _)| *k == (off, len)) {
            Some(&(_, o)) => o,
            None => {
                while out.len() % 4 != 0 {
                    out.push(0);
                }
                let o = out.len();
                out.extend_from_slice(&b[off..off + len]);
                placed.push(((off, len), o));
                o
            }
        };
        out[132 + 12 * t + 4..132 + 12 * t + 8]
            .copy_from_slice(&(new_off as u32).to_be_bytes());
    }
    while out.len() % 4 != 0 {
        out.push(0);
    }
    let size = out.len() as u32;
    out[0..4].copy_from_slice(&size.to_be_bytes());
    out[84..100].fill(0);
    out
}

pub fn write_named(n: NamedSpace) -> Vec<u8> {
    write_matrix_trc(&n.rgb_space(), &n.trc())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn write_and_parse_named_spaces() {
        for sp in NamedSpace::ALL {
            let bytes = write_named(sp);
            assert!(!bytes.is_empty(), "Failed to write profile for {:?}", sp);
            let info = parse(&bytes).expect("Failed to parse generated profile");
            assert_eq!(info.model, IccColorModel::Rgb);
            assert_eq!(info.named, Some(sp), "Profile failed recognition for {:?}", sp);
        }
    }
}
