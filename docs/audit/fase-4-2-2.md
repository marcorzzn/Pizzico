# Fase 4.2.2 — commit semantici, ReplacePixel, backend v2, parità JS

> **Data**: 2026-10-26
> **Esito**: passi A, B, C, D completati. Gate D **superato con parità esatta**.
> **Avvertenza**: la parità è del **contratto**, non del comportamento a runtime: vedi §5.

---

## A — `commit_move` / `commit_stroke` al posto di `push_command`

Il trait `EngineBackend` non contiene più comandi: riceve **operazioni**.

```rust
fn commit_move(&mut self, layer_id: u64, from: (i32, i32), to: (i32, i32));
fn commit_stroke(&mut self, layer_id: u64, before: Vec<u8>, after: Vec<u8>,
                 bbox: Option<(u32, u32, u32, u32)>);
```

Nel bridge i due punti sono stati riscritti: `end_stroke` estrae **due buffer e un
rettangolo** dal documento e chiama il backend; `end_move_layer` passa solo gli offset.
Nessun tipo di comando attraversa più il confine.

Gate: `cargo test -p pizzico-wasm-bindings` → 5/5; workspace e WASM → exit 0.
Commit `fase-4.2.2.A`.

## B — `ReplacePixelCommand` in `pizzico-engine-core`

Nuovo comando in `crates/engine/core/src/history.rs`, esportato dal crate:

- `bbox = Some((x,y,w,h))`: scrive/ripristina solo quel rettangolo, riga per riga.
- `bbox = None`: sostituzione integrale del layer.

3 test in `crates/engine/core/tests/replace_pixel.rs`: rettangolo + undo, integrale,
undo→redo. Gate: **99 unit + 19 integrazione + 3 nuovi, tutti verdi** (anche il
doc-test). Commit `fase-4.2.2.B`.

## C — `V2Backend` dietro `engine-v2`

`crates/wasm-bindings/src/engine/v2.rs` implementa `EngineBackend` su
`pizzico_engine_core::Document`, con:

- mappa `u64 ⇄ LayerId` (v2 usa id autonomi, il contratto JS id piccoli e stabili);
- titolo tenuto nel backend (v2 non lo ha nel documento);
- history del motore v2 (`SetOpacity`, `SetVisible`, `RemoveLayer`, `SetTransform`,
  `ReplacePixelCommand`);
- `commit_move` che **ripristina l'offset di partenza** prima di applicare
  `SetTransform`, altrimenti l'undo tornerebbe al valore già spostato;
- `legacy_document() = None` (dichiarato, non finto).

Feature in `Cargo.toml`:

```toml
[features]
engine-v2 = ["dep:pizzico-engine-core"]
```

L'init del backend è **di compilazione** (`#[cfg(feature = "engine-v2")]`): nessuna
delle due configurazioni cambia il contratto JS.

Gate: default **5/5**; `--features engine-v2` **9/9** (5 legacy + 4 v2). Commit
`fase-4.2.2.C`.

## D — Parità del contratto JS: superato

`wasm-pack` 0.13.1, target `web`, `--dev` (wasm-opt saltato):

| Artefatto | Dimensione |
|---|---:|
| `pkg-legacy/pizzico_wasm_bindings.d.ts` | 20.053 byte |
| `pkg-v2/pizzico_wasm_bindings.d.ts` | 20.053 byte |

```
SHA-256 legacy: 2dba889ad2b1213f45f8e552bde0f85a4cbb48083c7ed4637ed05c41e6191861
SHA-256 v2    : 2dba889ad2b1213f45f8e552bde0f85a4cbb48083c7ed4637ed05c41e6191861
```

- 44 funzioni esportate per entrambi, `Compare-Object` → **0 differenze**;
- diff testuale riga per riga dei due file → **file identici**;
- classe esportata: `PizzicoEngine` in entrambi.

I due pacchetti sono artefatti di verifica e sono in `.gitignore`; si rigenerano con:

```powershell
wasm-pack build crates/wasm-bindings --target web --out-dir ../../packages/worker-core/pkg-legacy --dev
wasm-pack build crates/wasm-bindings --target web --out-dir ../../packages/worker-core/pkg-v2 --dev -- --features engine-v2
```

## 5. Cosa funziona davvero sotto `engine-v2` (lettura onesta)

La parità del `.d.ts` garantisce che la UI **compila e si collega**; non garantisce che
ogni funzione **faccia** qualcosa. Stato reale:

| Area | Sotto v2 |
|---|---|
| `create_document`, `add_raster_layer` | ✅ backend v2 |
| `get_composite_buffer`, `get_document_dimensions`, `get_layer_count`, `get_active_layer_id` | ✅ backend v2 (riscritti in 4.2.2) |
| opacità, visibilità, selezione layer, rimozione | ✅ backend v2 |
| undo / redo / history info | ✅ backend v2 |
| `set_selection` / `clear_selection` / `has_active_selection` / `get_selection` | ⚠️ ancora legacy (restano 29 punti) |
| `get_layers_metadata` | ⚠️ ancora legacy |
| tratti (`begin_stroke`, `brush_stroke`, `eraser_stroke`, `end_stroke`) | ❌ legacy: sotto v2 va in panico |
| spostamento layer (`begin_move_layer`, `move_active_layer`, `end_move_layer`) | ❌ idem |
| export PNG/JPEG/WebP, PSD, progetto `.pizzico` | ❌ idem (`io-native`, `io-psd`) |

**Conseguenza da non nascondere**: `engine-v2` oggi è un backend **compilante e
verificato nel contratto**, adatto a essere attivato solo dopo che i gruppi rimanenti
(metadati, selezione, tratti, move, export) saranno passati ai metodi semantici.
Attivarlo adesso in produzione farebbe funzionare il disegno a metà.

### Ordine consigliato per chiudere il divario

1. `get_layers_metadata` + selezione (dal backend) — piccolo, sblocca la UI.
2. Tratti: `engine-draw` per rasterizzare, `commit_stroke` per la history.
3. Move: `commit_move` già pronto; manca solo il percorso dei tre metodi.
4. Export: `engine-io::encode` (PNG/JPEG/WebP).
5. PSD e `.pizzico`: **dichiarati non supportati** con `Err(JsValue)`, non finti.
