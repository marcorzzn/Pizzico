<!--
Pizzico — crates/render/README.md
Riferimento manifesto: §3.1, §4, §6.2
Licenza: MIT OR Apache-2.0
-->

# pizzico-render

Backend di rendering hardware accelerato di Pizzico:
- **WebGPU primario** (tramite `wgpu` target WASM e nativo) per calcolo parallelo, blending e compositing GPU.
- **Fallback WebGL2**: degradazione automatica per browser/dispositivi senza WebGPU.
- **Stencil-then-Cover**: Rendering vettoriale ad alte prestazioni per curve e path complessi (Kilgard & Bolz, SIGGRAPH 2012).
