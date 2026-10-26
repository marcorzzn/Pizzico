//! Test di integrazione di `pizzico-session`.
//!
//! Verificano le tre promesse non ovvie del porting:
//! 1. il drag di opacità produce **un solo** comando (non uno per movimento);
//! 2. `merge_down` fonde e l'undo ripristina;
//! 3. la selezione diventa maschera e l'undo la toglie.
//!
//! L'applier di effetti è finto: serve a dimostrare che la sessione non dipende
//! dalla GPU né dal renderer.

use pizzico_engine_core::Layer;
use pizzico_session::{EffectApplier, EffectOp, Session, SessionError, Tool};

/// Cancella i canali RGB lasciando l'alpha: basta a provare che i pixel passano.
struct InvertiApplier;

impl EffectApplier for InvertiApplier {
    fn apply(&mut self, source: &Layer, _effect: &EffectOp) -> Result<(u32, u32, Vec<u8>), String> {
        let invertiti = source.pixels.iter().map(|b| 255 - *b).collect();
        Ok((source.width, source.height, invertiti))
    }
}

fn documento_con_due_layer() -> Session {
    let mut session = Session::new(8, 8);
    let doc = session.document_mut();
    doc.add_layer(Layer::filled("sfondo", 8, 8, [10, 10, 10, 255]));
    doc.add_layer(Layer::filled("sopra", 8, 8, [200, 0, 0, 255]));
    session
}

#[test]
fn drag_di_opacita_produce_un_solo_comando() {
    let mut s = documento_con_due_layer();
    let sopra = s.document().layers()[1].id;

    assert!(s.begin_opacity_drag(sopra));
    let base = s.history_len();

    // dieci aggiornamenti durante il drag non devono toccare la history
    for i in 1..=9 {
        assert!(s.update_opacity_drag(i as f32 / 10.0));
    }
    assert_eq!(s.history_len(), base, "il drag non deve creare comandi");

    assert!(s.end_opacity_drag());
    assert_eq!(s.history_len(), base + 1, "un comando solo alla fine");

    let valore = s.document().layer(sopra).unwrap().opacity;
    assert!((valore - 0.9).abs() < 1e-6, "atteso 0.9, trovato {valore}");

    // l'undo deve tornare all'opacità originale (1.0), non a un valore intermedio
    assert!(s.undo());
    let dopo_undo = s.document().layer(sopra).unwrap().opacity;
    assert!((dopo_undo - 1.0).abs() < 1e-6, "undo a {dopo_undo}");
}

#[test]
fn drag_senza_movimento_non_crea_comandi() {
    let mut s = documento_con_due_layer();
    let sopra = s.document().layers()[1].id;
    let base = s.history_len();

    assert!(s.begin_opacity_drag(sopra));
    assert!(!s.end_opacity_drag(), "nessun cambiamento, nessun comando");
    assert_eq!(s.history_len(), base);
}

#[test]
fn merge_down_fonde_e_undo_ripristina() {
    let mut s = documento_con_due_layer();
    let sopra = s.document().layers()[1].id;
    assert_eq!(s.layer_count(), 2);

    s.merge_down(sopra).expect("merge");
    assert_eq!(s.layer_count(), 1, "i due layer diventano uno");

    assert!(s.undo());
    assert_eq!(s.layer_count(), 2, "l'undo riporta entrambi i layer");
}

#[test]
fn merge_down_senza_layer_sotto_e_un_errore() {
    let mut s = documento_con_due_layer();
    let sotto = s.document().layers()[0].id;
    assert_eq!(s.merge_down(sotto), Err(SessionError::NoLayerBelow));
}

#[test]
fn selezione_diventa_maschera_e_undo_la_toglie() {
    let mut s = documento_con_due_layer();
    let sopra = s.document().layers()[1].id;

    s.begin_selection(2.0, 2.0);
    s.update_selection(6.0, 6.0);

    assert!(s.document().layer(sopra).unwrap().mask.is_none());
    s.apply_selection_as_mask(sopra).expect("maschera");
    assert!(s.document().layer(sopra).unwrap().mask.is_some());

    assert!(s.undo());
    assert!(
        s.document().layer(sopra).unwrap().mask.is_none(),
        "l'undo rimuove la maschera"
    );
}

