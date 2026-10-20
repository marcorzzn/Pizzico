<!--
Pizzico — docs/algorithms/compositing.md
Riferimento manifesto: §6.1
Licenza: MIT OR Apache-2.0
-->

# Alpha Compositing e Decomposizione Non-Lineare (Unblending)

## 1. Paper e Standard di Riferimento
- **Autori**: Alvy Ray Smith / Daichi Horita et al.
- **Titoli**:
  - *Alpha and the History of Digital Compositing* (Microsoft Research Technical Memo 7, 1995)
  - *Unblending for Layered Image Decomposition* (IEEE/CVF WACV 2022)
- **DOI**: [10.1109/WACV51458.2022.00287](https://doi.org/10.1109/WACV51458.2022.00287)

---

## 2. Formulazione Matematica

Dato un pixel sorgente premoltiplicato $(C_s, \alpha_s)$ e uno destinazione $(C_d, \alpha_d)$ con operazione di fusione $B(C_s, C_d)$:

L'equazione di fusione generale e corretta per alpha compositing è:
$$\alpha_o = \alpha_s + \alpha_d (1 - \alpha_s)$$
$$C_o = \frac{\alpha_s (1 - \alpha_d) C_s + \alpha_s \alpha_d B(C_s, C_d) + \alpha_d (1 - \alpha_s) C_d}{\alpha_o}$$

### Inversione (Unblending Horita et al.):
Per recuperare lo strato sorgente $C_s$ nota l'immagine composita finale $C_o$ e lo sfondo $C_d$:
$$C_s = B^{-1}\left( C_d, \frac{C_o - C_d (1 - \alpha_s)}{\alpha_s} \right)$$
garantendo decomposizioni non-distruttive invertibili per tutti i 12 metodi standard di fusione.

---

## 3. Note Implementative
- **Collocazione**: `crates/core/src/compositing.rs` e `crates/core/src/blend.rs`.
- Calcolo in virgola mobile a 32-bit (o FP16 su GPU) per prevenire banding o artefatti di troncamento prima della quantizzazione a 8-bit.
