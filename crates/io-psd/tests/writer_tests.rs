// Pizzico — crates/io-psd/tests/writer_tests.rs
// Riferimento manifesto: §6.5, §7.3
// Licenza: MIT OR Apache-2.0

use byteorder::{BigEndian, ReadBytesExt};
use pizzico_core::{BlendMode, Document, Layer, LayerKind, Transform2D};
use pizzico_io_psd::{compress_packbits, decompress_packbits, export_psd, import_psd, parse_psd_detailed};
use std::fs;
use std::io::Cursor;
use std::path::Path;

#[test]
fn test_serialize_minimal_document() {
    let mut doc = Document::new_empty(100, 100);
    doc.metadata.title = "Minimal Doc".to_string();
    doc.metadata.dpi = 72.0;

    // Aggiunge un layer raster 100x100 bianco opaco
    let pixels = vec![255u8; 100 * 100 * 4];
    doc.add_layer(Layer {
        id: 1,
        name: "Sfondo Bianco".to_string(),
        visible: true,
        locked: false,
        opacity: 1.0,
        blend_mode: BlendMode::Normal,
        transform: Transform2D::default(),
        kind: LayerKind::Raster {
            width: 100,
            height: 100,
            pixels,
        },
    });

    let bytes = export_psd(&doc).expect("Esportazione PSD riuscita");
    assert!(bytes.len() > 26, "File PSD deve essere maggiore dell'header");

    // Verifica signature '8BPS' e versione 1
    assert_eq!(&bytes[0..4], b"8BPS", "La signature deve essere 8BPS");
    let version = (&bytes[4..6]).read_u16::<BigEndian>().unwrap();
    assert_eq!(version, 1, "La versione deve essere 1 per PSD");

    // Verifica canali = 4 (RGBA)
    let channels = (&bytes[12..14]).read_u16::<BigEndian>().unwrap();
    assert_eq!(channels, 4, "Numero di canali deve essere 4 (RGBA)");

    // Verifica altezza e larghezza
    let height = (&bytes[14..18]).read_u32::<BigEndian>().unwrap();
    let width = (&bytes[18..22]).read_u32::<BigEndian>().unwrap();
    assert_eq!(height, 100);
    assert_eq!(width, 100);

    // Verifica profondità e modalità colore
    let depth = (&bytes[22..24]).read_u16::<BigEndian>().unwrap();
    let color_mode = (&bytes[24..26]).read_u16::<BigEndian>().unwrap();
    assert_eq!(depth, 8);
    assert_eq!(color_mode, 3, "Color mode deve essere 3 (RGB)");

    // Re-importa in un Document di Pizzico per verifica roundtrip
    let reimported = import_psd(&bytes).expect("Re-importazione del PSD generato riuscita");
    assert_eq!(reimported.width, 100);
    assert_eq!(reimported.height, 100);
    assert_eq!(reimported.layer_count(), 1);
    assert_eq!(reimported.layers[0].name, "Sfondo Bianco");
}

#[test]
fn test_rle_encoder_roundtrip() {
    // 1. Sequenza uniforme (ripetizione lunga > 128 byte)
    let uniform = vec![0xABu8; 300];
    let comp_uniform = compress_packbits(&uniform);
    let decomp_uniform = decompress_packbits(&comp_uniform, uniform.len()).expect("Decompress uniform");
    assert_eq!(uniform, decomp_uniform);

    // 2. Sequenza letterale (priva di ripetizioni)
    let literal: Vec<u8> = (0..200).map(|i| (i % 251) as u8).collect();
    let comp_literal = compress_packbits(&literal);
    let decomp_literal = decompress_packbits(&comp_literal, literal.len()).expect("Decompress literal");
    assert_eq!(literal, decomp_literal);

    // 3. Sequenza mista realistica (gradienti, trasparenze, bordi)
    let mut mixed = Vec::new();
    mixed.extend(vec![0u8; 50]); // Trasparenza
    mixed.extend_from_slice(&[10, 20, 30, 40, 50, 60, 70, 80]); // Bordo letterale
    mixed.extend(vec![255u8; 120]); // Pieno opaco
    mixed.extend_from_slice(&[99, 99, 99]); // Breve ripetizione di 3
    mixed.extend_from_slice(&[1, 2, 3, 4]); // Finale letterale

    let comp_mixed = compress_packbits(&mixed);
    let decomp_mixed = decompress_packbits(&comp_mixed, mixed.len()).expect("Decompress mixed");
    assert_eq!(mixed, decomp_mixed);
}

