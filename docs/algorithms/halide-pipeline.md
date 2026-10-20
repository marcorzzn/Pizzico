<!--
Pizzico — docs/algorithms/halide-pipeline.md
Riferimento manifesto: §6.1
Licenza: MIT OR Apache-2.0
-->

# Pipeline Decoupled Image Processing — Halide Model

## 1. Paper di Riferimento
- **Autori**: Jonathan Ragan-Kelley, Connelly Barnes, Andrew Adams, Sylvain Paris, Fredo Durand, Saman Amarasinghe
- **Titolo**: *Halide: A Language and Compiler for Optimizing Parallelism, Locality, and Recomputation in Image Processing Pipelines*
- **Pubblicazione**: ACM PLDI 2013, 519–530.
- **DOI**: [10.1145/2491956.2462176](https://doi.org/10.1145/2491956.2462176)

---

## 2. Principio Architetturale

Separazione formale tra:
1. **Algoritmo (Cosa calcolare)**: funzioni pure che definiscono il valore del pixel alle coordinate $(x, y, c)$.
2. **Schedule (Come e quando calcolarlo)**:
   - *Tiling* (suddivisione in blocchi per massimizzare la localizzazione di cache L1/L2)
   - *Vectorization* (SIMD 128-bit / WebAssembly SIMD)
   - *Parallelism* (suddivisione delle righe su thread `SharedArrayBuffer` multipli)
   - *Storage fold / Sliding window* (mantenimento in memoria solo delle righe necessarie allo stencil corrente)

---

## 3. Note Implementative
- **Collocazione**: `crates/raster/src/pipeline.rs`.
- Consente velocità fino a $5\times$ superiori rispetto al codice nativo ingenuo C/Rust privo di gestione esplicita della gerarchia della memoria.
