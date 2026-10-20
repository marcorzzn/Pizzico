<!--
Pizzico — docs/algorithms/stroke-expansion.md
Riferimento manifesto: §6.2
Licenza: MIT OR Apache-2.0
-->

# Espansione del Tratto GPU — Spirali di Eulero

## 1. Paper di Riferimento
- **Autori**: Raph Levien, Arman Uguray
- **Titolo**: *High-Performance GPU Stroke Expansion with Euler Spirals*
- **Pubblicazione**: PACMCGIT 2024 / ACM SIGGRAPH 2024.
- **DOI**: [10.1145/3658197](https://doi.org/10.1145/3658197)

---

## 2. Formulazione Matematica

L'espansione di un tratto (stroke to fill) con spessore $w$ e stili di terminazione/congiunzione (Butt, Round, Square, Miter, Bevel) su GPU è notoriamente complessa per via delle auto-intersezioni sulle curve concave con raggio di curvatura $R < w/2$.

L'approccio di Levien & Uguray scompone la linea mediana in segmenti di **Spirali di Eulero** (Clothoidi), in cui la curvatura $\kappa$ varia linearmente rispetto alla lunghezza dell'arco $s$:
$$\kappa(s) = \kappa_0 + \kappa' s$$

L'offset parallelo di una spirale di Eulero ammette una rappresentazione analitica regolare e calcolabile in parallelo per ciascun vertice all'interno di compute shaders GPU, eliminando la necessità di computazioni topologiche pesanti su CPU.

---

## 3. Note Implementative
- **Collocazione**: `crates/vector/src/stroke.rs`.
- Target: generazione immediata di geometrie triangolari per il rendering vettoriale WebGPU.