#[test]
fn test_roundtrip_sample_01() {
    let mut doc = Document::new_empty(800, 600);
    doc.metadata.title = "Sample 01 Roundtrip".to_string();
    doc.metadata.dpi = 72.0;

    // Layer 1: Sfondo bianco opaco (800x600, top: 0, left: 0)
    let l1_rgba = vec![255, 255, 255, 255].repeat(800 * 600);
    doc.add_layer(Layer {
        id: 1,
        name: "Sfondo".to_string(),
        visible: true,
        locked: false,
        opacity: 1.0,
        blend_mode: BlendMode::Normal,
        transform: Transform2D {
            x: 0,
            y: 0,
            scale_x: 1.0,
            scale_y: 1.0,
            rotation_rad: 0.0,
        },
        kind: LayerKind::Raster {
            width: 800,
            height: 600,
            pixels: l1_rgba,
        },
    });

    // Layer 2: Rettangolo rosso opaco (400x300, offset top: 50, left: 50)
    let l2_rgba = vec![255, 0, 0, 255].repeat(400 * 300);
    doc.add_layer(Layer {
        id: 2,
        name: "Layer Rosso".to_string(),
        visible: true,
        locked: false,
        opacity: 1.0,
        blend_mode: BlendMode::Normal,
        transform: Transform2D {
            x: 50,
            y: 50,
            scale_x: 1.0,
            scale_y: 1.0,
            rotation_rad: 0.0,
        },
        kind: LayerKind::Raster {
            width: 400,
            height: 300,
            pixels: l2_rgba,
        },
    });

    // Layer 3: Rettangolo blu semitrasparente (400x300, offset top: 150, left: 150, blend Multiply)
    let l3_rgba = vec![0, 0, 255, 128].repeat(400 * 300);
    doc.add_layer(Layer {
        id: 3,
        name: "Layer Blu Trasparente".to_string(),
        visible: true,
        locked: false,
        opacity: 128.0 / 255.0, // ~0.50196
        blend_mode: BlendMode::Multiply,
        transform: Transform2D {
            x: 150,
            y: 150,
            scale_x: 1.0,
            scale_y: 1.0,
            rotation_rad: 0.0,
        },
        kind: LayerKind::Raster {
            width: 400,
            height: 300,
            pixels: l3_rgba,
        },
    });

    // Esporta con il nuovo PSD writer
    let psd_bytes = export_psd(&doc).expect("Esportazione sample-01 riuscita");

    // Salva per verifica esterna e ispezione
    let out_dir = Path::new("target/test-psd");
    let _ = fs::create_dir_all(out_dir);
    let _ = fs::write(out_dir.join("sample-01-exported.psd"), &psd_bytes);

    // Parsing dettagliato a basso livello
    let detailed = parse_psd_detailed(&psd_bytes).expect("Parsing dettagliato del PSD esportato");
    assert_eq!(detailed.header.width, 800);
    assert_eq!(detailed.header.height, 600);
    assert_eq!(detailed.layer_records.len(), 3);

    // Verifica Layer 1: Sfondo
    let r1 = &detailed.layer_records[0];
    assert_eq!(r1.name, "Sfondo");
    assert_eq!(r1.top, 0);
    assert_eq!(r1.left, 0);
    assert_eq!(r1.width(), 800);
    assert_eq!(r1.height(), 600);
    assert_eq!(r1.opacity, 255);
    assert_eq!(r1.blend_mode, BlendMode::Normal);
    assert!(r1.visible);

    // Verifica Layer 2: Layer Rosso
    let r2 = &detailed.layer_records[1];
    assert_eq!(r2.name, "Layer Rosso");
    assert_eq!(r2.top, 50);
    assert_eq!(r2.left, 50);
    assert_eq!(r2.width(), 400);
    assert_eq!(r2.height(), 300);
    assert_eq!(r2.opacity, 255);
    assert_eq!(r2.blend_mode, BlendMode::Normal);
    assert!(r2.visible);

    // Verifica Layer 3: Layer Blu Trasparente
    let r3 = &detailed.layer_records[2];
    assert_eq!(r3.name, "Layer Blu Trasparente");
    assert_eq!(r3.top, 150);
    assert_eq!(r3.left, 150);
    assert_eq!(r3.width(), 400);
    assert_eq!(r3.height(), 300);
    assert_eq!(r3.opacity, 128);
    assert_eq!(r3.blend_mode, BlendMode::Multiply);
    assert!(r3.visible);

    // Re-importa in un Document di Pizzico ad alto livello
    let reimported_doc = import_psd(&psd_bytes).expect("Importazione in Document");
    assert_eq!(reimported_doc.width, 800);
    assert_eq!(reimported_doc.height, 600);
    assert_eq!(reimported_doc.layer_count(), 3);

    assert_eq!(reimported_doc.layers[0].name, "Sfondo");
    assert_eq!(reimported_doc.layers[0].transform.x, 0);
    assert_eq!(reimported_doc.layers[0].transform.y, 0);
    assert_eq!(reimported_doc.layers[0].opacity, 1.0);

    assert_eq!(reimported_doc.layers[1].name, "Layer Rosso");
    assert_eq!(reimported_doc.layers[1].transform.x, 50);
    assert_eq!(reimported_doc.layers[1].transform.y, 50);
    assert_eq!(reimported_doc.layers[1].opacity, 1.0);

    assert_eq!(reimported_doc.layers[2].name, "Layer Blu Trasparente");
    assert_eq!(reimported_doc.layers[2].transform.x, 150);
    assert_eq!(reimported_doc.layers[2].transform.y, 150);
    assert!((reimported_doc.layers[2].opacity - (128.0 / 255.0)).abs() < 1e-4);
    assert_eq!(reimported_doc.layers[2].blend_mode, BlendMode::Multiply);
}

