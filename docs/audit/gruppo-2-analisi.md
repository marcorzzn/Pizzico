# Gruppo 2 — Analisi della pipeline dei tratti (passo 1)

> **Data**: 2026-10-26
> **Stato**: analisi completata. Migrazione (passi 2-5) non iniziata, di proposito.
> **Fonte**: `crates/wasm-bindings/src/lib.rs`, righe 420-660.

---

## 1. Stato del tratto (legacy)

```rust
struct ActiveStrokeState {
    layer_id: u64,
    before_pixels: Vec<u8>,          // copia integrale del layer all'inizio del tratto
    dirty_bbox: Option<BoundingBox>, // unione dei rettangoli toccati
}
```

Vive in un `thread_local!` (`ACTIVE_STROKE`), non nel documento né nella history.

## 2. Flusso esatto

### `begin_stroke() -> bool`
1. legge il layer attivo (`doc.active_layer_id`);
2. se è `LayerKind::Raster`, salva **tutti** i pixel in `before_pixels` e azzera `dirty_bbox`;
3. restituisce `false` se non c'è un layer raster attivo.

### `brush_stroke(from, to, radius, hardness, color, opacity) -> bool`
1. **lazy init**: se non c'è stato attivo, chiama `begin_stroke()`;
2. normalizza il colore a `[u8; 4]` (default `[0,0,0,255]`);
3. costruisce `pizzico_raster::Brush { radius, hardness, color, opacity }`;
4. **clip di selezione**: se `doc.has_active_selection()`, calcola
   `selection.to_layer_local_clip(tx, ty, w, h)`; se `None` **interrompe** (tratto fuori selezione);
5. chiama `pizzico_raster::brush::stroke_clipped(..., bbox)` → restituisce un `BoundingBox` toccato;
6. unisce il bbox in `dirty_bbox` e marca il documento dirty (ricomposizione immediata).

### `eraser_stroke(from, to, radius, hardness, opacity) -> bool`
Identico, ma chiama `pizzico_raster::brush::eraser_stroke_clipped` (alpha in sottrazione).

### `end_stroke() -> bool`
1. prende lo stato (`take()`), quindi **non è più riutilizzabile**;
2. se `dirty_bbox` è presente, estrae dal layer solo il rettangolo toccato, riga per riga,
   costruendo `before_patch` e `after_patch`;
3. se `dirty_bbox` è `None`, usa i buffer interi (`before_pixels` e i pixel correnti);
4. chiama `commit_stroke(layer_id, before, after, bbox)` → un solo comando per tutto il tratto;
5. restituisce `true` solo se ha effettivamente registrato qualcosa.

**Il patto implicito**: `before_pixels` è una copia integrale (memoria `w*h*4`), ma la history
registra solo il rettangolo modificato. È la ragione per cui il tratto è annullabile con un
comando piccolo invece che con una copia dell'intero layer.

## 3. API legacy usata

| Chiamata | Ruolo |
|---|---|
| `pizzico_raster::brush::stroke_clipped(...)` | rasterizza il segmento e restituisce il bbox toccato |
| `pizzico_raster::brush::eraser_stroke_clipped(...)` | idem, in sottrazione |
| `BoundingBox::new(x, y, w, h)` | rettangolo toccato |
| `doc.selection.to_layer_local_clip(tx, ty, w, h)` | clip della selezione in coordinate layer |
| `pizzico_core::StrokeCommand::{new_bounded,new_full}` | comando di history |

## 4. Differenze con `engine-draw` (verificate)

| Aspetto | Legacy (`pizzico-raster`) | v2 (`engine-draw`) | Conseguenza |
|---|---|---|---|
| Pennello | `Brush { radius, hardness, color, opacity }` | `Brush::new(size).hardness().color().opacity().spacing().stabilize()` — **builder**, `size` è il diametro | mappare `size = radius * 2` |
| Rasterizzazione | `stroke_clipped` con clip integrata | `Stroke::with_points(brush, points)` → `render_bbox(w,h) -> StrokeBuffer`, oppure `render_over(dst,w,h) -> usize` | usare `render_over` sul buffer del layer |
| Gomma | `eraser_stroke_clipped` dedicata | **assente** | implementare sottraendo l'alpha del buffer renderizzato |
| Clip di selezione | dentro `stroke_clipped` | assente | applicare la maschera dopo il render (o saltare il clip in v2 e dichiararlo) |
| Granularità del comando | `StrokeCommand` con `before/after` per bbox | `ReplacePixelCommand` (aggiunto in 4.2.2.B) | già pronta |

## 5. Piano per i passi 2-5

1. **Spostare** (non riscrivere) `ActiveStrokeState` e le quattro funzioni in `legacy.rs`,
   con il campo `stroke: Option<StrokeState>` nel backend; `lib.rs` resta ponte.
2. Aggiungere i 5 metodi al trait (`begin_stroke`, `push_stroke_point`, `brush_stroke`,
   `eraser_stroke`, `finish_stroke`).
3. `V2Backend`: `Brush` da `radius*2`, `render_over` sul layer attivo, gomma per sottrazione
   d'alpha, `commit_stroke` a fine tratto.
4. Test `disegna → undo → redo` su entrambi i backend, con confronto pixel:
   tolleranza **≤ 2/255** oppure differenza dichiarata — i due algoritmi di antialiasing
   sono diversi per costruzione.
5. Parità `.d.ts` (attesa: invariata, nessuna firma nuova) e commit.

## 6. Rischio principale, dichiarato

La parità **pixel** tra i due motori non è garantita: `pizzico-raster` e `engine-draw` usano
algoritmi di timbro diversi. Se la differenza supera 2/255, la scelta non è "aggiustare il
test": è decidere se v2 debba riusare `pizzico-raster` per il disegno, e va discussa — non
decisa in fase di implementazione.
