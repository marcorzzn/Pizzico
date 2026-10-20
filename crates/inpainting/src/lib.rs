// Pizzico — crates/inpainting/src/lib.rs
// Riferimento manifesto: §3.1, §4, §6.1
// Licenza: MIT OR Apache-2.0

//! # Pizzico Inpainting Engine
//!
//! Algoritmi di rimozione e ricostruzione matematica:
//! - Content-Aware Fill basato su PatchMatch (Barnes et al., SIGGRAPH 2009)
//! - Healing Brush con PDE del 4° ordine (Georgiev, 2004)
//! - Seamless Cloning Poisson con condizioni di Dirichlet (Di Martino et al., IPOL 2016)
//!
//! ## Riferimenti (§6.1)
//! - Barnes et al. (2009), *PatchMatch*, SIGGRAPH.
//! - Georgiev (2004), *Healing Brush*, SIGGRAPH Course Notes.
//! - Di Martino et al. (2016), *Poisson Image Editing*, IPOL.

pub mod healing;
pub mod patchmatch;
pub mod poisson;

pub use healing::solve_4th_order_pde_healing;
pub use patchmatch::PatchMatch;
pub use poisson::poisson_seamless_clone;
