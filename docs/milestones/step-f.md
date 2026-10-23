# Step F: Motore Pennelli (Brush Tool) e Sistema History Undo/Redo

> **Riferimento Manifesto**: §3.1, §4, §6.1, §10 (Roadmap Fase 1)  
> **Commit**: `c2f76f5 feat(raster): brush tool with pressure support and undo/redo history`

---

## 1. Architettura History (`crates/core/src/history.rs`)

Il trait `Command` definisce le operazioni reversibili sul documento:
- `apply(&mut self, doc: &mut Document)`
- `undo(&mut self, doc: &mut Document)`

Comandi implementati:
- `StrokeCommand`: memorizza una patch rettangolare delimitata dal `dirty_bbox` del tratto, evitando di duplicare l'intero raster ad ogni pennellata.
- `AddLayerCommand` / `RemoveLayerCommand`: inserimento e rimozione non distruttiva di livelli.
- `SetOpacityCommand` / `SetVisibilityCommand`: mutazione atomica di proprietà con ripristino immediato.

La struttura `History` gestisce uno stack a dimensione configurabile (default 50 comandi) con puntatore mobile per `undo()` e `redo()`.

---

## 2. Motore Brush Raster (`crates/raster/src/brush.rs`)

Caratteristiche del motore di rasterizzazione:
- **Interpolazione continua**: calcolo dei delta sub-pixel tra coordinate di inizio e fine, garantendo tratti privi di artefatti anche per movimenti veloci del cursore.
- **Anti-aliasing radiale**: caduta dell'alpha in funzione della distanza euclidea dal centro del timbro.
- **Durezza regolabile**: parametro `hardness` da `0.0` (sfumato / airbrush) a `1.0` (netto / hard round).
- **Alpha compositing deterministico**: applicazione dell'operatore Porter-Duff Over nel rispetto della colorimetria a 8-bit per canale.
- **Supporto Gomma**: `eraser_stroke` modula la densità alpha del layer sottostante.

---

## 3. Bridge WASM (`crates/wasm-bindings/src/lib.rs`)

Funzioni esposte al runtime JavaScript:
- `begin_stroke()`: avvia la sessione di tratto e salva lo stato iniziale del livello attivo.
- `brush_stroke(...)`: rasterizza i segmenti intermedi, aggiorna il dirty rect e notifica WebGPU.
- `eraser_stroke(...)`: traccia segmenti con riduzione alpha.
- `end_stroke()`: chiude la sessione e inserisce un unico `StrokeCommand` compatto nella History.
- `undo()` / `redo()`: navigazione dello stack di comandi con marcatura dirty per il re-render a 60 FPS.
- `get_history_info()`: fornisce `{ canUndo, canRedo, undoCount, redoCount }` all'interfaccia utente.

---

## 4. UI e Integrazione Web (`apps/web`, `packages/ui-web`)

- Toolbar verticale sinistra con selezione interattiva di Brush (`B`) ed Eraser (`E`).
- Inspector con slider in tempo reale per raggio (1–100 px), durezza (0–100%), opacità (0–100%) e selettore colore.
- Pulsanti `↶ Undo` e `↷ Redo` nella barra superiore, sincronizzati bidirezionalmente con lo stato WASM e mappati su scorciatoie da tastiera (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+Shift+Z`).
- Mappatura precisa tra coordinate DOM del canvas e coordinate logiche del livello attivo (`getDocCoordinates`).
