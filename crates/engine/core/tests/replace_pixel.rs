//! Test di `ReplacePixelCommand`: la primitive che permette al backend v2 di
//! registrare un tratto del pennello come **un solo** comando annullabile.

use pizzico_engine_core::{Document, Layer, ReplacePixelCommand};

fn pixel(l: &Layer, x: u32, y: u32) -> [u8; 4] {
    let o = ((y * l.width + x) * 4) as usize;
    [
        l.pixels[o],
        l.pixels[o + 1],
        l.pixels[o + 2],
        l.pixels[o + 3],
    ]
}

#[test]
fn sostituisce_il_rettangolo_e_l_undo_ripristina() {
    let mut doc = Document::new(10, 10);
    let id = doc.add_layer(Layer::transparent("prova", 10, 10));

    // 4x4 pixel rossi da scrivere nella bbox (2,2,4,4)
    let after: Vec<u8> = [255, 0, 0, 255].repeat(4 * 4);
    let before = vec![0u8; after.len()];

    doc.execute(Box::new(ReplacePixelCommand::new(
        id,
        Some((2, 2, 4, 4)),
        before,
        after,
    )));

    let l = doc.layer(id).expect("layer");
    assert_eq!(pixel(l, 2, 2), [255, 0, 0, 255], "angolo alto-sinistro");
    assert_eq!(pixel(l, 5, 5), [255, 0, 0, 255], "angolo basso-destro");
    assert_eq!(pixel(l, 1, 1), [0, 0, 0, 0], "fuori dalla bbox");
    assert_eq!(pixel(l, 6, 5), [0, 0, 0, 0], "fuori dalla bbox a destra");

    assert!(doc.undo());
    let l = doc.layer(id).expect("layer");
    assert!(
        l.pixels.iter().all(|b| *b == 0),
        "l'undo deve riportare tutto trasparente"
    );
}

#[test]
fn con_bbox_none_sostituisce_tutto_il_layer() {
    let mut doc = Document::new(4, 4);
    let id = doc.add_layer(Layer::transparent("pieno", 4, 4));

    let after: Vec<u8> = [10, 20, 30, 255].repeat(4 * 4);
    let before = vec![0u8; after.len()];

    doc.execute(Box::new(ReplacePixelCommand::new(id, None, before, after)));

    let l = doc.layer(id).expect("layer");
    assert_eq!(pixel(l, 0, 0), [10, 20, 30, 255]);
    assert_eq!(pixel(l, 3, 3), [10, 20, 30, 255]);

    assert!(doc.undo());
    let l = doc.layer(id).expect("layer");
    assert!(l.pixels.iter().all(|b| *b == 0));
}

#[test]
fn dopo_undo_il_redo_riapplica() {
    let mut doc = Document::new(6, 6);
    let id = doc.add_layer(Layer::transparent("r", 6, 6));
    let after: Vec<u8> = [9, 9, 9, 255].repeat(2 * 2);
    let before = vec![0u8; after.len()];

    doc.execute(Box::new(ReplacePixelCommand::new(
        id,
        Some((1, 1, 2, 2)),
        before,
        after,
    )));
    assert!(doc.undo());
    assert!(doc.redo());
    let l = doc.layer(id).expect("layer");
    assert_eq!(pixel(l, 1, 1), [9, 9, 9, 255]);
}
