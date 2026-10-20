<!--
Pizzico — docs/algorithms/healing-brush.md
Riferimento manifesto: §6.1
Licenza: MIT OR Apache-2.0
-->

# Healing Brush — PDE del 4° Ordine

## 1. Paper di Riferimento
- **Autore**: Todor Georgiev (Adobe Systems)
- **Titolo**: *Covariant Derivatives and Vision: Healing Brush, Inpainting and Cloning*
- **Pubblicazione**: ACM SIGGRAPH 2004 Course Notes / Adobe Technical Report 2005.
- **Riferimento**: Georgiev, T. (2005). *Photoshop Healing Brush and related algorithms*.

---

## 2. Formulazione Matematica

Mentre la clonazione Poisson standard di 2° ordine risolve l'equazione di Laplace $\Delta f = 0$ (o $\Delta f = \operatorname{div}\mathbf{v}$) imponendo continuità di valore $C^0$ sul contorno $\partial \Omega$, la formulazione di Georgiev per l'Healing Brush risolve un'equazione differenziale alle derivate parziali (PDE) del **quarto ordine** (equazione biarmonica):

$$\Delta^2 f = 0 \quad \text{in } \Omega$$
ovvero:
$$\nabla^4 f = \left( \frac{\partial^2}{\partial x^2} + \frac{\partial^2}{\partial y^2} \right)^2 f = \frac{\partial^4 f}{\partial x^4} + 2 \frac{\partial^4 f}{\partial x^2 \partial y^2} + \frac{\partial^4 f}{\partial y^4} = 0$$

### Condizioni al Contorno:
1. **Continuità di Valore ($C^0$)**: $f|_{\partial \Omega} = g|_{\partial \Omega}$
2. **Continuità di Gradiente / Derivata Normale ($C^1$)**: $\left. \frac{\partial f}{\partial \mathbf{n}} \right|_{\partial \Omega} = \left. \frac{\partial g}{\partial \mathbf{n}} \right|_{\partial \Omega}$

Questo garantisce che sia l'intensità che la transizione luminosa non creino "aloni scuri" o "sfocature" nei punti di giunzione ad alto contrasto.

---

## 3. Note Implementative
- **Collocazione**: `crates/inpainting/src/healing.rs`.
- **Discretizzazione numerica**: stencil discreto a 13 punti su griglia regolare cartesiana.
- **Solutore**: rilassamento iterativo Successive Over-Relaxation (SOR) o Jacobi su WebAssembly con buffer SIMD.

---

## 4. Complessità Computazionale
- **Complessità Temporale per Iterazione**: $\mathcal{O}(|\Omega|)$.
- **Convergenza**: richiede circa 20–50 iterazioni su patch locali ($R \le 64\text{px}$), eseguibile in $<15\text{ms}$ nel browser.