#[test]
fn selezione_vuota_e_un_errore() {
    let mut s = documento_con_due_layer();
    let sopra = s.document().layers()[1].id;

    s.begin_selection(3.0, 3.0);
    s.update_selection(3.0, 3.0); // area nulla

    let esito = s.apply_selection_as_mask(sopra);
    assert!(matches!(
        esito,
        Err(SessionError::NoSelection) | Err(SessionError::EmptySelection)
    ));
}

#[test]
fn senza_selezione_non_si_crea_maschera() {
    let mut s = documento_con_due_layer();
    let sopra = s.document().layers()[1].id;
    assert_eq!(
        s.apply_selection_as_mask(sopra),
        Err(SessionError::NoSelection)
    );
}

#[test]
fn effetto_crea_un_layer_nuovo_e_l_undo_lo_rimuove() {
    let mut s = documento_con_due_layer();
    let sopra = s.document().layers()[1].id;
    let mut applier = InvertiApplier;

    let nuovo = s
        .apply_effect(&mut applier, sopra, EffectOp::Brightness(0.2))
        .expect("effetto");

    assert_eq!(s.layer_count(), 3, "effetto non distruttivo: nuovo layer");
    assert_eq!(s.selected(), Some(nuovo));
    let invertito = s.document().layer(nuovo).unwrap();
    assert_eq!(invertito.pixels[0], 55, "200 invertito = 55");

    assert!(s.undo());
    assert_eq!(s.layer_count(), 2, "l'undo toglie il layer dell'effetto");
}

#[test]
fn effetto_con_pixel_invalidi_viene_rifiutato() {
    struct ApplierRotto;
    impl EffectApplier for ApplierRotto {
        fn apply(&mut self, _s: &Layer, _e: &EffectOp) -> Result<(u32, u32, Vec<u8>), String> {
            Ok((8, 8, vec![0; 3])) // dimensione sbagliata
        }
    }
    let mut s = documento_con_due_layer();
    let sopra = s.document().layers()[1].id;
    let mut applier = ApplierRotto;
    assert_eq!(
        s.apply_effect(&mut applier, sopra, EffectOp::Blur(2.0)),
        Err(SessionError::InvalidPixels)
    );
}

#[test]
fn il_tratto_crea_un_layer_annullabile() {
    let mut s = Session::new(16, 16);
    let base = s.layer_count();

    s.begin_stroke();
    s.push_point(4.0, 8.0, 1.0);
    s.push_point(12.0, 8.0, 1.0);
    assert_eq!(s.stroke_len(), 2);

    let id = s.finish_stroke().expect("tratto");
    assert_eq!(s.layer_count(), base + 1);
    assert_eq!(s.selected(), Some(id));
    assert_eq!(s.stroke_len(), 0, "i punti vengono consumati");

    assert!(s.undo());
    assert_eq!(s.layer_count(), base);
}

#[test]
fn tratto_senza_punti_non_crea_nulla() {
    let mut s = Session::new(8, 8);
    s.begin_stroke();
    assert!(s.finish_stroke().is_none());
    assert_eq!(s.layer_count(), 0);
}

#[test]
fn cambio_strumento_annulla_la_selezione_in_corso() {
    let mut s = Session::new(8, 8);
    s.begin_selection(1.0, 1.0);
    assert!(s.selection_bounds().is_some());
    s.set_tool(Tool::Brush);
    assert!(s.selection_bounds().is_none());
    assert_eq!(s.tool(), Tool::Brush);
}

#[test]
fn fit_to_calcola_lo_zoom_dal_viewport() {
    let mut s = Session::new(400, 200);
    s.fit_to(800.0, 800.0);
    // il lato limitante è la larghezza: 800/400 = 2
    assert!((s.zoom() - 2.0).abs() < 1e-6, "zoom {}", s.zoom());
}
