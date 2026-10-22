# 📊 STATO DEL PROGETTO — "PIZZICO"

> **Data aggiornamento**: 2026-10-21  
> **Riferimento Manifesto**: §3 (Architettura C4), §4 (Specifiche Rust), §6.2 (WebGPU Kilgard & Bolz 2012), §11 (Piano di Rilascio), §12 (Regole Non Negoziabili)

---

## 1. Riepilogo Avanzamento

| Componente | Stato | Dettagli |
|---|---|---|
| **Workspace Rust (13 crate)** | ✅ Compilato & Conforme | `pizzico-core`, `pizzico-brush`, `pizzico-render`, `pizzico-wasm-bindings`, ecc. compilano correttamente |
| **Bridge WASM (`wasm-bindgen`)** | ✅ Architettura Ripristinata | Rimosso JS/TS manuale. `lib.rs` implementa le macro ufficiali `#[wasm_bindgen]`, `add()`, `pizzico_version()`, `PizzicoEngine`, `init_webgpu()`. |
| **Pipeline WebGPU in Rust** | ✅ Architettura Ripristinata | La logica GPU (Adapter, Device, Queue, Surface context, shader WGSL, loop RAF a 60 FPS) è collocata interamente nel core Rust (`crates/wasm-bindings/src/gpu/render.rs`). `apps/web/src/main.ts` delega tutto a Rust. |
| **Frontend Monorepo (pnpm)** | ✅ Validato | `pnpm typecheck` su tutti i package superato con 0 errori. `pnpm build` produce il bundle Vite di produzione. |

---

## 2. Risoluzione Violazioni Architetturali (§3 e §12)

Nel rispetto assoluto del Manifesto, sono state rimosse le due scorciatoie temporanee:

### 2.1 Standardizzazione `wasm-bindgen`
- **File rimossi/riscritti**: I placeholder manuali precedenti sono stati eliminati o sostituiti con l'interfaccia standard wasm-pack.
- **`crates/wasm-bindings/src/lib.rs`**: Esporta con `#[wasm_bindgen]` i punti di contatto formali:
  - `init_panic_hook()` per backtrace leggibili in DevTools.
  - `add(a, b)` e `pizzico_version()` per verifica §11 Step 8.
  - `PizzicoEngine` con costruttore e gestione documenti/livelli.
  - `init_webgpu(canvas_id: &str)` per il rendering WebGPU.
- **`packages/worker-core/src/index.ts`**: Importa canonicamente da `../pkg/`.

### 2.2 Core Engine in Rust per WebGPU (§6.2)
- **`apps/web/src/main.ts`**: Spogliato di ogni implementazione WebGPU JS diretta. Il TypeScript si occupa unicamente della shell UI (`DesktopShellLayout`), dell'inizializzazione del modulo e di invocare `await init_webgpu('pizzico-canvas')`.
- **`crates/wasm-bindings/src/gpu/render.rs`**: Contiene la pipeline grafica nativa:
  - Shader WGSL (§6.2) con palette brand Pizzico (Indigo `#4f46e5`, Cyan `#06b6d4`, Rose `#f43f5e`, Purple `#9333ea`).
  - Richiesta Adapter GPU ad alte prestazioni (`powerPreference: high-performance`).
  - Configurazione `GPUCanvasContext` sul canvas con gestione HiDPI.
  - Creazione `RenderPipeline` con blending alpha.
  - Ciclo continuo di animazione a 60 FPS gestito con `Closure` Rust e `requestAnimationFrame`.

---

## 3. Chiusura Ufficiale Fase 0 e Patch Desktop Heap

La compilazione del binario WASM reale tramite `wasm-pack` è stata completata con successo:
- **Binario generato**: `packages/worker-core/pkg/pizzico_wasm_bindings_bg.wasm` (83.4 kB, ottimizzato).
- **Patch Desktop Heap Windows (ADR 0003)**: Integrata in `tools/patches/rustversion` per consentire la compilazione automatizzata e tracciata in `NOTICE.md`.
- **Milestone Documentata**: Vedere `docs/milestones/fase-0.md` per l'analisi dettagliata e lo screenshot di validazione nel browser reale.

---

## 4. Prossimi Passi (Manifesto §11)

1. **Step 9 — Motore Pennelli & Stamp Rendering**:
   - Collegamento di `pizzico-brush` con campionamento d'arco e compositing sub-pixel.
2. **Step 10 — Gestione Livelli e Storico Annulla/Ripeti**:
   - `CommandRegistry` e snapshotting non distruttivo (`pizzico-commands`).
3. **Step 11 — Inpainting Clean-Room**:
   - Algoritmo PatchMatch / Navier-Stokes implementato in `pizzico-inpainting`.
