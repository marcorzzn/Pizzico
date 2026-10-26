# Gruppo 2 — consegna per la sessione successiva

> **Stato al 2026-10-26**: passo 1 chiuso (`ed4dc83`, primitive di gomma e clipping
> in `engine-draw`, 3 test nuovi). Passi 2-5 **non iniziati**.
> **Punto di rollback**: tag `gruppo2-punto-partenza` (commit `ed4dc83`).
> **Perché non sono stati iniziati**: il passo 2 richiede di spostare ~240 righe
> della pipeline che oggi funziona end-to-end; fatto senza margine per verificarlo,
> avrebbe lasciato il repository in stato rotto.

---

## Ordine di lavoro

### Passo 2 — Spostare il legacy nel backend

**File**: `crates/wasm-bindings/src/lib.rs` righe ~420-660 → `crates/wasm-bindings/src/engine/legacy.rs`.

1. `lib.rs`: rimuovere `struct ActiveStrokeState` (riga 38) e `ACTIVE_STROKE` dal
   `thread_local!`; rimuovere `BoundingBox` dagli import se resta inutilizzato.
2. `engine/legacy.rs`: aggiungere

   ```rust
   struct StrokeState {
       layer_id: u64,
       before_pixels: Vec<u8>,
       dirty_bbox: Option<pizzico_raster::brush::BoundingBox>,
   }
   ```

   e il campo `stroke: Option<StrokeState>` in `LegacyBackend`
   (inizializzato a `None` nei due costruttori e in `create_document`,
   come già fatto per `move_state`).
3. Copiare i quattro corpi **riga per riga**, sostituendo solo:
   `with_active_document` → `&self.document`; `with_active_document_mut` →
   `&mut self.document`; `ACTIVE_STROKE` → `self.stroke`;
   `commit_stroke(...)` resta uguale.
4. `lib.rs`: le quattro funzioni `#[wasm_bindgen]` diventano ponte
   (`with_backend_mut(|b| ...)`), con la stessa firma.

**Gate**: `cargo test -p pizzico-wasm-bindings` → 6/6; `cargo check --workspace` exit 0.

### Passo 3 — v2 con `engine-draw`

Campi nuovi in `V2Backend`: `stroke: Option<StrokeState>` con
`brush`, `points`, `before_pixels`, `dirty_bbox`.

Mappature **verificate** (non assumere):
- `Brush::new(size)` — `size` è il **diametro**: `size = radius * 2`.
- `Stroke::with_points(brush, points)`, poi
  `render_over(dst, w, h)` oppure `render_clipped_over(dst, w, h, clip)`.
- Gomma: `render_eraser_over(dst, w, h)` (aggiunta nel passo 1; **non** esiste
  ancora una variante clipped: se serve, combinarla o aggiungerla).
- `commit_stroke(layer_id, before, after, bbox)` già disponibile.

### Passo 4 — Test comportamentali

Tre test in `crates/wasm-bindings/tests/gruppo2_behavioral.rs`:
stroke base, gomma, clipping su selezione. Il terzo **non è tollerante**: pixel
fuori selezione = bug, non differenza estetica.

**Disciplina obbligatoria prima della tolleranza**: misurare
`N_v2 / N_legacy` sui pixel toccati e **stamparlo**. Accettare solo in
`[0.8, 1.25]`. Fuori da quell'intervallo è una mappatura sbagliata
(`radius`↔diametro, `hardness`, `spacing`), non una differenza da tollerare.

### Passo 5 — Parità `.d.ts`

Rigenerare i due pacchetti e confrontare gli hash. Atteso: invariato
(`fdd16862…2a245` al momento del passo 1), perché nessuna firma pubblica cambia.

---

## Cosa è già pronto (non rifare)

| Elemento | Dove | Commit |
|---|---|---|
| `ReplacePixelCommand` | `crates/engine/core/src/history.rs` | `f2fc5b0` |
| `commit_move` / `commit_stroke` nel trait | `engine/mod.rs` | `503d90f` |
| `render_eraser_over` + `render_clipped_over` | `crates/engine/draw/src/lib.rs` | `ed4dc83` |
| Analisi del flusso legacy | `docs/audit/gruppo-2-analisi.md` | `018cbb2` |
| stato backend (doc, layer, selezione, move, export) | `engine/legacy.rs`, `engine/v2.rs` | vari |

## Punti legacy residui

**16** occorrenze di `with_active_document` in `lib.rs`, tutte nella pipeline dei
tratti. A zero dopo il passo 2.
