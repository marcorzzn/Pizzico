// Pizzico — crates/render/src/stencil_cover.rs
// Riferimento manifesto: §6.2
// Licenza: MIT OR Apache-2.0

//! Algoritmo Stencil-then-Cover per il rendering vettoriale GPU-accelerato (Kilgard & Bolz, SIGGRAPH 2012).
//!
//! Pass 1 (Stencil): Scrive nel buffer stencil con operazione di inversione/incremento
//! senza modificare il color buffer.
//! Pass 2 (Cover): Esegue il raster del bounding box / triangoli di copertura,
//! scrivendo il colore finale solo sui pixel con stencil != 0.

pub struct StencilCoverPipeline;

impl StencilCoverPipeline {
    pub const WGSL_SHADER: &'static str = r#"
        struct VertexOutput {
            @builtin(position) position: vec4<f32>,
            @location(0) uv: vec2<f32>,
        };

        @vertex
        fn vs_main(@location(0) pos: vec2<f32>) -> VertexOutput {
            var out: VertexOutput;
            out.position = vec4<f32>(pos, 0.0, 1.0);
            out.uv = pos * 0.5 + 0.5;
            return out;
        }

        @fragment
        fn fs_cover(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
            return vec4<f32>(0.2, 0.4, 0.8, 1.0);
        }
    "#;
}
