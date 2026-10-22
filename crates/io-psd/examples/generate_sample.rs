// Pizzico — crates/io-psd/examples/generate_sample.rs
// Riferimento manifesto: §6.5
// Licenza: MIT OR Apache-2.0

//! Esempio e utility per la generazione del file reale di test `tests/psd-corpus/sample-01.psd`.

use pizzico_core::BlendMode;
use pizzico_io_psd::{generate_synthetic_psd, SyntheticLayer};
use std::fs;
use std::path::Path;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🍕 Pizzico — Generazione file di test PSD per corpus...");

    let width = 800;
    let height = 600;

    // Livello 1: Sfondo bianco opaco (800x600)
    let bg_rgba = vec![255, 255, 255, 255].repeat(800 * 600);
    let layer_bg = SyntheticLayer {
        name: "Sfondo".to_string(),
        top: 0,
        left: 0,
        width: 800,
        height: 600,
        opacity: 255,
        visible: true,
        blend_mode: BlendMode::Normal,
        rgba: bg_rgba,
    };

    // Livello 2: Rettangolo rosso opaco (400x300, offset top: 50, left: 50)
    let red_rgba = vec![255, 0, 0, 255].repeat(400 * 300);
    let layer_red = SyntheticLayer {
        name: "Layer Rosso".to_string(),
        top: 50,
        left: 50,
        width: 400,
        height: 300,
        opacity: 255,
        visible: true,
        blend_mode: BlendMode::Normal,
        rgba: red_rgba,
    };

    // Livello 3: Rettangolo blu al 50% di trasparenza (400x300, offset top: 150, left: 150)
    let blue_rgba = vec![0, 0, 255, 128].repeat(400 * 300);
    let layer_blue = SyntheticLayer {
        name: "Layer Blu Trasparente".to_string(),
        top: 150,
        left: 150,
        width: 400,
        height: 300,
        opacity: 128,
        visible: true,
        blend_mode: BlendMode::Multiply,
        rgba: blue_rgba,
    };

    let psd_bytes = generate_synthetic_psd(width, height, &[layer_bg, layer_red, layer_blue])?;

    let out_dir = Path::new("tests/psd-corpus");
    fs::create_dir_all(out_dir)?;

    let out_path = out_dir.join("sample-01.psd");
    fs::write(&out_path, &psd_bytes)?;

    println!(
        "✅ File generato con successo: {} ({} bytes, {}x{}, 3 livelli)",
        out_path.display(),
        psd_bytes.len(),
        width,
        height
    );

    Ok(())
}
