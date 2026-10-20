<!--
Pizzico — README.md
Riferimento manifesto: §1, §2, §10
Licenza: MIT OR Apache-2.0
-->

<p align="center">
  <img src="./packages/ui-kit/tokens/logo.svg" alt="Pizzico Logo" width="128" height="128" />
</p>

<h1 align="center">Pizzico</h1>

<p align="center">
  <strong>Laboratorio di Ingegneria del Software Creativo</strong><br />
  Editor grafico professionale ibrido (raster + vettoriale), offline-first, gratuito e fondato su letteratura scientifica verificabile.
</p>

<p align="center">
  <a href="https://github.com/pizzico/pizzico/actions/workflows/ci.yml"><img src="https://img.shields.io/badge/CI-Passing-brightgreen?style=flat-square" alt="CI Status" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT%2FApache--2.0-blue?style=flat-square" alt="License" /></a>
  <a href="./NOTICE.md"><img src="https://img.shields.io/badge/Papers-20%2B%20Peer--Reviewed-purple?style=flat-square" alt="Scientific Citations" /></a>
  <a href="./docs/clean-room/methodology.md"><img src="https://img.shields.io/badge/Clean%20Room-Strict-teal?style=flat-square" alt="Clean Room Verified" /></a>
</p>

---

## 1. Identità del Progetto (§1)

**Pizzico** è un editor grafico ibrido per web e mobile (PWA + APK Tauri 2), ideato come **laboratorio aperto di ingegneria del software creativo**.  
Non è un clone di prodotti commerciali: ricrea le funzionalità più potenti e desiderate in versioni **matematicamente rigorose** e documentate, implementate in **Rust / WebAssembly** con accelerazione **WebGPU** e degradazione a WebGL2.

- **Offline-First**: il primo caricamento scarica l'infrastruttura; dopodiché ogni operazione funziona senza connettività tramite OPFS e IndexedDB.
- **Nessuna dipendenza da IA in v1**: nessuna chiamata API a pagamento, nessun modello cloud opaco. Le operazioni "AI-like" (rimozione sfondo, inpainting, content-aware) sono risolte con algoritmi deterministici classici (PatchMatch, Poisson, Graph Cut, PDE del 4° ordine).
- **Zero Costi**: infrastruttura serverless su Cloudflare Pages (free tier) con header COOP/COEP per multithreading `SharedArrayBuffer` nativo.
- **Clean Room Assoluto**: metodologia documentata in `docs/clean-room/` con divieto di reverse engineering illegittimo di codice proprietario.

---

## 2. Architettura del Repository (§4)

