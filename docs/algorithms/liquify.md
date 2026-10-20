<!--
Pizzico — docs/algorithms/liquify.md
Riferimento manifesto: §6.1
Licenza: MIT OR Apache-2.0
-->

# Deformazione Liquify — Moving Least Squares (MLS)

## 1. Paper di Riferimento
- **Autori**: Scott Schaefer, Travis McPhail, Joe Warren
- **Titolo**: *Image Deformation Using Moving Least Squares*
- **Pubblicazione**: ACM Transactions on Graphics (SIGGRAPH 2006), 25(3):533–540.
- **DOI**: [10.1145/1141911.1141920](https://doi.org/10.1145/1141911.1141920)

---

## 2. Formulazione Matematica

Dati $n$ punti di controllo sorgente $\mathbf{p}_i$ e le corrispondenti posizioni deformate $\mathbf{q}_i$:

Per ogni punto dello spazio $\mathbf{v}$, la deformazione trova una trasformazione affine $l_\mathbf{v}(\mathbf{x})$ che minimizza:
$$\sum_{i=1}^n w_i \| l_\mathbf{v}(\mathbf{p}_i) - \mathbf{q}_i \|^2$$
dove i pesi $w_i$ dipendono dalla distanza inversa rispetto a $\mathbf{v}$:
$$w_i = \frac{1}{\|\mathbf{p}_i - \mathbf{v}\|^{2\alpha}}, \quad \alpha \ge 1$$

Nella formulazione *Rigid Moving Least Squares*, la trasformazione $l_\mathbf{v}$ è vincolata a essere una roto-traslazione con fattore di scala uniforme, preservando le forme locali e prevenendo distorsioni anisotropiche o collassi del volume.

---

## 3. Note Implementative
- **Collocazione**: `crates/raster/src/liquify.rs`.
- Implementazione a griglia di deformazione precalcolata per consentire rendering interattivo a 60 FPS durante il trascinamento col pennello o touch.
