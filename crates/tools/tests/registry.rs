//! Test del catalogo dal punto di vista del consumatore: API pubblica, JSON,
//! validazione fail-closed ed estensibilità senza modifiche al resto del codice.

use pizzico_tools::{
    ChoiceOption, ParamSpec, RegistryError, SchemaError, ToolRegistry, ToolSchema, SCHEMA_VERSION,
};

#[test]
fn i_builtin_coprono_gli_id_gia_usati_dalla_ui() {
    let registry = ToolRegistry::with_builtins().expect("builtin validi");

    assert_eq!(registry.len(), 4);
    assert_eq!(registry.ids(), ["brush", "eraser", "marquee", "move"]);

    let brush = registry.get("brush").expect("pennello");
    assert_eq!(brush.shortcut.as_deref(), Some("B"));
    assert!(brush.param("size").is_some());
    assert!(brush.param("hardness").is_some());
    assert!(brush.param("opacity").is_some());
    assert!(brush.param("color").is_some());

    let eraser = registry.get("eraser").expect("gomma");
    assert!(
        eraser.param("color").is_none(),
        "la gomma non usa il colore: lo schema non deve dichiararlo"
    );

    assert!(registry.get("move").expect("sposta").params.is_empty());
    assert!(registry
        .get("marquee")
        .expect("selezione")
        .params
        .is_empty());

    assert!(
        registry.get("BRUSH").is_none(),
        "gli id sono case-sensitive"
    );
    assert!(registry.schema_json("sconosciuto").expect("json").is_none());
}

#[test]
fn il_catalogo_json_ha_versione_e_forma_stabile() {
    let registry = ToolRegistry::with_builtins().expect("builtin validi");
    let json = registry.catalog_json().expect("catalogo serializzabile");
    let value: serde_json::Value = serde_json::from_str(&json).expect("JSON valido");

    assert_eq!(
        value["schemaVersion"].as_u64(),
        Some(u64::from(SCHEMA_VERSION))
    );
    let tools = value["tools"].as_array().expect("array tools");
    assert_eq!(tools.len(), 4);
    assert_eq!(tools[0]["id"].as_str(), Some("brush"), "ordine per id");

    let kinds: Vec<&str> = tools[0]["params"]
        .as_array()
        .expect("parametri del pennello")
        .iter()
        .map(|p| p["kind"].as_str().expect("tag kind"))
        .collect();
    assert_eq!(kinds, ["integer", "integer", "integer", "color"]);

    let primo = &tools[0]["params"][0];
    assert_eq!(primo["id"].as_str(), Some("size"));
    assert_eq!(primo["default"].as_i64(), Some(20));
    assert_eq!(primo["unit"].as_str(), Some("px"));
}

#[test]
fn due_registri_producono_lo_stesso_json() {
    let a = ToolRegistry::with_builtins().expect("builtin validi");
    let b = ToolRegistry::with_builtins().expect("builtin validi");
    assert_eq!(
        a.catalog_json().expect("json"),
        b.catalog_json().expect("json"),
        "l'ordine BTreeMap rende il catalogo deterministico"
    );
}

#[test]
fn registrare_due_volte_lo_stesso_id_fallisce() {
    let mut registry = ToolRegistry::with_builtins().expect("builtin validi");
    let doppione = registry.get("brush").expect("pennello").clone();

    let errore = registry.register(doppione).expect_err("id duplicato");
    assert_eq!(errore, RegistryError::DuplicateId("brush".to_string()));
    assert_eq!(registry.len(), 4, "il registro non cambia");
}

#[test]
fn uno_schema_invalido_non_entra_nel_registro() {
    let mut registry = ToolRegistry::with_builtins().expect("builtin validi");

    // Costruito via JSON: la deserializzazione da sola non valida, il registro sì.
    let invalido: ToolSchema = serde_json::from_str(r#"{"id":"rotator","label":"","params":[]}"#)
        .expect("JSON sintatticamente valido");

    let errore = registry.register(invalido).expect_err("etichetta vuota");
    assert!(matches!(
        errore,
        RegistryError::InvalidSchema(SchemaError::EmptyText {
            field: "etichetta dello strumento"
        })
    ));
    assert_eq!(registry.len(), 4);
}

#[test]
fn un_default_fuori_intervallo_non_viene_accettato() {
    let mut schema = ToolSchema::new("rotator", "Rotazione", "Ruota il livello.").expect("schema");
    let errore = schema
        .add_param(ParamSpec::integer(
            "angle", "Angolo", -180, 180, 1, 500, None,
        ))
        .expect_err("500 è fuori da -180..180");
    assert!(matches!(
        errore,
        SchemaError::InvalidDefault { ref param } if param == "angle"
    ));
    assert!(schema.params.is_empty(), "nessun parametro parziale");
}

#[test]
fn colori_e_parametri_duplicati_vengono_rifiutati() {
    let mut schema = ToolSchema::new("paint", "Pittura", "").expect("schema");

    let colore = schema
        .add_param(ParamSpec::color("colore", "Colore", "verde"))
        .expect_err("non è un esadecimale");
    assert!(matches!(colore, SchemaError::InvalidColor { .. }));

    schema
        .add_param(ParamSpec::integer("n", "Numero", 0, 10, 1, 5, None))
        .expect("primo parametro");
    let duplicato = schema
        .add_param(ParamSpec::integer("n", "Numero 2", 0, 10, 1, 5, None))
        .expect_err("id duplicato");
    assert!(matches!(duplicato, SchemaError::DuplicateParam { .. }));
}

#[test]
fn il_json_di_uno_schema_viene_validato_in_ingresso() {
    let invalido = r#"{
        "id": "bad",
        "label": "Non valido",
        "params": [
            {"kind":"integer","id":"n","label":"N","min":0,"max":10,"step":1,"default":99}
        ]
    }"#;
    assert!(
        ToolSchema::from_json(invalido).is_err(),
        "un default fuori intervallo non deve entrare dalla porta del JSON"
    );

    let registry = ToolRegistry::with_builtins().expect("builtin validi");
    let pennello = registry.get("brush").expect("pennello");
    let riletto = ToolSchema::from_json(&pennello.to_json().expect("json")).expect("round-trip");
    assert_eq!(&riletto, pennello);
}

#[test]
fn un_nuovo_strumento_si_aggiunge_con_i_soli_dati() {
    let mut registry = ToolRegistry::with_builtins().expect("builtin validi");

    let mut vignetta = ToolSchema::new(
        "vignette",
        "Vignettatura",
        "Scurisce i bordi del livello attivo.",
    )
    .expect("schema");
    vignetta
        .add_param(ParamSpec::float(
            "strength",
            "Intensità",
            0.0,
            1.0,
            0.05,
            0.5,
            None,
        ))
        .expect("forza");
    vignetta
        .add_param(ParamSpec::choice(
            "shape",
            "Forma",
            vec![
                ChoiceOption::new("round", "Rotonda"),
                ChoiceOption::new("square", "Quadrata"),
            ],
            "round",
        ))
        .expect("forma");
    registry.register(vignetta).expect("registrazione");

    assert!(registry.contains("vignette"));
    let schema = registry.get("vignette").expect("strumento");
    assert_eq!(schema.params.len(), 2);

    let value: serde_json::Value =
        serde_json::from_str(&registry.catalog_json().expect("json")).expect("JSON valido");
    let tools = value["tools"].as_array().expect("array");
    assert!(
        tools.iter().any(|t| t["id"] == "vignette"),
        "il catalogo espone il nuovo strumento senza altre modifiche"
    );
}
