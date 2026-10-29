// Pizzico — crates/tools/src/lib.rs
// Licenza: MIT OR Apache-2.0

//! # pizzico-tools
//!
//! Catalogo dichiarativo degli strumenti dell'editor.
//!
//! Uno strumento è descritto da un [`ToolSchema`]: identificativo stabile, etichetta,
//! descrizione, scorciatoia e parametri tipizzati. Il catalogo non esegue nulla e non
//! dipende da un motore: è il contratto che il bridge WASM esporrà alla UI, che potrà
//! generare i controlli dai dati invece di cablarli in TypeScript.
//!
//! ## Perché esiste
//!
//! Prima di questo crate, aggiungere uno strumento significava modificare insieme il
//! motore, il bridge e `main.ts`, con tre punti che potevano divergere. Qui la
//! descrizione è separata dal comportamento: il comportamento resta nei crate del
//! motore, la descrizione è una sola e viene validata.
//!
//! ## Esempio
//!
//! ```
//! use pizzico_tools::ToolRegistry;
//!
//! let registry = ToolRegistry::with_builtins().expect("i builtin sono validi");
//! assert_eq!(registry.ids(), ["brush", "eraser", "marquee", "move"]);
//!
//! let json = registry.catalog_json().expect("serializzazione");
//! assert!(json.contains("\"schemaVersion\":1"));
//! ```
//!
//! ## Cosa non fa
//!
//! - Non carica plugin a runtime: in `wasm32-unknown-unknown` non esiste caricamento
//!   dinamico di codice. Un nuovo strumento è un modulo Rust registrato alla
//!   compilazione; ciò che è dichiarativo è lo **schema**, non l'esecuzione.
//! - Non esegue i parametri: la conversione verso le unità del motore e il disegno
//!   appartengono al confine di esecuzione (fase 3). Lo schema usa le unità mostrate
//!   all'utente, che sono quelle che la UI già conosce.
//!
//! Decisione e alternative: `docs/ADR/0008-tool-registry.md`.

#![forbid(unsafe_code)]

mod registry;
mod schema;

pub use registry::{RegistryError, ToolRegistry, SCHEMA_VERSION};
pub use schema::{ChoiceOption, ParamSpec, ParseError, SchemaError, ToolId, ToolSchema};
