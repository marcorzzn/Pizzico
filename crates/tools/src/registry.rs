// Pizzico — crates/tools/src/registry.rs
// Licenza: MIT OR Apache-2.0

//! Registro ordinato degli strumenti e catalogo JSON versionato.

use std::collections::BTreeMap;
use std::fmt;

use serde::Serialize;

use crate::schema::{ParamSpec, SchemaError, ToolId, ToolSchema};

/// Versione del formato JSON del catalogo.
///
/// Un cambio incompatibile incrementa questo numero: la UI può rifiutare un
/// catalogo che non conosce invece di interpretarlo male.
pub const SCHEMA_VERSION: u32 = 1;

/// Errore di registrazione.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RegistryError {
    /// Lo schema non supera la validazione.
    InvalidSchema(SchemaError),
    /// Esiste già uno strumento con lo stesso identificativo.
    DuplicateId(String),
}

impl fmt::Display for RegistryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            RegistryError::InvalidSchema(e) => write!(f, "schema non valido: {e}"),
            RegistryError::DuplicateId(id) => write!(f, "strumento già registrato: {id:?}"),
        }
    }
}

impl std::error::Error for RegistryError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            RegistryError::InvalidSchema(e) => Some(e),
            RegistryError::DuplicateId(_) => None,
        }
    }
}

impl From<SchemaError> for RegistryError {
    fn from(value: SchemaError) -> Self {
        RegistryError::InvalidSchema(value)
    }
}

/// Catalogo degli strumenti disponibili.
///
/// `BTreeMap` non è un dettaglio: garantisce che `catalog_json()` sia identico fra
/// esecuzioni diverse, quindi confrontabile nei test e nei log.
#[derive(Debug, Clone, Default)]
pub struct ToolRegistry {
    tools: BTreeMap<ToolId, ToolSchema>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    /// Registro con i quattro strumenti già presenti nell'editor.
    ///
    /// Gli id coincidono con i valori di `currentTool` nella UI (`brush`, `eraser`,
    /// `move`, `marquee`): è il ponte che la fase 3 userà senza rimappare nulla.
    pub fn with_builtins() -> Result<Self, RegistryError> {
        let mut registry = Self::new();
        for schema in builtins()? {
            registry.register(schema)?;
        }
        Ok(registry)
    }

    /// Registra uno strumento. Valida prima di inserire: nessuno stato parziale.
    pub fn register(&mut self, schema: ToolSchema) -> Result<(), RegistryError> {
        schema.validate()?;
        if self.tools.contains_key(&schema.id) {
            return Err(RegistryError::DuplicateId(schema.id.to_string()));
        }
        self.tools.insert(schema.id.clone(), schema);
        Ok(())
    }

    /// Strumento per id, `None` se non esiste (o se l'id non è valido).
    pub fn get(&self, id: &str) -> Option<&ToolSchema> {
        let key = ToolId::parse(id).ok()?;
        self.tools.get(&key)
    }

    pub fn contains(&self, id: &str) -> bool {
        self.get(id).is_some()
    }

    pub fn len(&self) -> usize {
        self.tools.len()
    }

    pub fn is_empty(&self) -> bool {
        self.tools.is_empty()
    }

    /// Strumenti in ordine di id.
    pub fn list(&self) -> impl Iterator<Item = &ToolSchema> + '_ {
        self.tools.values()
    }

    pub fn ids(&self) -> Vec<&str> {
        self.tools.keys().map(ToolId::as_str).collect()
    }

    /// JSON di un singolo strumento; `Ok(None)` se non è registrato.
    pub fn schema_json(&self, id: &str) -> Result<Option<String>, serde_json::Error> {
        match self.get(id) {
            Some(schema) => serde_json::to_string(schema).map(Some),
            None => Ok(None),
        }
    }

    /// Catalogo completo, nella forma che attraverserà il confine WASM:
    /// `{"schemaVersion":1,"tools":[...]}`.
    pub fn catalog_json(&self) -> Result<String, serde_json::Error> {
        let catalog = Catalog {
            schema_version: SCHEMA_VERSION,
            tools: self.list().collect(),
        };
        serde_json::to_string(&catalog)
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Catalog<'a> {
    schema_version: u32,
    tools: Vec<&'a ToolSchema>,
}

/// Parametri dei quattro strumenti esistenti, nelle stesse unità mostrate dalla UI:
/// raggio in pixel, durezza e opacità in percentuale.
fn builtins() -> Result<Vec<ToolSchema>, SchemaError> {
    Ok(vec![pennello()?, gomma()?, sposta()?, selezione()?])
}

fn pennello() -> Result<ToolSchema, SchemaError> {
    let mut schema = ToolSchema::new(
        "brush",
        "Pennello",
        "Disegna sul livello attivo con colore, durezza e opacità.",
    )?
    .with_shortcut("B")?;
    schema.add_param(ParamSpec::integer(
        "size",
        "Raggio",
        1,
        100,
        1,
        20,
        Some("px"),
    ))?;
    schema.add_param(ParamSpec::integer(
        "hardness",
        "Durezza",
        0,
        100,
        1,
        80,
        Some("%"),
    ))?;
    schema.add_param(ParamSpec::integer(
        "opacity",
        "Opacità",
        1,
        100,
        1,
        100,
        Some("%"),
    ))?;
    schema.add_param(ParamSpec::color("color", "Colore", "#22c55e"))?;
    Ok(schema)
}

fn gomma() -> Result<ToolSchema, SchemaError> {
    let mut schema = ToolSchema::new(
        "eraser",
        "Gomma",
        "Riporta a trasparente i pixel del livello attivo, senza colore.",
    )?
    .with_shortcut("E")?;
    schema.add_param(ParamSpec::integer(
        "size",
        "Raggio",
        1,
        100,
        1,
        20,
        Some("px"),
    ))?;
    schema.add_param(ParamSpec::integer(
        "hardness",
        "Durezza",
        0,
        100,
        1,
        80,
        Some("%"),
    ))?;
    schema.add_param(ParamSpec::integer(
        "opacity",
        "Opacità",
        1,
        100,
        1,
        100,
        Some("%"),
    ))?;
    Ok(schema)
}

fn sposta() -> Result<ToolSchema, SchemaError> {
    ToolSchema::new(
        "move",
        "Sposta",
        "Trascina il livello attivo; ogni spostamento è un comando annullabile.",
    )?
    .with_shortcut("V")
}

fn selezione() -> Result<ToolSchema, SchemaError> {
    ToolSchema::new(
        "marquee",
        "Selezione",
        "Definisce una selezione rettangolare: il pennello resta confinato ai suoi bordi.",
    )?
    .with_shortcut("M")
}
