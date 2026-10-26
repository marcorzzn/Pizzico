//! Test delle due primitive aggiunte per il backend v2: gomma e clipping.
//!
//! Sono le funzioni che mancavano a `engine-draw` per avere parità **funzionale**
//! col motore legacy (`pizzico-raster`), che le ha da sempre in
//! `eraser_stroke_clipped`.

use pizzico_engine_draw::{Brush, Point, Stroke};

fn tratto(x0: f32, y0: f32, x1: f32, y1: f32) -> Stroke {
    let brush = Brush::new(10.0)
        .hardness(1.0)
        .color([255, 0, 0])
        .opacity(1.0);
    Stroke::with_points(brush, vec![Point::new(x0, y0), Point::new(x1, y1)])
}

fn alpha(dst: &[u8], x: u32, y: u32, w: u32) -> u8 {
    dst[(((y * w) + x) * 4 + 3) as usize]
}

#[test]
fn la_gomma_riduce_l_alpha_e_lascia_il_resto_intatto() {
    // Buffer 32x32 di rosso pieno.
    let mut dst = vec![255u8, 0, 0, 255].repeat(32 * 32);
    let stroke = tratto(14.0, 16.0, 18.0, 16.0);

    let toccati = stroke.render_eraser_over(&mut dst, 32, 32);
    assert!(toccati > 0, "la gomma deve toccare almeno un pixel");

    let centro = alpha(&dst, 16, 16, 32);
    assert!(centro < 255, "alpha al centro deve calare, è {centro}");
    assert_eq!(alpha(&dst, 0, 0, 32), 255, "angolo intatto");
    // Il colore non viene toccato: la gomma agisce solo sull'alpha.
    assert_eq!(dst[0], 255, "canale R dell'angolo invariato");
}

#[test]
fn il_clipping_lascia_intatto_cio_che_sta_fuori() {
    let mut dst = vec![0u8; 32 * 32 * 4];
    let stroke = tratto(10.0, 16.0, 22.0, 16.0);

    let painted = stroke.render_clipped_over(&mut dst, 32, 32, (14, 14, 4, 4));
    assert!(painted > 0, "dentro il clip qualcosa deve essere dipinto");

    for y in 0..32u32 {
        for x in 0..32u32 {
            let dentro = (14..18).contains(&x) && (14..18).contains(&y);
            let a = alpha(&dst, x, y, 32);
            if !dentro {
                assert_eq!(a, 0, "pixel ({x},{y}) fuori dal clip deve restare vuoto");
            }
        }
    }
    assert!(
        alpha(&dst, 15, 15, 32) > 0,
        "il pixel dentro il clip deve essere dipinto"
    );
}

#[test]
fn il_clip_fuori_canvas_non_manda_in_panico() {
    let mut dst = vec![0u8; 8 * 8 * 4];
    let stroke = tratto(2.0, 2.0, 6.0, 6.0);
    // Clip che sborda oltre il canvas: deve essere tagliato, non panicare.
    let painted = stroke.render_clipped_over(&mut dst, 8, 8, (6, 6, 100, 100));
    assert!(painted <= 8 * 8);
}
