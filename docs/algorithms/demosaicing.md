<!--
Pizzico — docs/algorithms/demosaicing.md
Riferimento manifesto: §6.1
Licenza: MIT OR Apache-2.0
-->

# Demosaicing per Camera RAW — Residual Interpolation

## 1. Paper di Riferimento
- **Autori**: Daisuke Kiku, Noriche Monno, Masayuki Tanaka, Masatoshi Okutomi
- **Titolo**: *Residual Interpolation for Color Image Demosaicking*
- **Pubblicazione**: IEEE Transactions on Image Processing (TIP), Vol. 25, No. 3, 2016.
- **DOI**: [10.1109/TIP.2015.2511582](https://doi.org/10.1109/TIP.2015.2511582)

---

## 2. Formulazione Matematica

A differenza dei metodi convenzionali basati su differenze di colore ($R - G$, $B - G$), la Residual Interpolation (RI) opera interpolando le stime dei residui tra i valori campionati dal Color Filter Array (Bayer CFA) e una stima preliminare guidata del canale verde $\tilde{G}$:

$$R_{\text{res}} = R_{\text{sampled}} - \tilde{R}_{\text{est}}$$
dove la stima preliminare $\tilde{R}_{\text{est}}$ è calcolata tramite interpolazione con pesi direzionali basati su gradienti laplaciani.

Poiché il campo dei residui ha una varianza e un'energia alle alte frequenze drasticamente inferiori rispetto al segnale cromatico originale, l'interpolazione preserva i bordi netti ed elimina l'effetto "zippering" e il moiré cromatico tipico di demosaicing semplici.

---

## 3. Note Implementative
- **Collocazione**: `crates/color/src/demosaic.rs`.
- Target: Sviluppo digitale rapido di file DNG / Camera RAW (Fase 4 della roadmap).
