# ADR-0005 — Come rendere le forme vettoriali

- **Stato:** proposta (decisione da confermare prima della Sessione 1-B)
- **Data:** 2026-10-27
- **Contesto tecnico verificato:** `LayerKind` ha tre varianti — `Raster`, `Vector { paths: Vec<String> }`, `Group` — ma **nessuno dei due compositor disegna `LayerKind::Vector`**:
  - `pizzico_core::compositing::composite_single_layer` ha una sola `if let LayerKind::Raster { .. }`, nessun ramo per `Vector`;
  - `engine/core::compositor.rs` non contiene alcun riferimento a `LayerKind::Vector`.
  
  Un livello vettoriale oggi è quindi invisibile: esiste, si salva, ma non produce pixel.

> **Nota sulla numerazione:** in `docs/ADR/` esistono 0001 e 0003; il 0002 vive in `docs/ui/`
> (redesign flat egui). Questa serie continua da 0005 come richiesto dal committente,
> lasciando 0004 libero.

## Opzioni

### A — Rasterizzare `Vector` (o un nuovo `Shape`) dentro il compositing

Estendere `composite_single_layer` con un ramo che rasterizza la geometria del livello
direttamente nel buffer composito, rispettando trasformazione, opacità e blend mode.

| Aspetto | Valutazione |
| --- | --- |
| Complessità | Media: serve un rasterizzatore di tracciati (polygon fill antialiased + stroke). `crates/vector` ha già geometria, `StrokeExpander` e un `VectorRasterizer` da verificare |
| Rischio | Medio: si tocca l'hot loop che oggi gestisce solo copia di pixel |
| Undo/redo | **Coerente per costruzione**: la storia fotografa il `Document`, e la geometria vive nel `Document` |
| Frames | La geometria va rasterizzata a ogni composito. Con pochi livelli è accettabile; se diventa lento si aggiunge una cache per livello (invalidata su cambio geometria/trasformazione) |
| Reversibilità | Alta: è additivo, un ramo in più nel `match` |
| Export PSD/PNG | La geometria è nel documento: l'export può rasterizzare o conservare il vettoriale |

### B — Rasterizzare alla creazione e tenere i metadati fuori dal documento

Alla creazione della forma si crea un `Raster` con i pixel già disegnati, e la specifica
(tipo, punti, colori) viene conservata **nel bridge TypeScript**; quando l'utente modifica
una proprietà, il bridge rigenera il raster e sostituisce il livello.

| Aspetto | Valutazione |
| --- | --- |
| Complessità | Bassa lato Rust (nessuna modifica al compositing) |
| Rischio | Alto: **stato ombra**. Il documento Rust e il metadato JS possono divergere |
| Undo/redo | **Problematico**: `undo` ripristina il `Document`; il metadato JS non viene ripristinato. Dopo un undo la forma sullo schermo torna raster precedente ma il pannello mostra la geometria nuova |
| Salvataggio progetto `.pizzico` | Il metadato andrebbe serializzato a parte: formati divergenti tra web e Android |
| Qualità | Rasterizzando a dimensione documento, un ingrandimento successivo mostra pixel (nessuna ri-rasterizzazione) |
| Reversibilità | Bassa: una volta scelto B, passare ad A significa riscrivere l'editing |

## Decisione proposta: **A**

Motivo principale: **la storia dell'editor è il documento Rust**. Ogni scelta che mette
stato di editing fuori dal documento crea una seconda verità da sincronizzare con
undo/redo, salvataggio e (in futuro) il motore Android, che il metadato JS non lo vede
affatto. Il costo di A è confinato in una funzione e nella sua cache; il costo di B si
paga a ogni feature che tocca quel tipo di livello.

Con A, `Shapes` e `Text` possono condividere lo stesso meccanismo: una variante che porta
geometria e un ramo nel compositor.

## Conseguenze

- Il compositing smette di essere «copia di pixel» e diventa «composizione di contenuti».
- Serve un test che verifichi che una forma produce pixel non trasparenti, e un test di
  coerenza con undo.
- L'export dovrà decidere se rasterizzare o preservare la geometria (per ora: rasterizza).
- La cache per livello diventa necessaria appena le forme superano la manciata.

## Non deciso qui

Formato di serializzazione della geometria nel `.pizzico` e nel PSD; livello di
antialiasing; se le forme booleane vadano risolte alla creazione o a ogni composito.
