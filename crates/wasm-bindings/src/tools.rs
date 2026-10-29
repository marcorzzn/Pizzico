// Pizzico — crates/wasm-bindings/src/tools.rs
// Licenza: MIT OR Apache-2.0

//! Ponte fra il catalogo degli strumenti e la UI.
//!
//! Il catalogo è costruito una sola volta (`OnceLock`): è immutabile e deterministico,
//! quindi ricostruirlo a ogni chiamata sarebbe solo lavoro sprecato. L'errore di
//! inizializzazione non viene nascosto né trasformato in panico: resta un `Result`
//! che il confine WASM traduce in un'eccezione JS leggibile.
//!
//! Contratto JS:
//! - `get_tool_catalog_json()` → stringa JSON `{"schemaVersion":1,"tools":[...]}`;
//! - `get_tool_schema_json(id)` → stringa JSON dello strumento, oppure `undefined`
//!   se l'id non esiste (anche se è sintatticamente invalido: non è un errore
//!   dell'utente, è semplicemente "non c'è").

use std::sync::OnceLock;

use wasm_bindgen::prelude::*;

use pizzico_tools::ToolRegistry;

static REGISTRY: OnceLock<Result<ToolRegistry, String>> = OnceLock::new();

fn registry() -> Result<&'static ToolRegistry, String> {
    REGISTRY
        .get_or_init(|| {
            ToolRegistry::with_builtins().map_err(|errore| format!("catalogo strumenti: {errore}"))
        })
        .as_ref()
        .map_err(Clone::clone)
}

/// JSON del catalogo completo. Funzione pura, verificabile senza WASM.
pub fn catalog_json() -> Result<String, String> {
    registry()?
        .catalog_json()
        .map_err(|errore| format!("serializzazione catalogo: {errore}"))
}

/// JSON di un singolo strumento; `Ok(None)` se l'id non è registrato.
pub fn schema_json(id: &str) -> Result<Option<String>, String> {
    registry()?
        .schema_json(id)
        .map_err(|errore| format!("serializzazione strumento {id:?}: {errore}"))
}

/// Catalogo completo per la UI.
///
/// In caso di errore lancia un'eccezione JS con un messaggio già contestualizzato:
/// non esiste un percorso che produca un panic nel runtime WASM.
#[wasm_bindgen]
pub fn get_tool_catalog_json() -> Result<String, JsValue> {
    catalog_json().map_err(|messaggio| JsValue::from_str(&messaggio))
}

/// Schema di uno strumento, o `undefined` se non esiste.
#[wasm_bindgen]
pub fn get_tool_schema_json(id: &str) -> Result<Option<String>, JsValue> {
    schema_json(id).map_err(|messaggio| JsValue::from_str(&messaggio))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    fn catalogo() -> Value {
        serde_json::from_str(&catalog_json().expect("catalogo serializzabile"))
            .expect("catalogo JSON valido")
    }

    #[test]
    fn il_catalogo_espone_i_quattro_id_della_ui() {
        let value = catalogo();
        assert_eq!(value["schemaVersion"].as_u64(), Some(1));
        let ids: Vec<&str> = value["tools"]
            .as_array()
            .expect("tools")
            .iter()
            .map(|t| t["id"].as_str().expect("id"))
            .collect();
        assert_eq!(ids, ["brush", "eraser", "marquee", "move"]);
    }

    #[test]
    fn lo_schema_del_pennello_ha_i_parametri_attesi() {
        let json = schema_json("brush").expect("schema").expect("registrato");
        let value: Value = serde_json::from_str(&json).expect("JSON valido");
        assert_eq!(value["label"], "Pennello");

        let params = value["params"].as_array().expect("params");
        assert_eq!(params.len(), 4);
        assert_eq!(params[0]["kind"], "integer");
        assert_eq!(params[0]["id"], "size");
        assert_eq!(params[0]["default"], 20);
        assert_eq!(params[3]["kind"], "color");
        assert_eq!(params[3]["default"], "#22c55e");
    }

    #[test]
    fn id_sconosciuto_o_non_valido_non_esplode() {
        assert!(schema_json("vignette").expect("nessun errore").is_none());
        assert!(schema_json("BRUSH").expect("nessun errore").is_none());
        assert!(schema_json("").expect("nessun errore").is_none());
    }

    #[test]
    fn il_catalogo_e_identico_fra_chiamate() {
        assert_eq!(
            catalog_json().expect("prima"),
            catalog_json().expect("seconda")
        );
    }
}
