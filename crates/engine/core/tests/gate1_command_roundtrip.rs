//! Gate 1 della sessione P1-Arch: la storia è uno stack di comandi, e un ciclo
//! completo di undo/redo deve restituire lo stato **esattamente** com'era.
//!
//! Il test non guarda solo il composito: confronta l'albero dei nodi, i metadati,
//! i buffer RGBA di ogni layer e il composito finale. Una differenza di un solo
//! byte fa fallire il Gate.
//!
//! Riferimento: `docs/ADR/0008-tool-registry.md`.

use pizzico_engine_core::{
    AddLayer, BlendMode, Document, Layer, Node, ReplacePixelCommand, SetBlendMode, SetOpacity,
    SetTransform, SetVisible, Transform,
};

const DOC_W: u32 = 48;
const DOC_H: u32 = 32;
const BBOX: (u32, u32, u32, u32) = (8, 6, 10, 8);

/// Fotografia completa e ordinata del documento. Non usa `PartialEq` sui tipi del
/// motore (che non lo implementano) ma un confronto campo per campo, così il test
/// resta indipendente dall'implementazione.
#[derive(Debug, PartialEq)]
struct DocSnap {
    width: u32,
    height: u32,
    nodes: Vec<NodeSnap>,
    composite: Vec<u8>,
}

#[derive(Debug, PartialEq)]
enum NodeSnap {
    Layer {
        name: String,
        stable: String,
        visible: bool,
        opacity: u32,
        blend: String,
        transform: [u32; 5],
        pixels: Vec<u8>,
    },
    Group {
        name: String,
        stable: String,
        visible: bool,
        opacity: u32,
        blend: String,
        children: Vec<NodeSnap>,
    },
}

fn node_snap(node: &Node) -> NodeSnap {
    match node {
        Node::Layer(l) => NodeSnap::Layer {
            name: l.name.clone(),
            stable: l.stable.to_uuid_string(),
            visible: l.visible,
            opacity: l.opacity.to_bits(),
            blend: format!("{:?}", l.blend),
            transform: [
                l.transform.x.to_bits(),
                l.transform.y.to_bits(),
                l.transform.scale_x.to_bits(),
                l.transform.scale_y.to_bits(),
                l.transform.rotation.to_bits(),
            ],
            pixels: l.pixels.clone(),
        },
        Node::Group(g) => NodeSnap::Group {
            name: g.name.clone(),
            stable: g.stable.to_uuid_string(),
            visible: g.visible,
            opacity: g.opacity.to_bits(),
            blend: format!("{:?}", g.blend),
            children: g.children.iter().map(node_snap).collect(),
        },
    }
}

fn snap(doc: &Document) -> DocSnap {
    DocSnap {
        width: doc.width,
        height: doc.height,
        nodes: doc.root.iter().map(node_snap).collect(),
        composite: doc.composite(),
    }
}

/// Pixel del rettangolo del tratto: un gradiente riconoscibile, non un colore piatto,
/// così una sostituzione parziale sbagliata non può passare per caso.
fn dopo_il_tratto() -> Vec<u8> {
    let (_, _, w, h) = BBOX;
    let mut out = Vec::with_capacity((w * h * 4) as usize);
    for y in 0..h {
        for x in 0..w {
            out.extend_from_slice(&[(20 * x) as u8, (30 * y) as u8, 200, 255]);
        }
    }
    out
}

#[test]
fn undo_e_redo_riportano_documento_e_pixel_esattamente_allo_stato_iniziale_e_finale() {
    // Stato iniziale costruito senza storia: è il "prima" che il Gate deve ritrovare.
    let mut doc = Document::new(DOC_W, DOC_H);
    doc.add_layer(Layer::filled("sfondo", DOC_W, DOC_H, [40, 60, 80, 255]));
    let iniziale = snap(&doc);
    assert!(!doc.history.can_undo(), "la storia deve partire vuota");

    // Sette comandi di natura diversa: struttura, pixel, stile, trasformazione, visibilità.
    let tratto = Layer::transparent("tratto", DOC_W, DOC_H);
    let id = tratto.id;
    doc.execute(Box::new(AddLayer::new(tratto)));
    doc.execute(Box::new(ReplacePixelCommand::new(
        id,
        Some(BBOX),
        vec![0; (BBOX.2 * BBOX.3 * 4) as usize],
        dopo_il_tratto(),
    )));
    doc.execute(Box::new(SetOpacity::new(id, 0.5)));
    doc.execute(Box::new(SetBlendMode::new(id, BlendMode::Screen)));
    doc.execute(Box::new(SetTransform::new(
        id,
        Transform {
            x: 4.0,
            y: -3.0,
            scale_x: 1.25,
            scale_y: 0.75,
            rotation: 0.3,
        },
    )));
    doc.execute(Box::new(SetVisible::new(id, false)));
    doc.execute(Box::new(SetVisible::new(id, true)));

    assert_eq!(doc.history.undo_count(), 7);
    assert_eq!(
        doc.history.labels(),
        vec![
            "Aggiungi livello",
            "Modifica pixel",
            "Opacità livello",
            "Modo di fusione",
            "Trasforma livello",
            "Visibilita",
            "Visibilita",
        ],
        "l'ordine dei comandi è parte del contratto"
    );

    let finale = snap(&doc);
    assert_ne!(
        iniziale.composite, finale.composite,
        "il test sarebbe vuoto se i comandi non cambiassero i pixel"
    );

    // Undo totale: si deve tornare al byte iniziale, non a uno stato "equivalente".
    let mut annullati = 0;
    while doc.undo() {
        annullati += 1;
    }
    assert_eq!(annullati, 7, "tutti i comandi devono essere annullabili");
    assert_eq!(doc.history.undo_count(), 0);
    assert_eq!(doc.history.redo_count(), 7);
    assert_eq!(
        snap(&doc),
        iniziale,
        "dopo l'undo totale il documento deve essere identico byte per byte"
    );

    // Redo totale: si deve tornare esattamente allo stato finale.
    let mut riapplicati = 0;
    while doc.redo() {
        riapplicati += 1;
    }
    assert_eq!(riapplicati, 7);
    assert_eq!(doc.history.undo_count(), 7);
    assert_eq!(doc.history.redo_count(), 0);
    assert_eq!(
        snap(&doc),
        finale,
        "dopo il redo totale lo stato finale deve tornare identico"
    );

    // Sequenza parziale: due undo e due redo non devono lasciare residui.
    assert!(doc.undo());
    assert!(doc.undo());
    assert!(doc.redo());
    assert!(doc.redo());
    assert_eq!(
        snap(&doc),
        finale,
        "una sequenza parziale coerente deve chiudersi sullo stesso stato"
    );
}

#[test]
fn un_nuovo_comando_dopo_un_undo_scarta_la_pila_del_redo() {
    let mut doc = Document::new(16, 16);
    let sfondo = Layer::filled("sfondo", 16, 16, [10, 10, 10, 255]);
    let id = sfondo.id;
    doc.execute(Box::new(AddLayer::new(sfondo)));
    doc.execute(Box::new(SetOpacity::new(id, 0.5)));

    assert!(doc.undo());
    assert!(
        doc.history.can_redo(),
        "l'opacità annullata è ripristinabile"
    );

    // La storia lineare non ammette diramazioni: il nuovo comando butta il ramo rosso.
    doc.execute(Box::new(SetOpacity::new(id, 0.25)));

    assert!(
        !doc.history.can_redo(),
        "dopo un nuovo comando il redo non deve sopravvivere"
    );
    assert_eq!(doc.history.undo_count(), 2);
}
