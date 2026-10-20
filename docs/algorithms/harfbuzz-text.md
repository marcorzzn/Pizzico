<!--
Pizzico — docs/algorithms/harfbuzz-text.md
Riferimento manifesto: §6.4
Licenza: MIT OR Apache-2.0
-->

# Text Shaping OpenType — rustybuzz (HarfBuzz Model)

## 1. Riferimento Tecnico e Standard
- **Progetto**: HarfBuzz / `rustybuzz`
- **Standard**: Microsoft / Adobe OpenType Specification v1.9, W3C CSS Text Module Level 3
- **Repository**: [github.com/RazrFalcon/rustybuzz](https://github.com/RazrFalcon/rustybuzz)

---

## 2. Meccanica dello Shaping Tipografico

Lo shaping è il processo computazionale che converte una sequenza di punti di codice Unicode in una sequenza ordinata di identificatori di glifi con relative posizioni coordinate:

$$\text{Unicode String} + \text{Font Table} \xrightarrow{\text{Shaping}} [(\text{glyph\_id}_i, \Delta x_i, \Delta y_i, \text{adv}_x, \text{adv}_y)]$$

### Fasi della Pipeline OpenType:
1. **Analisi Unicode (Itemization)**: divisione in segmenti omogenei per script, lingua e direzione bidirezionale (Bidi LTR/RTL).
2. **GSUB (Glyph Substitution)**:
   - Sostituzioni 1-a-1 e legature (es. `fi` $\to$ `ﬁ`, `->` $\to$ `→`).
   - Forme contestuali (iniziali, mediane, finali in arabo, devanagari).
3. **GPOS (Glyph Positioning)**:
   - Kerning a coppie e contestuale.
   - Posizionamento dei segni diacritici (mark-to-base, mark-to-mark).

---

## 3. Note Implementative
- **Collocazione**: `crates/text/src/lib.rs`.
- Scritto in 100% Rust memory-safe senza allocazioni dinamiche non necessarie, perfettamente funzionante in WebAssembly senza dipendenze C.
