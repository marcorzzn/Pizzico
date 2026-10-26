# Fase 1 e Fase 2 — trapianto del motore e gate WASM

> **Data**: 2026-10-26
> **Tag di riferimento**: `fusione-punto-zero` (stato precedente, rollback disponibile)
> **Esito**: Fase 1 chiusa, Fase 2 chiusa.

---

## Fase 1 — Trapianto additivo

### Cosa è entrato

5 crate copiati da `C:\Progetti\picsart-cl\pizzart\crates\` a `crates/engine/`,
rinominati `pizzart-*` → `pizzico-engine-*` (package, dipendenze interne e
riferimenti nel codice Rust: 0 occorrenze residue di `pizzart_`).

| Crate | File | Contenuto |
|---|---:|---|
| `crates/engine/core` | 16 | documento, layer, gruppi, maschere, selezione, blend, history, transform, stable id |
| `crates/engine/draw` | 2 | pressione, tilt, Catmull-Rom, dirty rect |
| `crates/engine/text` | 3 | cosmic-text, registry font, cache glyph |
| `crates/engine/render` | 5 | renderer wgpu, `composite.wgsl`, `effects.wgsl`, `cpu.rs` |
| `crates/engine/io` | 3 | export PNG/JPEG/WebP (WebP dietro feature) |

Aggiunti a `members` del workspace root; documentazione d'origine in `docs/pizzart/`
con la `LICENSE` MIT.

### Cosa è rimasto fuori, e perché

| Escluso | Motivo | Dove resta |
|---|---|---|
| `crates/ui` (egui, 67 KB) | non portabile sul web; il design è documentato in `docs/pizzart/REPORT_UI_20261025.md` | repo Pizzart + backup in archivio |
| `crates/project` | `zstd` richiede un compilatore C: non compila per WASM (misurato, Fase 0) | repo Pizzart + backup |
| `examples/` di draw/render/io | non necessari alla build; contengono scritture su file | repo Pizzart + backup |

Nessuno di questi è perduto: il repo `C:\Progetti\picsart-cl\pizzart` è intatto e
ne esiste una copia di backup in `_Archivio-Personale-Pizzart\9-duplicati\`.

### Gate G1 — esiti

| Comando | Esito | Tempo |
|---|---|---|
| `cargo check --workspace --offline` | **exit 0** | 1 m 49 s |
| `cargo check -p pizzico-wasm-bindings --target wasm32-unknown-unknown` | **exit 0** (bridge intatto) | 1,01 s |

### Test eseguiti (222 su 222 verdi)

| Crate | Test | Esito | Tempo |
|---|---:|---|---:|
| `pizzico-engine-core` | 99 unit + 19 integrazione (`layer_ops`) + 1 doc-test | ✅ 119 | 0,26 s + 0,01 s + 1,81 s |
| `pizzico-engine-draw` | 22 | ✅ 22 | 0,05 s |
| `pizzico-engine-text` | 14 | ✅ 14 | 1,78 s |
| `pizzico-engine-render` | 55 (parità GPU/CPU, con adattatore reale) | ✅ 55 | 53,58 s |
| `pizzico-engine-io` (release) | 11 + 1 | ✅ 12 | 0,87 s + 0,35 s |
| **Totale** | | **✅ 222** | |

**Contabilità rispetto ai 254 di Pizzart**: 222 trapiantati + 32 esclusi
(`ui` 18, `project` 14) = 254. Il conto torna esattamente.

Nota: `pizzico-engine-io` va eseguito in `--release` perché contiene un test di
prestazioni la cui soglia in debug è 6,0 s contro una misura di 6,089 s su questa
macchina. In release passa con margine.

### Committato

| Commit | Contenuto |
|---|---|
| `3391773` | `feat(engine): trapianto del motore Pizzart in crates/engine (Fase 1)` |
| `64f6ec6` | `docs(notice): attribuzione MIT del motore Pizzart incorporato` |

L'attribuzione è un obbligo, non una cortesia: il codice è MIT
(Copyright (c) 2025 Marco Razzano) e ora è **incorporato**, non solo citato.
`NOTICE.md` lo dichiara e `docs/pizzart/LICENSE` contiene il testo integrale.

---

## Fase 2 — Gate WASM nel contesto reale

Comando unico, dentro il workspace di Pizzico:

```
cargo check -p pizzico-engine-core -p pizzico-engine-draw -p pizzico-engine-text \
            -p pizzico-engine-render -p pizzico-engine-io \
            --target wasm32-unknown-unknown --offline
```

| Voce | Valore |
|---|---|
| Esito | **exit 0** |
| Tempo | 98 s (1 m 37 s) |
| Crate verificati | 5 su 5 |
| `project` | escluso per costruzione (zstd), non fa parte del workspace |

Il risultato coincide con la misura fatta nella Fase 0 sul repo donatore: il
trapianto **non ha introdotto incompatibilità WASM**. `pcg64`-style adattamenti
non servono.

---

## Note operative

1. **Rete non disponibile in questo ambiente**: tutte le build sono state eseguite con
   `--offline`, usando la cache del registro. La risoluzione delle dipendenze nuove
   (`cosmic-text`) è avvenuta dalla cache locale, non da crates.io.
2. **`Cargo.lock` è ignorato da git** in questo repository (`.gitignore`). Per un
   workspace con binari e deploy questo è un rischio di riproducibilità: due macchine
   possono risolvere versioni diverse. Da valutare: togliere `Cargo.lock` dal
   `.gitignore` e committarlo. **Non modificato in questa fase.**
3. `git` continua a segnalare `too many unreachable loose objects` (object store
   555 MB). Non è stato eseguito `git prune`/`gc --prune=now`: pruna oggetti non
   raggiungibili e la decisione spetta al proprietario.

---

## Prossimo passo: Fase 3

Crate `pizzico-session`: portare la semantica di `pizzart/crates/ui/src/state.rs`
(`Editor`: undo, drag opacità, blend, merge, selezione→mask, `apply_effect`) in un
crate WASM-safe, senza `std::fs` e senza `std::path`, con un trait `AssetSource` al
posto dell'I/O.
