<!--
Pizzico — docs/algorithms/graphcut-segmentation.md
Riferimento manifesto: §6.3
Licenza: MIT OR Apache-2.0
-->

# Segmentazione Foreground Rapida — Multilevel Graph Cut

## 1. Paper di Riferimento
- **Autori**: R. Garcia, F. Madera, M. R. Teisseire et al.
- **Titolo**: *Real-time Interactive Foreground Extraction on Mobile Devices*
- **Pubblicazione**: Graphics Interface 2015, pp. 119–126.
- **DOI**: [10.20380/GI2015.16](https://doi.org/10.20380/GI2015.16)

---

## 2. Formulazione Matematica

La segmentazione dell'immagine in primo piano (foreground $F$) e sfondo (background $B$) è formulata come minimizzazione dell'energia di Gibbs su grafo:

$$E(L) = \sum_{p \in \mathcal{V}} D_p(L_p) + \lambda \sum_{(p, q) \in \mathcal{E}} V_{p,q}(L_p, L_q)$$
dove:
- $L_p \in \{0, 1\}$ è l'etichetta binaria assegnata al pixel $p$.
- $D_p(L_p)$ è il termine di dato (log-likelihood basata su istogrammi o GMM del colore).
- $V_{p,q}$ è il termine di regolarità (smoothness) che penalizza bordi disomogenei:
  $$V_{p,q}(L_p, L_q) = [L_p \ne L_q] \cdot \exp\left( -\frac{\|I_p - I_q\|^2}{2\sigma^2} \right) \cdot \frac{1}{\operatorname{dist}(p, q)}$$

L'approccio *Multilevel* crea una piramide di immagini a risoluzione dimezzata; risolve il min-cut/max-flow (Boykov-Kolmogorov) al livello coarse e propaga la banda di incertezza ai livelli superiori riducendo il tempo di calcolo a pochi millisecondi.

---

## 3. Note Implementative
- **Collocazione**: `crates/selection/src/graphcut.rs`.
- Consente la rimozione rapida dello sfondo one-tap su mobile senza invocare reti neurali o servizi esterni.
