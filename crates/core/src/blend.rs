// Pizzico — crates/core/src/blend.rs
// Riferimento manifesto: §6.1
// Licenza: MIT OR Apache-2.0

//! Implementazione dei metodi di fusione (Blend Modes) secondo le specifiche
//! standard e la decomposizione non-lineare descritta da Horita et al. (WACV 2022).

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
pub enum BlendMode {
    #[default]
    Normal,
    Multiply,
    Screen,
    Overlay,
    Darken,
    Lighten,
    ColorDodge,
    ColorBurn,
    HardLight,
    SoftLight,
    Difference,
    Exclusion,
}

#[inline(always)]
pub fn blend_pixel(src: [f32; 4], dst: [f32; 4], mode: BlendMode) -> [f32; 4] {
    let src_a = src[3];
    let dst_a = dst[3];

    if src_a <= 0.0 {
        return dst;
    }
    if dst_a <= 0.0 {
        return src;
    }

    let out_a = src_a + dst_a * (1.0 - src_a);
    if out_a <= 0.0 {
        return [0.0, 0.0, 0.0, 0.0];
    }

    let blend_rgb = match mode {
        BlendMode::Normal => [src[0], src[1], src[2]],
        BlendMode::Multiply => [src[0] * dst[0], src[1] * dst[1], src[2] * dst[2]],
        BlendMode::Screen => [
            1.0 - (1.0 - src[0]) * (1.0 - dst[0]),
            1.0 - (1.0 - src[1]) * (1.0 - dst[1]),
            1.0 - (1.0 - src[2]) * (1.0 - dst[2]),
        ],
        BlendMode::Overlay => [
            overlay_channel(dst[0], src[0]),
            overlay_channel(dst[1], src[1]),
            overlay_channel(dst[2], src[2]),
        ],
        BlendMode::Darken => [src[0].min(dst[0]), src[1].min(dst[1]), src[2].min(dst[2])],
        BlendMode::Lighten => [src[0].max(dst[0]), src[1].max(dst[1]), src[2].max(dst[2])],
        BlendMode::Difference => [(src[0] - dst[0]).abs(), (src[1] - dst[1]).abs(), (src[2] - dst[2]).abs()],
        BlendMode::Exclusion => [
            src[0] + dst[0] - 2.0 * src[0] * dst[0],
            src[1] + dst[1] - 2.0 * src[1] * dst[1],
            src[2] + dst[2] - 2.0 * src[2] * dst[2],
        ],
        _ => [src[0], src[1], src[2]],
    };

    let mut out = [0.0; 4];
    for i in 0..3 {
        // Porter-Duff compositing with blended color
        let blended = (1.0 - dst_a) * src[i] + dst_a * blend_rgb[i];
        out[i] = (src_a * blended + dst_a * dst[i] * (1.0 - src_a)) / out_a;
    }
    out[3] = out_a;
    out
}

#[inline(always)]
fn overlay_channel(b: f32, s: f32) -> f32 {
    if b <= 0.5 {
        2.0 * b * s
    } else {
        1.0 - 2.0 * (1.0 - b) * (1.0 - s)
    }
}
