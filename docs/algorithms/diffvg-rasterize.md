<!--
Pizzico — docs/algorithms/diffvg-rasterize.md
Riferimento manifesto: §6.2
Licenza: MIT OR Apache-2.0
-->

# Rasterizzazione Vettoriale Analitica — diffvg Model

## 1. Paper di Riferimento
- **Autori**: Tzu-Mao Li, Michal Lukáč, Michaël Gharbi, Jonathan Ragan-Kelley
- **Titolo**: *Differentiable Vector Graphics Rasterization for Editing and Learning*
- **Pubblicazione**: ACM Transactions on Graphics (SIGGRAPH 2020), 39(6), Article 193.
- **DOI**: [10.1145/3414685.3417871](https://doi.org/10.1145/3414685.3417871)

---

## 2. Formulazione Matematica

La copertura $A(\mathbf{p})$ di un pixel centrato in $\mathbf{p} = (x, y)$ da parte di una curva o poligono è calcolata come integrale di superficie sul dominio del pixel:

$$A(\mathbf{p}) = \iint_{[-0.5, 0.5]^2} \chi_{\text{poly}}(\mathbf{p} + (u, v)) \, du \, dv$$
dove $\chi_{\text{poly}}$ è la funzione indicatrice della geometria.

Tramite il teorema della divergenza di Green, l'integrale bidimensionale di superficie viene convertito in un integrale lineare lungo i soli segmenti di bordo orientati che intersecano il pixel:
$$A(\mathbf{p}) = \oint_{\partial \Omega \cap \text{pixel}(\mathbf{p})} x \, dy$$

Questo produce un antialiasing analitico sub-pixel perfetto, privo di rumore stocastico di multisampling.

---

## 3. Note Implementative
- **Collocazione**: `crates/vector/src/rasterize.rs`.
