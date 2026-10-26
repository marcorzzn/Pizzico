//! # pizzart-io
//!
//! Esportazione: l'immagine composta diventa un file che qualcuno può aprire.
//!
//! Il confine è volutamente stretto: [`encode`] restituisce **byte**, non scrive
//! su disco. Chi chiama decide se quei byte vanno in un file, in una clipboard,
//! su stdout o in un upload — l'esportazione non ha opinioni sull'I/O.
//!
//! ```no_run
//! use pizzico_engine_io::{encode, ExportFormat, ExportOptions};
//! # fn f(img: &pizzico_engine_render::RenderedImage) -> Result<(), pizzico_engine_io::ExportError> {
//! let bytes = encode(img, ExportFormat::Png, &ExportOptions::default())?;
//! std::fs::write("out.png", bytes).unwrap();
//! # Ok(())
//! # }
//! ```

#![forbid(unsafe_code)]

pub mod export;

pub use export::{encode, ExportError, ExportFormat, ExportMetadata, ExportOptions};
