// Pizzico — crates/render/src/lib.rs
// Riferimento manifesto: §3.1, §4, §6.2
// Licenza: MIT OR Apache-2.0

//! # Pizzico Render Engine
//!
//! Pipeline di rendering grafico con supporto multi-backend:
//! - WebGPU nativo e WASM via `wgpu`
//! - Pipeline Stencil-then-Cover per vettori (Kilgard & Bolz, SIGGRAPH 2012)
//! - CPU fallback per ambienti headless
//!
//! ## Riferimenti (§6.2)
//! - Kilgard, M. J. & Bolz, J. (2012), *GPU-Accelerated Path Rendering*, ACM TOG.

pub mod gpu_context;
pub mod stencil_cover;

pub use gpu_context::GpuContext;
pub use stencil_cover::StencilCoverPipeline;
