<!--
Pizzico — docs/algorithms/recursive-filter.md
Riferimento manifesto: §6.1
Licenza: MIT OR Apache-2.0
-->

# Filtro Ricorsivo O(1) e Summed-Area Tables (GPU)

## 1. Paper di Riferimento
- **Autori**: Diego Nehab, Max Oliveira, Thiago Cavalcanti
- **Titolo**: *Constant-Time GPU Filter for Large-Kernel Blur and Summed-Area Tables*
- **Pubblicazione**: ACM Transactions on Graphics (SIGGRAPH Asia 2011).
- **DOI**: [10.1145/2070781.2024190](https://doi.org/10.1145/2070781.2024190)

---

## 2. Formulazione Matematica

I filtri IIR (Infinite Impulse Response) e le tabelle delle aree sommate (SAT / Immagini Integrali) calcolano la convoluzione bidimensionale tramite passate separabili unidimensionali in avanti e all'indietro:

Passata causale (avanti):
$$y^+[n] = x[n] + b_1 y^+[n-1] + \dots + b_k y^+[n-k]$$

Passata anticausale (indietro):
$$y^-[n] = y^+[n] + b_1 y^-[n+1] + \dots + b_k y^-[n+k]$$

Con una cascata di 3-4 filtri ricorsivi box o Deriche, si approssima la sfocatura gaussiana $\frac{1}{\sqrt{2\pi}\sigma} e^{-\frac{x^2}{2\sigma^2}}$ con precisione assoluta a tempo costante $\mathcal{O}(1)$ indipendentemente dal valore di $\sigma$.

---

## 3. Note Implementative
- **Collocazione**: `crates/raster/src/recursive.rs`.
- Implementazione sia in CPU con SIMD che su shader WebGPU computazionali (WGSL compute passes).
- Permette sfocature con raggi enormi (es. $R = 200\text{px}$) a 60 FPS stabili.
