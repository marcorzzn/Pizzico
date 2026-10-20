<!--
Pizzico — docs/algorithms/kappa-curves.md
Riferimento manifesto: §6.2
Licenza: MIT OR Apache-2.0
-->

# Curvature Tool — κ-Curves

## 1. Paper di Riferimento
- **Autori**: Hong-Chao Yan, Chiew-Lan Tai et al. / Norimasa Miura, Chiew-Lan Tai et al. / Zain et al.
- **Titoli**:
  - *κ-curves: Interpolation at local maximum curvature points* (ACM TOG 2017)
  - *κ-curves: An implementation for smooth curve design* (The Visual Computer 2021)
- **DOI**: [10.1007/s00371-020-01932-9](https://doi.org/10.1007/s00371-020-01932-9)
- **Nota Industriale**: La formulazione teorica delle κ-curves è **esplicitamente alla base del Curvature Tool** presente in Adobe Illustrator e Photoshop.

---

## 2. Formulazione Matematica

Le spline e curve Bézier classiche raramente presentano i massimi di curvatura esattamente nei punti di controllo toccati dall'utente, provocando oscillazioni e flessi antiestetici.

Le **κ-curves** risolvono questo problema vincolando esplicitamente la curva interpolante $\mathbf{C}(t)$ affinché:
1. La curva passi per ciascun punto di input: $\mathbf{C}(t_i) = \mathbf{P}_i$.
2. Ciascun punto $\mathbf{P}_i$ coincida con un **estremo locale di curvatura**:
   $$\left. \frac{d\kappa(t)}{dt} \right|_{t = t_i} = 0$$
3. La curva risultante sia quasi-ovunque $G^2$ (continuità geometrica di curvatura) e derivabile.

Il problema si traduce nella risoluzione di un sistema di equazioni non-lineari per determinare la lunghezza ottimale delle tangenti in funzione degli angoli incidenti ai vertici.

---

## 3. Note Implementative
- **Collocazione**: `crates/vector/src/kappa_curves.rs`.
- Permette all'utente di disegnare forme organiche con pochi click senza mai dover estrarre o orientare manualmente le maniglie di controllo Bézier.
