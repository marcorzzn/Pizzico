<!--
Pizzico — docs/algorithms/bezier.md
Riferimento manifesto: §6.2
Licenza: MIT OR Apache-2.0
-->

# Curve Bézier Cubiche Parametriche

## 1. Trattato Scientifico di Riferimento
- **Autori**: Tom Lyche, Jean-Louis Merrien
- **Titolo**: *Parametric Bézier Curves and Splines*
- **Pubblicazione**: Springer, 2014.
- **Riferimento Classico**: de Casteljau, P. (1959), Bézier, P. (1962).

---

## 2. Formulazione Matematica

Una curva Bézier cubica nel piano $\mathbb{R}^2$ è definita per $t \in [0, 1]$ dai quattro punti di controllo $\mathbf{P}_0, \mathbf{P}_1, \mathbf{P}_2, \mathbf{P}_3$:

$$\mathbf{B}(t) = (1 - t)^3 \mathbf{P}_0 + 3(1 - t)^2 t \mathbf{P}_1 + 3(1 - t) t^2 \mathbf{P}_2 + t^3 \mathbf{P}_3 = \sum_{i=0}^3 B_{i,3}(t) \mathbf{P}_i$$
dove $B_{i,3}(t)$ sono i polinomi della base di Bernstein di grado 3.

### Derivate e Curvatura:
- **Tangente**: $\mathbf{B}'(t) = 3(1 - t)^2 (\mathbf{P}_1 - \mathbf{P}_0) + 6(1 - t) t (\mathbf{P}_2 - \mathbf{P}_1) + 3t^2 (\mathbf{P}_3 - \mathbf{P}_2)$
- **Curvatura Intrinseca $\kappa(t)$**:
  $$\kappa(t) = \frac{\mathbf{B}'(t) \times \mathbf{B}''(t)}{\|\mathbf{B}'(t)\|^3} = \frac{x'(t) y''(t) - y'(t) x''(t)}{(x'(t)^2 + y'(t)^2)^{3/2}}$$

---

## 3. Note Implementative
- **Collocazione**: `crates/vector/src/bezier.rs`.
- Valutazione numericamente stabile tramite algoritmo ricorsivo di de Casteljau.
- Suddivisione adattiva (adaptive flattening) basata sulla tolleranza di flatness di deviazione cordale.
