// Pizzico — crates/commands/src/lib.rs
// Riferimento manifesto: §3.1, §4, §5.5
// Licenza: MIT OR Apache-2.0

//! # Pizzico Command System
//!
//! Registro comandi unificato (~700 comandi):
//! - Comandi manipolazione livelli
//! - Comandi filtri raster
//! - Comandi trasformazione geometrica
//! - Comandi regolazione colore
//! - Esecutore con integrazione Undo/Redo

pub mod executor;
pub mod registry;

pub use executor::CommandExecutor;
pub use registry::{CommandDescriptor, CommandRegistry};
