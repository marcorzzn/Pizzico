<!--
Pizzico — docs/algorithms/sparse-filtering.md
Riferimento manifesto: §6.1
Licenza: MIT OR Apache-2.0
-->

# Filtri Sparsi ad Alte Prestazioni

## 1. Paper di Riferimento
- **Autori**: Vincent Schuster et al.
- **Titolo**: *High-Performance Sparse Image Filtering*
- **Pubblicazione**: PACMCGIT 2020.
- **DOI**: [10.1145/3386569.3392437](https://doi.org/10.1145/3386569.3392437)

---

## 2. Formulazione Matematica

Sostituisce le matrici dense di convoluzione $K \in \mathbb{R}^{(2r+1) \times (2r+1)}$ con combinazioni lineari sparse di campioni distanziati lungo anelli concentrici o spirali di Fermat:

$$I_{\text{filtered}}(\mathbf{x}) = \sum_{i=1}^M w_i I(\mathbf{x} + \mathbf{s}_i)$$
dove $M \ll (2r+1)^2$ (tipicamente $M \le 16$ anche per raggi superiori a $50\text{px}$).

I pesi $w_i$ e gli offset $\mathbf{s}_i$ sono calcolati tramite ottimizzazione quadratica per minimizzare la discrepanza spettrale rispetto al filtro target desiderato (es. Gaussian, Bilateral, Gabor).

---

## 3. Note Implementative
- **Collocazione**: `crates/raster/src/sparse.rs`.
- Ideale per filtri artistici complessi su mobile e canvas WebGL2/WebGPU con texture sampling bilineare hardware.
