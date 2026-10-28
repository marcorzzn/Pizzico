<p align="center">
  <img src="docs/brand/icona-pizzico.png" alt="pizzico logo" width="128" height="128" />
</p>

<h1 align="center">pizzico</h1>

<p align="center">
  <strong>A professional, offline-first graphics editor for the web and mobile, built in Rust + WebAssembly.</strong><br />
  <em>No AI, no cloud dependencies, no subscription. 100% free and open-source.</em><br />
  <em>Created by <strong>Marco Razzano</strong>.</em>
</p>

<p align="center">
  <a href="https://github.com/marcorzzn/Pizzico/actions/workflows/ci.yml"><img src="https://github.com/marcorzzn/Pizzico/actions/workflows/ci.yml/badge.svg" alt="CI Status" /></a>
  <a href="https://pizzico.pages.dev"><img src="https://img.shields.io/badge/Live_Demo-pizzico.pages.dev-success?style=flat-square&logo=cloudflare" alt="Live Demo" /></a>
    <a href="https://github.com/marcorzzn/pizzico/releases"><img
    src="https://img.shields.io/github/v/release/marcorzzn/pizzico?style=flat-square&label=release"
    alt="Latest release" /></a>
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
  <img src="docs/assets/screenshot-01-overview.png" alt="pizzico — editor with a layered document open" width="92%" />
  <br />
  <em>The editor in the browser: tool strip in the top bar, canvas, inspector and layer panel on the right.</em>
</p>

<p align="center">
  <img src="docs/assets/screenshot-02-inspector.png" alt="pizzico — inspector panel" width="24%" />
  <img src="docs/assets/screenshot-03-mobile.png" alt="pizzico on a phone-sized viewport" width="28%" />
  <br />
  <em>Left: the inspector. Right: the same interface on a 390px viewport, with a collapsible panel.</em>
</p>

<p align="center">
  <img src="docs/assets/photopea-validation.png" alt="Photopea PSD Validation" width="85%" />
  <br />
  <em>A PSD exported by pizzico, opened in Photopea with layer hierarchy, blend modes and opacity intact.</em>
</p>

## Features

- **PSD Codec**: Import and export layered `.psd` files (PackBits RLE compression, tagged blocks `luni`, `lyid`, `lsct`).
- **Layer Engine**: Full raster and vector layer stack with 24 blend modes, opacity, visibility toggles, and reordering.
- **High-Performance Brush**: Pressure-sensitive, anti-aliased continuous strokes running at 60 FPS.
- **Undo / Redo History**: Bounding-box-optimized atomic undo/redo with instant memory rollback.
- **Precision Selection**: Rectangular selection marquee with clipping mask constraints.
- **Multi-Format Export**: Export to PNG, JPEG, WebP, and layered PSD.
- **Persistence**: Automatic background saving using the Origin Private File System (OPFS) and IndexedDB fallback.
- **WebGPU Rendering**: Compute-shader compositing with graceful WebGL2 and Canvas fallback.
- **Purpose-built interface**: dark theme, Lucide SVG icon set, no emoji anywhere, and a single accent colour reserved for state and focus.
- **PWA & Mobile Ready**: Progressive Web App installable on any modern desktop or smartphone.

---

## Status

| Area | State |
| --- | --- |
| Phase 0 — foundation | Complete. |
| Phase 1 — raster editor | Complete: brush, selection, layers, undo/redo, persistence, export. |
| Phase 1.5 — colour management | Complete: sRGB, Display P3, OkLab, ICC. |
| Phase 6 — interface redesign | Complete: flat light theme (egui style), Lucide icon set, single accent, zero emoji. |
| Phase 7 — Android (Tauri) | Early preview: a signed APK is built in CI. Touch UI adaptation in progress. |
| Document crop | Core implemented and covered by tests; the UI tool is in progress. |
| Vector shapes, text | Planned. Design options recorded in ADR-0005 and ADR-0006. |
| Transform (rotate, scale, flip) | Planned. The compositor only applies integer offsets today; see ADR-0007. |
| Engine v2 | In progress: the legacy stroke pipeline is not handed off yet. |

The live demo tracks `master`: every push to the default branch is built and deployed to
Cloudflare Pages.

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

---

## Android (early preview)

pizzico builds an Android APK entirely in GitHub Actions — no local Android
toolchain is needed.

- Signed APK, downloadable from the latest workflow run or release.
- Known limitation: the touch UI adaptation is in progress; the layout works on
  a phone-sized viewport but the editing tools are still mouse-first.
- Requires Android 8.0+ (min SDK 26). Identifier: `io.github.marcorzzn.pizzico`.

[Download an APK from the releases page](https://github.com/marcorzzn/pizzico/releases)

## Credits

Created by Marco Razzano ([@marcorzzn](https://github.com/marcorzzn)).

Licensed under MIT OR Apache-2.0. See [LICENSE-MIT](LICENSE-MIT) and [LICENSE-APACHE](LICENSE-APACHE).
