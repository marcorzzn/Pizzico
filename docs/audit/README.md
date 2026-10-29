# Technical Audits

Point-in-time audit records: what was measured, what the numbers were, what was
concluded, and what remains open. These documents are the project's evidence
trail and are intentionally left as written at the time — they are historical
records, not living documents.

| Document | Subject |
| --- | --- |
| [baseline-fusione.md](baseline-fusione.md) | Baseline measurements taken before the fusion, used as the reference point for later phases. |
| [consolidamento-2026-10-25.md](consolidamento-2026-10-25.md) | Consolidation audit of the workspace and repository layout. |
| [fase-1-trapianto.md](fase-1-trapianto.md) | Outcome of Phase 1: the Pizzart engine transplant and its test count. |
| [fase-4-1.md](fase-4-1.md) | Outcome of Phase 4.1: `EngineBackend` trait and the isolated legacy backend. |
| [fase-4-2-1.md](fase-4-2-1.md) | Outcome of Phase 4.2.1: history moved into the backend. |
| [fase-4-2-2.md](fase-4-2-2.md) | Outcome of Phase 4.2.2: v2 backend, `ReplacePixelCommand`, and JS contract parity. |
| [fase-4-2-3-1.md](fase-4-2-3-1.md) | Outcome of Phase 4.2.3.1: layer metadata and selection routed through the backend. |
| [gruppo-2-analisi.md](gruppo-2-analisi.md) | Analysis of the legacy stroke pipeline, including the 16 residual points. |
| [gruppo-2-handoff.md](gruppo-2-handoff.md) | Executable handoff note for finishing the stroke pipeline on the v2 backend. |
| [fase-7-ricognizione.md](fase-7-ricognizione.md) | Phase 7 reconnaissance: state of `apps/tauri`, missing Android toolchain, risks and a revised estimate. |
| [p1-arch-gate-1.md](p1-arch-gate-1.md) | Gate 1 of the modular refactor: command round-trip certification and the new declarative tool catalog. |
| [p1-arch-gate-2.md](p1-arch-gate-2.md) | Gate 2 of the modular refactor: WASM catalog exports, typed TypeScript boundary and the Node parity test. |

Supporting evidence in this directory:

- `photopea-verified-canvas-layers.png` — screenshot of the PSD layer structure
  verified in Photopea.
- `psd-writer-tests.txt` — captured output of the PSD writer test suite.

## Reading order

For the current state of the project, read `gruppo-2-handoff.md` first: it
describes the open work. The `fase-*` documents build up to it chronologically.
