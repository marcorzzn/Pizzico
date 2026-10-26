<!--
Pizzico — docs/_legacy/README.md
Riferimento manifesto: §11 Step 1
Licenza: MIT OR Apache-2.0
-->

# Archivio Legacy e Note di Ricerca Pregresse

Questo direttorio (`docs/_legacy/`) racchiude file, appunti, script di esplorazione,
benchmark e materiali di ricerca storici antecedenti all'adozione del **Manifesto
Programmatico del Progetto Pizzico** (§1, §2).

## Cosa è rimasto qui

1. **`old_docs/`** — documenti di analisi e specifiche preliminari
   (`STATO-PROGETTO.md`, `architettura-offline-first.md`, `roadmap-definitiva.md`,
   `schema-documento-v2.md`, ecc.).
2. **`bench/`** — benchmark empirici storici su Canvas2D / WebGL pre-WASM.
3. **`src/`**, **`legacy/`** — vecchi prototipi JavaScript / TypeScript non basati
   sull'architettura Rust-WASM (§3).
4. **`rea-replay/`**, **`public/`**, **`.dsh/`** — tracce di sessione e materiale
   di supporto.

## Cosa è stato spostato (2026-10-26) e dove si trova

Il materiale pesante e non pubblicabile **non è stato eliminato**: è stato spostato
nell'archivio personale fuori dai repository.

| Era in `docs/_legacy/` | Ora in |
|---|---|
| `picsart-apk/` (174.053 file, 2,10 GB) | `C:\Progetti\_Archivio-Personale-Pizzart\2-decompilato\picsart-apk\` |
| `output_analisi/` (2.936 file, 433 MB) | `...\2-decompilato\output-analisi\` |
| `analisi picsart/` (APK originale, 88 MB) | `...\1-apk-originale\analisi-picsart\` |
| `_re/` (95 file, 88 MB) | `...\2-decompilato\reverse-engineering\` |
| `photopea-web/` (88 file, 53 MB) | `...\7-terze-parti\photopea-web\` |

Motivo: quei materiali non devono stare dentro un repository che ha un remote
pubblico (`origin` → GitHub), nemmeno se ignorati da git. La separazione fisica è
più solida di una regola in `.gitignore`.

L'archivio contiene anche le **specifiche recuperate** (`4-spec-aggregate/`),
i report (`5-report-analisi/`), la metodologia (`6-metodologia.md`) e il
`MANIFEST.md` che documenta ogni passaggio con dimensioni e hash.

> **Nota di conformità Clean Room (§7)**:
> Nessun codice presente in questa cartella può essere importato o copiato nel nuovo
> motore di produzione di Pizzico. Tutto il nuovo codice deve essere scritto ex-novo
> secondo le specifiche scientifiche, i paper citati in §6 e la metodologia Clean Room
> documentata in `docs/clean-room/`.
