<!--
Pizzico — docs/algorithms/grabcut.md
Riferimento manifesto: §6.3
Licenza: MIT OR Apache-2.0
-->

# Segmentazione Interattiva Classica — GrabCut

## 1. Paper di Riferimento
- **Autori**: Carsten Rother, Vladimir Kolmogorov, Andrew Blake (Microsoft Research Cambridge)
- **Titolo**: *“GrabCut” — Interactive Foreground Extraction using Iterated Graph Cuts*
- **Pubblicazione**: ACM Transactions on Graphics (SIGGRAPH 2004), 23(3):309–314.
- **DOI**: [10.1145/1015706.1015720](https://doi.org/10.1145/1015706.1015720)

---

## 2. Formulazione Matematica

Modellazione del colore di primo piano e sfondo tramite due insiemi di $K$ componenti di miscele gaussiane (Gaussian Mixture Models — GMM):

$$p(z_n | \alpha_n = 0, \theta) = \sum_{k=1}^K \pi_k^B \mathcal{N}(z_n; \mu_k^B, \Sigma_k^B)$$
$$p(z_n | \alpha_n = 1, \theta) = \sum_{k=1}^K \pi_k^F \mathcal{N}(z_n; \mu_k^F, \Sigma_k^F)$$

### Ciclo Iterativo:
1. Assegna a ogni pixel la componente GMM più probabile.
2. Stima i parametri GMM $(\pi, \mu, \Sigma)$ per i pixel correnti.
3. Costruisce il grafo con i t-link pesati dalle probabilità e gli n-link pesati dalle differenze cromatiche.
4. Esegue il min-cut globale (Boykov-Kolmogorov).
5. Ripete fino a convergenza dell'energia (tipicamente 3–5 iterazioni).

---

## 3. Note Implementative
- **Collocazione**: `crates/selection/src/grabcut.rs`.
- Totalmente autonomo, offline, senza dipendenze IA, matematicamente verificabile.
