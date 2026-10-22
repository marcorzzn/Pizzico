// Pizzico — crates/io-svg/src/lib.rs
// Riferimento manifesto: §3.1, §4
// Licenza: MIT OR Apache-2.0

//! # Pizzico SVG I/O
//!
//! Generazione ed esportazione di codice SVG vettoriale conforme agli standard W3C.

use pizzico_core::Document;

pub fn export_svg(doc: &Document) -> String {
    let mut svg = format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" width="{}" height="{}" viewBox="0 0 {} {}">"#,
        doc.width, doc.height, doc.width, doc.height
    );

    for layer in &doc.layers {
        if !layer.visible {
            continue;
        }
        if let pizzico_core::LayerKind::Vector { ref paths } = layer.kind {
            for path_data in paths {
                svg.push_str(&format!(
                    r#"<path d="{}" opacity="{}" />"#,
                    path_data, layer.opacity
                ));
            }
        }
    }

    svg.push_str("</svg>");
    svg
}
