<!--
Pizzico — docs/algorithms/color-management.md
Riferimento manifesto: §3.1, §4, §6.1
Licenza: MIT OR Apache-2.0
-->

# Color Science, Spazi Percettivi e Gestione Profili ICC

Pizzico implementa un motore colorimetrico avanzato, deterministico e puro Rust compilabile per WebAssembly (`wasm32-unknown-unknown`), senza alcuna dipendenza da librerie C (`lcms2`) o FFI proprietari.

---

## 1. Riferimenti Scientifici e Standard

1. **Spazio Percettivo Uniforme OkLab e OkLCh**
   - **Autore**: Björn Ottosson (2020).
   - **Pubblicazione**: *A perceptual color space for image processing*.
   - **Link**: [https://bottosson.github.io/posts/oklab/](https://bottosson.github.io/posts/oklab/)
   - **Ruolo**: Spazio percettivo per blending, interpolazione di gradienti e regolazione saturazione/luminosità senza distorsione di tinta (hue shift).

2. **Temperatura di Colore Correlata (CCT) e Tint Duv**
   - **Autori**: Yoshi Ohno (2013); A. R. Robertson (1968); D. Y. Kim et al. (2002).
   - **Pubblicazioni**:
     - Yoshi Ohno, *Practical Use and Calculation of CCT and Duv*, LEUKOS 10(1):47-55 (2013).
     - A. R. Robertson, *Computation of Correlated Color Temperature and Distribution Temperature*, JOSA 58(11):1528-1535 (1968).
   - **Ruolo**: Calcolo e bilanciamento del bianco a partire da coordinate di cromaticità $(x, y)$ nello spazio CIE 1931 / CIE 1960 UCS.

3. **Interpolazione Monotona a Spline Cubiche**
   - **Autori**: F. N. Fritsch, R. E. Carlson (1980).
   - **Pubblicazione**: *Monotone Piecewise Cubic Interpolation*, SIAM Journal on Numerical Analysis, 17(2):238–246.
   - **Ruolo**: Modellazione delle curve di tono (tone curves) per contrasto e gradazione colore, garantendo l'assenza assoluta di sovraelongazioni (overshoot/undershoot) o inversioni non monotone.

4. **Specifiche Profili Colore ICC v4**
   - **Ente**: International Color Consortium (ICC).
   - **Specifica**: *ICC.1:2010 (Profile version 4.3.0.0): Image technology colour management — Architecture, profile format, and data structure*.
   - **Ruolo**: Generazione e parsing deterministico di profili ICC display-class matrix/TRC per l'interscambio con file PSD, TIFF, PNG e JPEG.

---

## 2. Formulazione Matematica

### 2.1 Adattamento Cromatico Bradford D65 $\to$ D50

I profili ICC impiegano lo spazio di connessione profilo (PCS) calibrato su illuminante D50 ($x_w = 0.3457, y_w = 0.3585$). I primari calibrati su D65 (come sRGB e Display P3) vengono proiettati mediante la matrice di adattamento cromatico Bradford:

$$M_{\text{Bradford}} = \begin{bmatrix}
0.8951 & 0.2664 & -0.1614 \\
-0.7502 & 1.7135 & 0.0367 \\
0.0389 & -0.0685 & 1.0296
\end{bmatrix}$$

Dato il vettore di risposte dei coni $\mathbf{\rho} = M_{\text{Bradford}} \mathbf{X}_{\text{src}}$ e $\mathbf{\rho}_{\text{dst}} = M_{\text{Bradford}} \mathbf{X}_{\text{dst}}$:
$$M_{\text{adapt}} = M_{\text{Bradford}}^{-1} \operatorname{diag}\left(\frac{\rho_{\text{dst}}}{\rho_{\text{src}}}\right) M_{\text{Bradford}}$$

### 2.2 Trasformazione OkLab (Ottosson 2020)

Dato un colore in RGB lineare nello spazio Rec.2020 o sRGB, la trasformazione in OkLab $(L, a, b)$ avviene attraverso una proiezione a coni non lineari con radice cubica:

$$\begin{bmatrix} l \\ m \\ s \end{bmatrix} = M_1 \begin{bmatrix} r \\ g \\ b \end{bmatrix}$$

$$l' = \sqrt[3]{l}, \quad m' = \sqrt[3]{m}, \quad s' = \sqrt[3]{s}$$

$$\begin{bmatrix} L \\ a \\ b \end{bmatrix} = M_2 \begin{bmatrix} l' \\ m' \\ s' \end{bmatrix}$$

La conversione cilindrica in OkLCh calcola luminosità $L$, croma $C = \sqrt{a^2 + b^2}$ e angolo di tonalità $h = \operatorname{atan2}(b, a)$.

### 2.3 Spline Monotone di Fritsch-Carlson (1980)

Dati $n$ punti di controllo ordinati $(x_i, y_i)$, siano $\Delta_i = (y_{i+1} - y_i) / (x_{i+1} - x_i)$ le pendenze secanti e $d_i$ le derivate tangenti iniziali:
Se $\Delta_i = 0$, allora $d_i = d_{i+1} = 0$.
Definiti $\alpha_i = d_i / \Delta_i$ e $\beta_i = d_{i+1} / \Delta_i$, se $\alpha_i^2 + \beta_i^2 > 9$, la pendenza viene normalizzata sul cerchio di raggio 3 per garantire la monotonia:
$$\tau_i = \frac{3}{\sqrt{\alpha_i^2 + \beta_i^2}}, \quad d_i \leftarrow \tau_i \alpha_i \Delta_i, \quad d_{i+1} \leftarrow \tau_i \beta_i \Delta_i$$

---

## 3. Mappatura dei Moduli in `crates/color`

| Modulo | File | Responsabilità |
|---|---|---|
| **Matrici e Vettori** | [`mat.rs`](../../crates/color/src/mat.rs) | Matrice 3×3 (`Mat3`), coordinate cromatiche (`Xy`), illuminanti standard (D50, D65), adattamento cromatico Bradford. |
| **Spazi Colore** | [`spaces.rs`](../../crates/color/src/spaces.rs) | Gamut standard (`sRGB`, `Display P3`, `Rec.2020`, `ProPhoto`, `Adobe RGB`), conversione diretta tra spazi. |
| **Funzioni di Trasferimento** | [`transfer.rs`](../../crates/color/src/transfer.rs) | Curve elettro-ottiche ed ottico-elettroniche: sRGB, Rec.709, Gamma pura, HDR PQ (ST.2084), HLG. |
| **Spazi Percettivi** | [`perceptual.rs`](../../crates/color/src/perceptual.rs) | Conversioni esatte OkLab, OkLCh, HSV, HSL da/verso sRGB e Rec.2020 lineari. |
| **Temperatura Colore e Tint** | [`cct.rs`](../../crates/color/src/cct.rs) | Correlated Color Temperature (CCT), calcolo e correzione del bilanciamento del bianco (`wb_matrix`). |
| **Curve di Tono Monotone** | [`spline.rs`](../../crates/color/src/spline.rs) | Spline cubiche monotone Fritsch-Carlson (`MonotoneCurve`) e tabelle 1D interpolate (`Lut1`). |
| **Gestione Profili ICC** | [`icc.rs`](../../crates/color/src/icc.rs) | Engine puro Rust basato su `moxcms`: serializzazione display-class ICC v4, parsing sicuro non-panicking, riconoscimento spazi noti (`NamedSpace`). |
