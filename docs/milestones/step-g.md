# 🍕 Step G — Move Tool e Selezioni Rettangolari con Clipping

**Data**: 23 Ottobre 2026  
**Riferimento Manifesto**: §3.1, §4, §6.1, §10 Fase 1  
**Stato**: ✅ Completato con successo  

---

## 🎯 Obiettivi Raggiunti

Nello Step G abbiamo implementato i due strumenti fondamentali per la manipolazione di composizioni grafiche multi-livello:
1. **Move Tool (Sposta Livello)**:
   - Traslazione atomica del livello attivo mediante coordinate `(offset_x, offset_y)`.
   - Comando `MoveLayerCommand` con pieno supporto Undo/Redo registrato nella storia al rilascio del puntatore (`pointerup`).
   - Sincronizzazione in tempo reale durante il trascinamento e aggiornamento reattivo dell'inspector e della vista WebGPU.
2. **Rectangular Selection (Marquee / Marching Ants)**:
   - Modello dati `RectSelection` e clipping geometrico preciso calcolato rispetto al sistema di coordinate locale di ciascun livello (`to_layer_local_clip`).
   - Clipping integrato nel motore raster (`brush_stroke_clipped` ed `eraser_stroke_clipped`): il disegno viene circoscritto rigorosamente all'interno del rettangolo di selezione, preservando intatti i pixel esterni.
   - Overlay grafico CSS ad alte prestazioni con animazione marching ants (`animation: pz-marching-ants 0.8s linear infinite`).
   - Scorciatoia standard `Ctrl+D` e pulsante dedicato `✕ Deseleziona` nella toolbar superiore.

---

## 🏛️ Architettura e Implementazione

### 1. Modello Dati e Clipping Geometrico (`crates/core`)
- **`crates/core/src/selection.rs`**: Struttura `RectSelection` con metodi `contains(px, py)` e `to_layer_local_clip(offset_x, offset_y, layer_w, layer_h)`. Gestisce l'intersezione tra le coordinate documento e il frame locale del livello, ritornando `None` se il livello non interseca la selezione.
- **`crates/core/src/history.rs`**: `MoveLayerCommand { layer_id, old_offset, new_offset }`. All'undo ripristina la posizione iniziale; al redo ripristina la nuova posizione.
- **`crates/core/src/document.rs`**: Aggiunto campo `selection: RectSelection` al `Document`, con metodi `set_selection`, `clear_selection`, `has_active_selection`, `set_layer_offset` e `translate_layer`.

### 2. Clipping Raster (`crates/raster`)
- **`crates/raster/src/brush.rs`**: Esteso `stroke_internal` con parametro opzionale `clip_bounds: Option<BoundingBox>`. Ogni stamp del cerchio del pennello anti-aliased calcola l'intersezione tra il proprio bounding box locale e i limiti di clip della selezione, garantendo zero overhead computazionale per pixel esterni.

### 3. Bridge WASM (`crates/wasm-bindings`)
- Esportate nuove API:
  - `begin_move_layer()`, `move_active_layer(x, y)`, `translate_active_layer(dx, dy)`, `end_move_layer()`, `get_active_layer_offset()`.
  - `set_selection(x, y, w, h)`, `clear_selection()`, `has_active_selection()`, `get_selection()`.
  - Aggiornato `LayerMetadataDto` con `offsetX` e `offsetY`.
  - `brush_stroke()` ed `eraser_stroke()` consultano automaticamente la selezione attiva del documento convertendola in coordinate locali del layer per invocare il clipping.

### 4. UI Shell TypeScript (`packages/ui-web`, `packages/shared`, `apps/web`)
- **Toolbar**: Aggiunti pulsanti `Move` (`✥`, tasto rapido `V`) e `Marquee` (`⬚`, tasto rapido `M`).
- **Top Bar**: Pulsante `✕ Deseleziona` visualizzato dinamicamente quando c'è una selezione attiva, con supporto a `Ctrl+D`.
- **Canvas Wrapper**: Elemento `.pz-selection-marquee` con bordi tratteggiati animati a 60 FPS in puro CSS compositing.
- **Inspector**: Visualizzazione in tempo reale dell'offset `(X, Y)` del livello selezionato e dimensioni del rettangolo di selezione.

---

## 🧪 Matrice di Verifica e Test

| Componente | Test / Verifica | Esito |
|---|---|---|
| `pizzico-core` | `cargo test -p pizzico-core` (16 test) | ✅ 16 passati su 16 (inclusi `test_history_move_layer`, `test_rect_selection_contains`, `test_to_layer_local_clip`) |
| `pizzico-raster` | `cargo test -p pizzico-raster` (4 test) | ✅ 4 passati su 4 (incluso `test_stroke_clipped_to_selection`) |
| Workspace Rust | `cargo check -p pizzico-core -p pizzico-raster -p pizzico-io-psd` | ✅ Completato con 0 errori |
| Monorepo TypeScript | `pnpm typecheck` (7 package) | ✅ Completato con 0 errori su tutti i 7 package |
| Verifica Runtime WASM | Node.js script di traslazione e restore Undo | ✅ Layer Rosso traslato da (50, 50) a (170, 110) e ripristinato a (50, 50) via Undo |
| Verifica Clipping Brush | Pixel check fuori e dentro la selezione | ✅ Pixel fuori dalla selezione inalterati (`[191, 0, 0, 255]`), pixel dentro modificati dal tratto verde |
| Browser Live | Marching Ants + Inspector + Deselect UI | ✅ Marching ants attivo, Inspector sincronizzato, shortcut `Ctrl+D` funzionante |

---

## 📷 Evidenza Visiva

![Step G - Marching Ants Selection e Move Tool](./assets/step-g-selection.png)
