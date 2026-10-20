// Pizzico — crates/raster/src/lib.rs
// Riferimento manifesto: §3.1, §4, §6.1
// Licenza: MIT OR Apache-2.0

//! # Pizzico Raster Engine
//!
//! Implementazioni verificate degli operatori e filtri raster:
//! - Separazione algoritmo e scheduling stile Halide (Ragan-Kelley et al., PLDI 2013)
//! - Filtro Mediano in O(1) con istogrammi a colonna (Perreault & Hébert, 2007)
//! - Sfocatura ricorsiva a tempo costante (Nehab et al., SIGGRAPH Asia 2011)
//! - Filtri sparsi ad alte prestazioni (Schuster et al., PACMCGIT 2020)
//! - Deformazione interattiva Liquify con Moving Least Squares (Schaefer et al., 2006)
//!
//! ## Riferimenti Scientifici (§6.1)
//! - Ragan-Kelley et al. (2013), *Halide*, PLDI.
//! - Perreault & Hébert (2007), *Median Filtering in Constant Time*, IEEE TIP.
//! - Nehab et al. (2011), *Constant-Time GPU Filter*, SIGGRAPH Asia.
//! - Schaefer et al. (2006), *Image Deformation Using Moving Least Squares*, SIGGRAPH.

pub mod liquify;
pub mod median;
pub mod pipeline;
pub mod recursive;
pub mod sparse;

pub use liquify::MovingLeastSquares;
pub use median::median_filter_o1;
pub use pipeline::RasterPipeline;
pub use recursive::box_blur_recursive;
