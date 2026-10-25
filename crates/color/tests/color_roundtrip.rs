// Pizzico — crates/color/tests/color_roundtrip.rs
// Test di integrazione per il motore colorimetrico (Batch 2 - Lightcraft)
// Riferimenti: Ottosson 2020, ICC.1:2010

use pizzico_color::{
    convert_color, decode_srgb8, encode_srgb8, linear_to_srgb, oklab_from_linear_srgb,
    oklab_to_linear_srgb, parse_icc, srgb_to_linear, write_named_icc, IccColorModel,
    NamedSpace, DISPLAY_P3, SRGB,
};

#[test]
fn test_srgb_linear_srgb_roundtrip() {
    // Test 1: Roundtrip sRGB -> Linear sRGB -> sRGB entro 1/255 (tolleranza quantizzazione 8-bit)
    for i in 0..=255 {
        let original_u8 = i as u8;
        let linear_f32 = decode_srgb8(original_u8);
        let roundtrip_u8 = encode_srgb8(linear_f32);
        assert_eq!(
            original_u8, roundtrip_u8,
            "Discrepanza di quantizzazione per valore 8-bit: {}",
            original_u8
        );

        // Verifica anche per la funzione continua normalizzata [0.0, 1.0]
        let srgb_norm = i as f32 / 255.0;
        let linear = srgb_to_linear(srgb_norm);
        let back = linear_to_srgb(linear);
        assert!(
            (back - srgb_norm).abs() < (1.0 / 255.0),
            "Roundtrip continuo eccede 1/255 per {}: got {}",
            srgb_norm,
            back
        );
    }
}

#[test]
fn test_srgb_display_p3_srgb_roundtrip() {
    // Test 2: Conversione lineare sRGB -> Display P3 -> sRGB entro tolleranza di gamut
    // I colori all'interno del gamut sRGB sono un sottoinsieme di Display P3, quindi il roundtrip deve preservare l'identità.
    let samples = [
        [0.0f32, 0.0f32, 0.0f32],
        [1.0, 1.0, 1.0],
        [0.5, 0.5, 0.5],
        [0.8, 0.2, 0.1],
        [0.1, 0.9, 0.2],
        [0.2, 0.3, 0.85],
        [0.6, 0.4, 0.2],
    ];

    // Verifica A: tramite funzione di alto livello `convert_color`
    for &rgb in &samples {
        let p3 = convert_color(rgb, pizzico_color::ColorSpace::Srgb, pizzico_color::ColorSpace::DisplayP3);
        let back = convert_color(p3, pizzico_color::ColorSpace::DisplayP3, pizzico_color::ColorSpace::Srgb);

        for c in 0..3 {
            assert!(
                (back[c] - rgb[c]).abs() < 1e-4,
                "Errore di roundtrip convert_color sRGB -> P3 -> sRGB per {:?}: got {:?}",
                rgb,
                back
            );
        }
    }

    // Verifica B: tramite matrice di conversione lineare Bradford D65 -> D65
    let to_p3 = SRGB.to_space(&DISPLAY_P3);
    let to_srgb = DISPLAY_P3.to_space(&SRGB);

    for &rgb in &samples {
        let rgb_f64 = [rgb[0] as f64, rgb[1] as f64, rgb[2] as f64];
        let p3 = to_p3.apply(rgb_f64);
        let back = to_srgb.apply(p3);

        for c in 0..3 {
            assert!(
                (back[c] - rgb_f64[c]).abs() < 1e-4,
                "Errore di roundtrip matrix sRGB -> P3 -> sRGB per {:?}: got {:?}",
                rgb,
                back
            );
        }
    }
}


#[test]
fn test_srgb_oklab_srgb_roundtrip() {
    // Test 3: Roundtrip sRGB lineare -> OkLab -> sRGB lineare (Ottosson 2020)
    let samples = [
        [0.0f32, 0.0f32, 0.0f32],
        [1.0, 1.0, 1.0],
        [0.2, 0.7, 0.3],
        [0.8, 0.1, 0.9],
        [0.4, 0.4, 0.4],
        [0.95, 0.5, 0.1],
    ];

    for &rgb in &samples {
        let lab = oklab_from_linear_srgb(rgb);
        let back = oklab_to_linear_srgb(lab);

        for c in 0..3 {
            assert!(
                (back[c] - rgb[c]).abs() < 1e-5,
                "Errore di roundtrip OkLab per {:?}: got {:?}",
                rgb,
                back
            );
        }
    }
}

#[test]
fn test_icc_profile_parse_srgb() {
    // Test 4: Generazione e parse deterministico di un profilo ICC sRGB standard
    let icc_bytes = write_named_icc(NamedSpace::Srgb);
    assert!(!icc_bytes.is_empty(), "Il profilo ICC generato è vuoto");
    assert!(icc_bytes.len() >= 128, "Dimensione header ICC non valida");

    let info = parse_icc(&icc_bytes).expect("Fallimento del parsing del profilo ICC sRGB");
    assert_eq!(info.model, IccColorModel::Rgb, "Modello colore non è RGB");
    assert_eq!(
        info.named,
        Some(NamedSpace::Srgb),
        "Profilo non riconosciuto come standard sRGB"
    );
}
