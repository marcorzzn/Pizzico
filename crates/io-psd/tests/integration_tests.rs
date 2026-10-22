// Pizzico — crates/io-psd/tests/integration_tests.rs
// Riferimento manifesto: §2, §6.5, §11 Step 7
// Licenza: MIT OR Apache-2.0

use pizzico_core::BlendMode;
use pizzico_io_psd::{
    decompress_packbits, generate_synthetic_psd, import_psd, parse_psd_detailed, PsdColorMode,
    PsdHeader, SyntheticLayer,
};
use std::fs;
use std::io::Cursor;
use std::path::Path;

#[test]
fn test_parse_header() {
    let mut buf = Vec::new();
    buf.extend_from_slice(b"8BPS");
    buf.extend_from_slice(&1u16.to_be_bytes()); // Versione 1 (PSD)
    buf.extend_from_slice(&[0u8; 6]); // Riservati
    buf.extend_from_slice(&3u16.to_be_bytes()); // 3 canali
    buf.extend_from_slice(&600u32.to_be_bytes()); // Altezza 600
    buf.extend_from_slice(&800u32.to_be_bytes()); // Larghezza 800
    buf.extend_from_slice(&8u16.to_be_bytes()); // 8-bit
    buf.extend_from_slice(&3u16.to_be_bytes()); // RGB

    let mut cursor = Cursor::new(&buf);
    let header = PsdHeader::parse(&mut cursor).expect("Header valido");

    assert_eq!(header.version, 1);
    assert_eq!(header.channels, 3);
    assert_eq!(header.height, 600);
    assert_eq!(header.width, 800);
    assert_eq!(header.depth, 8);
    assert_eq!(header.color_mode, PsdColorMode::Rgb);
}

#[test]
fn test_decompress_rle() {
    // Sequenza RLE PackBits nota:
    // 0x03 -> copia letterale di 4 byte [10, 20, 30, 40]
    // 0xFD -> -3 in i8 -> (1 - (-3)) = 4 ripetizioni del byte 99
    let input = vec![0x03, 10, 20, 30, 40, 0xFD, 99];
    let decompressed = decompress_packbits(&input, 8).expect("Decompressione RLE riuscita");
    assert_eq!(decompressed, vec![10, 20, 30, 40, 99, 99, 99, 99]);
}

#[test]
fn test_parse_layers() {
    // Genera un PSD sintetico conforme alla specifica Adobe con 2 livelli
    let l1_rgba = vec![255, 0, 0, 255].repeat(100 * 100);
    let l2_rgba = vec![0, 0, 255, 128].repeat(100 * 100);

    let layers = vec![
        SyntheticLayer {
            name: "Livello Rosso".to_string(),
            top: 10,
            left: 20,
            width: 100,
            height: 100,
            opacity: 255,
            visible: true,
            blend_mode: BlendMode::Normal,
            rgba: l1_rgba,
        },
        SyntheticLayer {
            name: "Livello Blu".to_string(),
            top: 50,
            left: 60,
            width: 100,
            height: 100,
            opacity: 128,
            visible: true,
            blend_mode: BlendMode::Multiply,
            rgba: l2_rgba,
        },
    ];

    let psd_bytes = generate_synthetic_psd(400, 300, &layers).expect("Generazione PSD sintetico");
    let result = parse_psd_detailed(&psd_bytes).expect("Parsing PSD dettagliato");

    assert_eq!(result.header.width, 400);
    assert_eq!(result.header.height, 300);
    assert_eq!(result.layer_records.len(), 2);

    let r1 = &result.layer_records[0];
    assert_eq!(r1.name, "Livello Rosso");
    assert_eq!(r1.top, 10);
    assert_eq!(r1.left, 20);
    assert_eq!(r1.width(), 100);
    assert_eq!(r1.height(), 100);
    assert_eq!(r1.opacity, 255);
    assert_eq!(r1.blend_mode, BlendMode::Normal);
    assert!(r1.visible);

    let r2 = &result.layer_records[1];
    assert_eq!(r2.name, "Livello Blu");
    assert_eq!(r2.top, 50);
    assert_eq!(r2.left, 60);
    assert_eq!(r2.width(), 100);
    assert_eq!(r2.height(), 100);
    assert_eq!(r2.opacity, 128);
    assert_eq!(r2.blend_mode, BlendMode::Multiply);
    assert!(r2.visible);
}

#[test]
fn test_import_full_psd_into_document() {
    let l1_rgba = vec![255, 255, 255, 255].repeat(200 * 200);
    let l2_rgba = vec![255, 0, 0, 200].repeat(100 * 100);

    let layers = vec![
        SyntheticLayer {
            name: "Sfondo".to_string(),
            top: 0,
            left: 0,
            width: 200,
            height: 200,
            opacity: 255,
            visible: true,
            blend_mode: BlendMode::Normal,
            rgba: l1_rgba,
        },
        SyntheticLayer {
            name: "Dettaglio Rosso".to_string(),
            top: 50,
            left: 50,
            width: 100,
            height: 100,
            opacity: 200,
            visible: true,
            blend_mode: BlendMode::Screen,
            rgba: l2_rgba,
        },
    ];

    let psd_bytes = generate_synthetic_psd(200, 200, &layers).expect("Generazione PSD");
    let doc = import_psd(&psd_bytes).expect("Importazione in Document riuscita");

    assert_eq!(doc.width, 200);
    assert_eq!(doc.height, 200);
    assert_eq!(doc.layer_count(), 2);

    let doc_l1 = &doc.layers[0];
    assert_eq!(doc_l1.name, "Sfondo");
    assert_eq!(doc_l1.opacity, 1.0);
    assert_eq!(doc_l1.transform.x, 0);
    assert_eq!(doc_l1.transform.y, 0);

    let doc_l2 = &doc.layers[1];
    assert_eq!(doc_l2.name, "Dettaglio Rosso");
    assert!((doc_l2.opacity - (200.0 / 255.0)).abs() < 1e-4);
    assert_eq!(doc_l2.transform.x, 50);
    assert_eq!(doc_l2.transform.y, 50);
    assert_eq!(doc_l2.blend_mode, BlendMode::Screen);
}

#[test]
fn test_corpus_sample_01() {
    let corpus_path = Path::new("../../tests/psd-corpus/sample-01.psd");
    if corpus_path.exists() {
        let bytes = fs::read(corpus_path).expect("Lettura sample-01.psd");
        let doc = import_psd(&bytes).expect("Parsing sample-01.psd");
        assert!(doc.width > 0);
        assert!(doc.height > 0);
        println!(
            "Corpus sample-01.psd letto con successo: {}x{}, {} livelli",
            doc.width,
            doc.height,
            doc.layer_count()
        );
    }
}