#[test]
fn test_padding_correctness() {
    let mut doc = Document::new_empty(200, 150);
    doc.metadata.dpi = 300.0;
    let pixels = vec![120u8; 200 * 150 * 4];
    doc.add_layer(Layer {
        id: 1,
        name: "Test Padding Odd Len".to_string(),
        visible: true,
        locked: false,
        opacity: 0.8,
        blend_mode: BlendMode::Screen,
        transform: Transform2D::default(),
        kind: LayerKind::Raster {
            width: 200,
            height: 150,
            pixels,
        },
    });

    let bytes = export_psd(&doc).expect("Export PSD");
    let mut cursor = Cursor::new(&bytes);

    // 1. Header: 26 byte
    let mut header = [0u8; 26];
    std::io::Read::read_exact(&mut cursor, &mut header).unwrap();
    assert_eq!(&header[0..4], b"8BPS");

    // 2. Color mode: 4 byte len (deve essere 0)
    let color_mode_len = cursor.read_u32::<BigEndian>().unwrap();
    assert_eq!(color_mode_len, 0);

    // 3. Image resources: 4 byte len
    let resources_len = cursor.read_u32::<BigEndian>().unwrap() as usize;
    assert!(resources_len > 0);
    let mut resources_buf = vec![0u8; resources_len];
    std::io::Read::read_exact(&mut cursor, &mut resources_buf).unwrap();

    // Verifica blocchi 8BIM dentro le risorse
    let mut res_cursor = Cursor::new(&resources_buf);
    while (res_cursor.position() as usize) < resources_len {
        let mut sig = [0u8; 4];
        std::io::Read::read_exact(&mut res_cursor, &mut sig).unwrap();
        assert_eq!(&sig, b"8BIM", "Firma blocco risorsa deve essere 8BIM");
        let _id = res_cursor.read_u16::<BigEndian>().unwrap();
        let name_len = res_cursor.read_u8().unwrap() as usize;
        let mut name_raw = vec![0u8; name_len];
        std::io::Read::read_exact(&mut res_cursor, &mut name_raw).unwrap();
        if (1 + name_len) % 2 != 0 {
            let pad = res_cursor.read_u8().unwrap();
            assert_eq!(pad, 0, "Padding nome risorsa a 2 byte");
        }
        let data_len = res_cursor.read_u32::<BigEndian>().unwrap() as usize;
        let mut data = vec![0u8; data_len];
        std::io::Read::read_exact(&mut res_cursor, &mut data).unwrap();
        if data_len % 2 != 0 {
            let pad = res_cursor.read_u8().unwrap();
            assert_eq!(pad, 0, "Padding dati risorsa a 2 byte");
        }
    }

    // 4. Layer & Mask Info section
    let section_len = cursor.read_u32::<BigEndian>().unwrap();
    let layer_info_len = cursor.read_u32::<BigEndian>().unwrap();
    assert_eq!(section_len, 4 + layer_info_len);

    // Salta i byte del corpo di Layer Info per raggiungere la Sezione 5
    let mut layer_payload = vec![0u8; layer_info_len as usize];
    std::io::Read::read_exact(&mut cursor, &mut layer_payload).unwrap();

    // 5. Image Data Section (Composite)
    let comp_method = cursor.read_u16::<BigEndian>().unwrap();
    assert_eq!(comp_method, 1, "Compressione immagine unita = 1 (RLE)");
}
