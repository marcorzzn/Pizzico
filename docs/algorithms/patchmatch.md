<!--
Pizzico — docs/algorithms/patchmatch.md
Riferimento manifesto: §6.1
Licenza: MIT OR Apache-2.0
-->

# Content-Aware Fill — PatchMatch

## 1. Paper di Riferimento
- **Autori**: Connelly Barnes, Eli Shechtman, Adam Finkelstein, Dan B Goldman
- **Titolo**: *PatchMatch: A Randomized Correspondence Algorithm for Structural Image Editing*
- **Pubblicazione**: ACM Transactions on Graphics (SIGGRAPH 2009), Vol. 28, No. 3, Article 24.
- **DOI / URL**: [ACM Digital Library](https://doi.org/10.1145/1531326.1531330)

---

## 2. Formulazione Matematica

Dato un'immagine target $T$ con una regione lacunosa (maschera di rimozione) $\Omega \subset \mathbb{R}^2$ e un'immagine sorgente $S$:

Il Nearest-Neighbor Field (NNF) è una funzione vettoriale $f: \Omega \to S$ che assegna a ogni patch centrata in $\mathbf{p} \in \Omega$ la coordinata $\mathbf{q} = f(\mathbf{p}) \in S$ che minimizza la distanza di somiglianza:
$$D(\mathbf{p}, \mathbf{q}) = \sum_{\Delta \in [-r, r]^2} \| T(\mathbf{p} + \Delta) - S(\mathbf{q} + \Delta) \|_2^2$$
dove $r$ è il raggio della patch.

### Fasi dell'Algoritmo:
1. **Inizializzazione Casuale**: per ogni $\mathbf{p} \in \Omega$, $f(\mathbf{p}) \sim \mathcal{U}(S \setminus \Omega)$.
2. **Propagazione Spaziale**: iterando con ordine scansione interleaved (top-left $\to$ bottom-right e viceversa):
   $$f(\mathbf{p}) \leftarrow \arg\min_{\mathbf{v} \in \{f(\mathbf{p}), f(\mathbf{p} - \mathbf{e}_x) + \mathbf{e}_x, f(\mathbf{p} - \mathbf{e}_y) + \mathbf{e}_y\}} D(\mathbf{p}, \mathbf{v})$$
3. **Ricerca Casuale (Random Search)**: campionamento a raggio decrescente esponenziale:
   $$\mathbf{u}_i = f(\mathbf{p}) + \alpha^i R_{\max} \mathbf{v}_i, \quad \mathbf{v}_i \sim \mathcal{U}([-1, 1]^2), \quad \alpha = 0.5$$

---

## 3. Note Implementative
- **Collocazione**: `crates/inpainting/src/patchmatch.rs`.
- **Tiling GPU / CPU**: suddivisione dell'immagine in blocchi di dimensione corrispondente alla cache L1 per evitare cache misses.
- **Spazio Colore**: calcolo della distanza euclidea su canali lineari $L^*a^*b^*$ o sRGB pesato percettivamente.
- **Nessuna dipendenza da IA**: l'algoritmo è 100% deterministico nel seed, matematicamente verificabile e offline-first.

---

## 4. Complessità Computazionale
- **Inizializzazione**: $\mathcal{O}(|\Omega| \cdot r^2)$
- **Iterazione (propagazione + search)**: $\mathcal{O}(|\Omega| \cdot r^2 \cdot \log R_{\max})$
- **Complessità Asintotica Totale**: $\mathcal{O}(k \cdot |\Omega|)$ per $k \approx 4-5$ iterazioni, con speedup di $20\times - 100\times$ rispetto alla ricerca esaustiva brute-force.
