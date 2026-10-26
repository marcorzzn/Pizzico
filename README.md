<p align="center">
  <img src="./packages/ui-kit/tokens/logo.svg" alt="Pizzico Logo" width="128" height="128" />
</p>

<h1 align="center">Pizzico</h1>

<p align="center">
  <strong>A professional, offline-first graphics editor for the web and mobile, built in Rust + WebAssembly.</strong><br />
  <em>No AI, no cloud dependencies, no subscription. 100% free and open-source.</em>
</p>

<p align="center">
  <a href="https://github.com/marcorzzn/Pizzico/actions/workflows/ci.yml"><img src="https://github.com/marcorzzn/Pizzico/actions/workflows/ci.yml/badge.svg" alt="CI Status" /></a>
  <a href="https://pizzico.pages.dev"><img src="https://img.shields.io/badge/Live_Demo-pizzico.pages.dev-success?style=flat-square&logo=cloudflare" alt="Live Demo" /></a>
  <a href="./LICENSE-MIT"><img src="https://img.shields.io/badge/License-MIT%2FApache--2.0-blue?style=flat-square" alt="License: MIT / Apache-2.0" /></a>
  <a href="./NOTICE.md"><img src="https://img.shields.io/badge/Papers-20%2B%20Peer--Reviewed-purple?style=flat-square" alt="Scientific Citations" /></a>
  <a href="./docs/clean-room/methodology.md"><img src="https://img.shields.io/badge/Clean%20Room-Strict-teal?style=flat-square" alt="Clean Room Verified" /></a>
</p>

---

## Overview

**Pizzico** is a high-performance raster and vector graphics editor designed from the ground up to run locally in your browser and on mobile devices. Powered by a pure-Rust core compiled to WebAssembly with WebGPU hardware acceleration, Pizzico delivers desktop-grade editing with zero cloud lock-in.

- **Offline-First & Local Storage**: Loads instantly from cache and saves your work locally via the Origin Private File System (OPFS) and IndexedDB.
- **Full Photoshop PSD Compatibility**: Full import and export of Adobe Photoshop PSD files with layers, blend modes, and opacity, independently verified with Adobe Photoshop and Photopea.
- **Deterministic & Scientific**: No opaque AI API calls or paid cloud inference. Advanced features use verified, peer-reviewed computer science literature.
- **Zero Cost & Free**: Dual-licensed under MIT and Apache-2.0.

---

## Showcase

<p align="center">
  <img src="docs/assets/photopea-validation.png" alt="Photopea PSD Validation" width="85%" />
  <br />
  <em>Adobe Photoshop PSD Export: Verified in Photopea with preserved layer hierarchy, blend modes, and opacity.</em>
</p>

<p align="center">
  <img src="docs/assets/feature-selection.png" alt="Layer Management and Selection" width="48%" />
  <img src="docs/assets/feature-export.png" alt="Multi-format Export Pipeline" width="48%" />
</p>

---

## Features

- **PSD Codec**: Import and export layered `.psd` files (PackBits RLE compression, tagged blocks `luni`, `lyid`, `lsct`).
- **Layer Engine**: Full raster and vector layer stack with 24 blend modes, opacity, visibility toggles, and reordering.
- **High-Performance Brush**: Pressure-sensitive, anti-aliased continuous strokes running at 60 FPS.
- **Undo / Redo History**: Bounding-box-optimized atomic undo/redo with instant memory rollback.
- **Precision Selection**: Rectangular selection marquee with clipping mask constraints.
- **Multi-Format Export**: Export to PNG, JPEG, WebP, and layered PSD.
- **Persistence**: Automatic background saving using the Origin Private File System (OPFS) and IndexedDB fallback.
- **WebGPU Rendering**: Compute-shader compositing with graceful WebGL2 and Canvas fallback.
- **PWA & Mobile Ready**: Progressive Web App installable on any modern desktop or smartphone.

---

## Quick Start

### Online Demo
Try Pizzico directly in your browser without installation:
👉 **[https://pizzico.pages.dev](https://pizzico.pages.dev)**

### Local Development

#### Prerequisites
- **Node.js** >= 20.x
- **pnpm** >= 9.x
- **Rust** >= 1.78 with the `wasm32-unknown-unknown` target
- **wasm-pack**: `cargo install wasm-pack`

#### Clone and Run
```bash
# Clone the repository
git clone https://github.com/marcorzzn/Pizzico.git
cd Pizzico

# Install workspace dependencies
pnpm install

# Build the Rust core to WebAssembly
pnpm build:wasm

# Start the local development server
pnpm dev
```

Open `http://localhost:5173` in your browser.

---

## Architecture

Pizzico employs a modular clean-room architecture separating the memory-safe computational core from the web shell:

```mermaid
graph TD
    subgraph UI ["Frontend Shell (TypeScript + Vite)"]
        UI_Web["apps/web (PWA Shell)"]
        UI_Components["packages/ui-web (UI Components)"]
        Worker["packages/worker-core (Web Worker)"]
    end

    subgraph WASM ["WebAssembly Bridge"]
        Bindings["crates/wasm-bindings"]
    end

    subgraph Core ["Rust Core Engine"]
        Core_Doc["pizzico-core (Document, Layers, History)"]
        Raster["pizzico-raster (Compositing & Blending)"]
        PSD["pizzico-io-psd (Adobe PSD Parser & Writer)"]
        Color["pizzico-color (Color Spaces & LUTs)"]
        Render["pizzico-render (WebGPU Pipeline)"]
    end

    UI_Web --> UI_Components
    UI_Components --> Worker
    Worker --> Bindings
    Bindings --> Core_Doc
    Core_Doc --> Raster
    Core_Doc --> PSD
    Core_Doc --> Color
    Core_Doc --> Render
```

---

## Documentation

- **[Architectural Decision Records (ADR)](docs/ADR/)**: Design choices, tradeoffs, and system evolution.
- **[Algorithm References](docs/algorithms/)**: Mathematical specifications and paper citations for every algorithm.
- **[Milestone Progress](docs/milestones/)**: Phase milestones, verification criteria, and test logs.
- **[Clean-Room Methodology](docs/clean-room/methodology.md)**: Intellectual property isolation and provenance tracking.

---

## Contributing

We welcome contributions! Please review [CONTRIBUTING.md](CONTRIBUTING.md) for details on code style, commit conventions, testing requirements, and submission processes.

---

## License

Pizzico is dual-licensed under:
- **MIT License** ([LICENSE-MIT](LICENSE-MIT) or [http://opensource.org/licenses/MIT](http://opensource.org/licenses/MIT))
- **Apache License, Version 2.0** ([LICENSE-APACHE](LICENSE-APACHE) or [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0))

All documentation is licensed under **Creative Commons Attribution 4.0 International (CC-BY-4.0)**.

---

## Live Demo

Try Pizzico now: [https://pizzico.pages.dev/](https://pizzico.pages.dev/)  
Works offline after first load. Import a PSD to get started.
