<!--
Pizzico — docs/algorithms/poisson-editing.md
Riferimento manifesto: §6.1
Licenza: MIT OR Apache-2.0
-->

# Poisson Image Editing — Seamless Cloning

## 1. Paper di Riferimento
- **Autori**: Patrick Pérez, Michel Gangnet, Jérôme Blake / Jean-Michel Di Martino, Gabriele Facciolo, Enric Meinhardt-Llopis
- **Titoli**:
  - *Poisson Image Editing* (ACM TOG / SIGGRAPH 2003, 22(3):313–318)
  - *Poisson Image Editing* (Image Processing On Line — IPOL 2016, 6:300–325)
- **DOI**: [10.5201/ipol.2016.163](https://doi.org/10.5201/ipol.2016.163)

---

## 2. Formulazione Matematica

Dato un campo guida vettoriale $\mathbf{v}$ (tipicamente il gradiente della sorgente $\nabla g$) e una regione target $\Omega$ con contorno $\partial \Omega$ e valori al bordo $f^*$:

L'interpolazione seamless risolve il problema variazionale:
$$\min_f \iint_{\Omega} \|\nabla f - \mathbf{v}\|^2 \, dx \, dy \quad \text{con } f|_{\partial \Omega} = f^*|_{\partial \Omega}$$

L'equazione di Eulero-Lagrange associata è l'equazione di Poisson con vincoli di Dirichlet:
$$\Delta f = \operatorname{div}\mathbf{v} \quad \text{in } \Omega, \quad \left. f \right|_{\partial \Omega} = \left. f^* \right|_{\partial \Omega}$$

Discretizzazione su griglia cartesiana 2D a 5 punti:
$$4 f_{x,y} - f_{x-1,y} - f_{x+1,y} - f_{x,y-1} - f_{x,y+1} = \operatorname{div}\mathbf{v}_{x,y}$$

---

## 3. Note Implementative
- **Collocazione**: `crates/inpainting/src/poisson.rs`.
- **Due solutori disponibili**:
  1. *Differenze finite iterative (Gauss-Seidel / Multigrid)* per regioni arbitrarie su WebAssembly.
  2. *Trasformata di Fourier discreta (FFT/Sine Transform)* per bounding box rettangolari (circa $2\times$ più veloce).

---

## 4. Complessità Computazionale
- **Solutore FFT**: $\mathcal{O}(N \log N)$ dove $N = W \cdot H$.
- **Solutore Multigrid / Iterativo**: $\mathcal{O}(k \cdot |\Omega|)$ con convergenza lineare.
