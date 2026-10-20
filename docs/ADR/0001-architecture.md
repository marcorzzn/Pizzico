<!--
Pizzico — docs/ADR/0001-architecture.md
Riferimento manifesto: §3, §4, §11 Step 6
Licenza: MIT OR Apache-2.0
-->

# ADR 0001: Architettura Invariante del Progetto Pizzico

## Stato
**Accettata (Invariante)** — Manifesto Programmatico §3

## Contesto
Pizzico si propone come laboratorio di ingegneria del software per sintetizzare capacità raster professionali, disegno vettoriale avanzato e reattività macro in un'unica applicazione gratuita, offline-first e priva di modelli IA o backend cloud a pagamento.

## Decisioni Architetturali

1. **Core Engine in Rust / WebAssembly**:
   - Compilazione del motore computazionale con target `wasm32-unknown-unknown`.
   - Isolamento di calcoli complessi in Web Worker dedicati con `SharedArrayBuffer` per eliminare l'overhead di garbage collection e memory copying.
2. **Rendering Hardware Accelerato (WebGPU + WebGL2 Fallback)**:
   - Utilizzo di `wgpu` per accedere a WebGPU nativo nel browser con fallback automatico a WebGL2 su dispositivi obsoleti.
   - Pipeline vettoriale GPU *Stencil-then-Cover* (Kilgard & Bolz 2012) per renderizzare contorni complessi a 60 FPS.
3. **Persistenza Offline-First**:
   - Salvataggio dei progetti tramite OPFS (Origin Private File System) ad altissimo throughput e IndexedDB.
4. **Shell Utente Ibrida (PWA + Tauri 2)**:
   - Frontend web PWA reattivo e modulare (TypeScript).
   - Shell mobile Tauri 2 (Android/iOS) con WebView nativa di sistema per generare pacchetti APK compatti senza Chromium embedded.
5. **Formato Nativo .pizzico**:
   - Container compresso ZIP contenente manifest descrittivo JSON e blob raw dei pixel.
6. **Infrastruttura di Deploy Serverless a Costo Zero**:
   - Hosting statico su Cloudflare Pages con header COOP (`same-origin`) e COEP (`require-corp`) abilitati per sbloccare i thread WASM nativi.

## Conseguenze
- Totale indipendenza da server proprietari Adobe o servizi cloud commerciali.
- Manutenibilità scientifica tracciabile su paper e standard aperti.
- Portabilità universale (browser desktop, mobile, tablet, APK standalone).
