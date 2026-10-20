<!--
Pizzico — docs/_legacy/README.md
Riferimento manifesto: §11 Step 1
Licenza: MIT OR Apache-2.0
-->

# Archivio Legacy e Note di Ricerca Pregresse

Questo direttorio (`docs/_legacy/`) racchiude file, appunti, script di esplorazione, benchmark e materiali di ricerca storici antecedenti alla stesura e all'adozione del **Manifesto Programmatico del Progetto Pizzico** (§1, §2).

## Contenuto Archiviato

1. **`old_docs/`**: Documenti di analisi e specifiche preliminari (`STATO-PROGETTO.md`, `architettura-offline-first.md`, `roadmap-definitiva.md`, `schema-documento-v2.md`, ecc.).
2. **`_re/`**, **`analisi picsart/`**, **`picsart-apk/`**, **`photopea-web/`**, **`rea-replay/`**: Tracce di osservazione comportamentale e disassemblaggio preliminare (soggette alle regole vincolanti di Clean Room descritte in §7 del Manifesto).
3. **`bench/`**: Benchmark empirici storici su Canvas2D / WebGL pre-WASM.
4. **`src/`**, **`legacy/`**, **`server.ts`**, **`vite.config.ts`**: Vecchi prototipi JavaScript / TypeScript non basati sull'architettura Rust-WASM invariante (§3).

> **Nota di conformità Clean Room (§7)**:  
> Nessun codice presente in questa cartella può essere importato o copiato direttamente nel nuovo motore di produzione di Pizzico. Tutto il nuovo codice deve essere scritto ex-novo secondo le specifiche scientifiche, i paper citati in §6 e la metodologia Clean Room documentata in `docs/clean-room/`.
