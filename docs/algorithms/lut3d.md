<!--
Pizzico — docs/algorithms/lut3d.md
Riferimento manifesto: §6.1
Licenza: MIT OR Apache-2.0
-->

# 3D LUT Adattive per Gradazione e Correzione Colore

## 1. Paper di Riferimento
- **Autori**: Hui Zeng, Jianrui Cai, Lida Li, Zisheng Cao, Lei Zhang
- **Titolo**: *Learning Image-adaptive 3D Lookup Tables for High Performance Photo Enhancement in Real-time*
- **Pubblicazione**: IEEE Transactions on Pattern Analysis and Machine Intelligence (TPAMI 2020).
- **DOI**: [10.1109/TPAMI.2020.3026740](https://doi.org/10.1109/TPAMI.2020.3026740)

---

## 2. Formulazione Matematica

Una 3D LUT reticolare $V$ di dimensione $N \times N \times N$ (tipicamente $N = 33$ o $65$) discretizza lo spazio colore RGB. Per un colore in ingresso $\mathbf{c} = (r, g, b) \in [0, 1]^3$, il valore interpolato con schema trilineare o tetraedrico è:

$$\phi(\mathbf{c}, V) = \sum_{i,j,k \in \{0, 1\}} w_{i,j,k} V(r_0 + i, g_0 + j, b_0 + k)$$
dove $w_{i,j,k}$ sono i pesi dei volumi di cella discreti.

Nella formulazione ad asset multipli con pesi contestuali:
$$V_{\text{final}} = \sum_{m=1}^M \alpha_m V_m$$
dove $\alpha_m$ sono coefficienti derivati dalle statistiche globali della scena (luminanza media, deviazione standard, saturazione).

---

## 3. Note Implementative
- **Collocazione**: `crates/color/src/lut.rs`.
- Esecuzione hardware immediata tramite texture 3D WebGPU con interpolazione hardware a tempo costante ($<2\text{ms}$ su risoluzione 4K).
