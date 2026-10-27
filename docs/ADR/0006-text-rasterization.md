# ADR-0006 — Rasterizzazione dei glifi per il livello di testo

- **Stato:** proposta (decisione da confermare prima della Sessione 1-C)
- **Data:** 2026-10-27
- **Contesto tecnico verificato:** `crates/text` contiene **solo lo shaping**: `TextShaper`
  e `GlyphPosition`, basati su `rustybuzz`. Non c'è alcun rasterizzatore di glifi, e
  nemmeno `crates/engine/text` (che usa `cosmic-text`) è collegato al compositing vivo.
  
  Quindi lo shaping è risolto; manca il passaggio «glifo → pixel».

> **Nota sulla numerazione:** vedi ADR-0005. La serie continua da 0006 come richiesto.

## Cosa serve davvero

1. **Shaping** — dare a una stringa una sequenza di glifi con posizioni e avanzamenti:
   **già fatto** (`rustybuzz`).
2. **Outline o bitmap del singolo glifo** — trasformare un glyph id in una forma o in una
   copertura di pixel: **manca**.
3. **Composizione** — disegnare i glifi nella posizione data, con colore e trasformazione.

Serve quindi una libreria che copra il punto 2, compatibile WASM.

## Opzioni

### A — `fontdue`

| Aspetto | Valutazione |
| --- | --- |
| API | Diretta: `font.rasterize(ch, px) -> (Metrics, Vec<u8>)`, copertura 8-bit |
| Performance | Molto buona per il caso «disegna testo a una dimensione»; nessuna allocazione per glifo se si riusa il buffer |
| Dimensione WASM | Piccola: pure Rust, nessuna dipendenza pesante |
| `unsafe` | Nessuno |
| OpenType avanzato | Limitato: niente variazioni, niente outline manipolabili, niente hinting raffinato |
| Cosa dà | Bitmap di copertura, che è esattamente ciò che serve se il testo diventa un livello raster |

### B — `ab_glyph`

| Aspetto | Valutazione |
| --- | --- |
| API | `Font::outline(glyph_id)` → `Outline` (segmenti linea/quad/cubo) + `OutlinedGlyph::draw` per la copertura |
| Performance | Comparabile; l'outline consente di riusare la stessa geometria a scale diverse |
| Dimensione WASM | Simile a fontdue (`owned_ttf_parser` alle spalle) |
| `unsafe` | Nessuno |
| OpenType avanzato | Migliore: accesso a outline, quindi testo **vettoriale** (utile per export SVG e per ruotare/scalare senza perdita) |
| Cosa dà | Geometria dei glifi, riusabile da un rasterizzatore di tracciati condiviso con le forme |

## Decisione proposta: **B — `ab_glyph`**

Motivo: la direzione presa in ADR-0005 è **rasterizzare geometria al momento del
composito**. Se il testo diventasse una bitmap già rasterizzata (fontdue, opzione A),
avremmo due meccanismi diversi nel compositor — «forme = geometria» e «testo = bitmap» —
e il testo si degraderebbe appena l'utente lo scala o lo ruota, che è esattamente ciò che
la Sessione 1-A rende possibile.

Con `ab_glyph` il testo produce **la stessa cosa delle forme: contorni**. Un solo
rasterizzatore di tracciati serve entrambi, e la qualità resta buona a qualsiasi scala.

**Contro, accettato:** il testo diventa più costoso da comporre (rasterizzazione di
tracciati invece di copia di una bitmap). Si mitiga con la cache per livello prevista in
ADR-0005. `fontdue` resta l'alternativa giusta se un giorno servisse il caso «testo
statico rasterizzato, mai scalato», tipico dei watermark.

## Conseguenze

- Nuova dipendenza in `crates/text`: `ab_glyph`, più il caricamento di font da bytes
  (necessario per il TTF/OTF caricato dall'utente).
- Il rasterizzatore di tracciati condiviso diventa un componente di prima classe: è la
  dipendenza che lega ADR-0005 e ADR-0006.
- Serve un fallback per font assenti: senza un font di sistema disponibile in WASM, il
  primo uso richiede o un font incluso nel bundle o un caricamento esplicito.

## Non deciso qui

Quale font includere nel bundle (licenza), se supportare più font contemporaneamente nel
documento, e come serializzare il testo nel `.pizzico` (stringa + stile, non glifi).