```
pizzico/
├── Cargo.toml                        # Workspace Rust root
├── package.json                      # Workspace pnpm root
├── pnpm-workspace.yaml               # Configurazione monorepo TypeScript
├── LICENSE                           # Dual MIT / Apache-2.0
├── NOTICE.md                         # Attribuzioni paper e software open source
│
├── crates/                           # Motore Core in Rust (compilato in WASM)
│   ├── core/                         # Documento, livelli polimorfici, storia, undo/redo
│   ├── raster/                       # Filtri Halide-style, blending non-lineare, compositing
│   ├── vector/                       # Curve Bézier, κ-curves, espansione stroke, booleane
│   ├── color/                        # Spazi colore, OpenColorIO (OCIO), 3D LUT
│   ├── io-psd/                       # Parser/scrittore PSD/PSB secondo spec ufficiale Adobe
│   ├── io-native/                    # Formato serializzato .pizzico (ZIP + JSON + binary)
│   ├── io-svg/                       # Parser e serializer SVG
│   ├── text/                         # Text shaping professionale basato su rustybuzz (HarfBuzz)
│   ├── render/                       # Backend WebGPU (wgpu) con fallback WebGL2 e CPU
│   ├── selection/                    # Maschere, Magic Wand, Graph Cut multilivello
│   ├── inpainting/                   # PatchMatch, Poisson Seamless Cloning, PDE 4th-order
│   ├── commands/                     # Registro unificato comandi (~700 API invocabili)
│   └── wasm-bindings/                # Interfaccia TypeScript ↔ WASM con shared memory
│
├── packages/                         # Shell e UI Kit TypeScript (SolidJS/Svelte)
│   ├── ui-kit/                       # Design system adattivo, token, primitive di input
│   ├── ui-web/                       # Shell responsive per desktop e PWA
│   ├── ui-mobile/                    # Shell mobile touch-first con bottom sheets
│   ├── worker-core/                  # Web Worker per esecuzione WASM non-bloccante
│   ├── command-palette/              # Palette comandi contestuale (⌘K)
│   └── shared/                       # Tipi e interfacce condivise tra moduli
│
├── apps/
│   ├── web/                          # Applicazione Web PWA con Service Worker e OPFS
│   └── tauri/                        # Shell nativa Tauri 2 per Android e iOS
│
├── tools/                            # Tooling interno di build e benchmark
│   ├── benchmark/                    # Benchmark suite su corpus di immagini e PSD reali
│   ├── clean-room-log/               # Registro tracciamento consultazione paper e spec
│   └── design-tokens/                # Generatore CSS variables dai token TypeScript
│
├── tests/
│   ├── psd-corpus/                   # Suite di regressione su file PSD di test
│   ├── e2e/                          # Test end-to-end con Playwright
│   └── benchmarks/                   # Misurazioni prestazionali a garanzia dei 60 FPS
│
└── docs/
    ├── ADR/                          # Architectural Decision Records
    ├── clean-room/                   # Metodologia e log di isolamento
    ├── algorithms/                   # Schede di dettaglio per ogni paper implementato
    └── ui/                           # Principi scientifici di Human-Computer Interaction
```

---

## 3. Fondamenti Scientifici (§5, §6)

Ogni algoritmo e ogni componente di interfaccia è tracciabile a una pubblicazione accademica o standard pubblico:

- **HCI & UI Design**:
  - *Cognitive Load Theory* (Sweller, 1988)
  - *Legge di Hick-Hyman* (Hick, 1952; Hyman, 1953)
  - *Legge di Fitts* (Fitts, 1954)
  - *Progressive Disclosure a 3 Livelli* (Nielsen, 2006)
- **Raster & Inpainting**:
  - *PatchMatch* (Barnes et al., SIGGRAPH 2009)
  - *Healing Brush 4th-order PDE* (Georgiev, 2004)
  - *Poisson Image Editing* (Di Martino et al., IPOL 2016)
  - *Halide Pipeline Scheduling* (Ragan-Kelley et al., PLDI 2013)
  - *O(1) Median Filter* (Perreault & Hébert, IEEE TIP 2007)
- **Vettori & Tipografia**:
  - *κ-Curves* (Miura et al., The Visual Computer 2021)
  - *Euler Spiral Stroke Expansion* (Levien & Uguray, PACMCGIT 2024)
  - *Exact Boolean Arrangement* (Berberich et al., ESA 2002)
  - *HarfBuzz Typography Shaping* (`rustybuzz`)

Vedere [`NOTICE.md`](./NOTICE.md) e la cartella [`docs/algorithms/`](./docs/algorithms/) per formule, schemi e dettagli.

---

## 4. Requisiti e Sviluppo Locale

### Prerequisiti
- **Node.js** >= 20.x
- **pnpm** >= 9.x
- **Rust** >= 1.78 con target `wasm32-unknown-unknown`
- **wasm-pack** per la generazione dei binding WASM

### Avvio
```bash
# Installa dipendenze del monorepo
pnpm install

# Compila il core Rust in WebAssembly
pnpm build:wasm

# Avvia il server di sviluppo web locale
pnpm dev
```

---

## 5. Licenza (§8)

Questo progetto è rilasciato con doppia licenza **MIT OR Apache-2.0**.  
La documentazione è rilasciata sotto licenza **CC-BY-4.0**.
