<!--
Pizzico — docs/algorithms/median-filter.md
Riferimento manifesto: §6.1
Licenza: MIT OR Apache-2.0
-->

# Filtro Mediano in Tempo Costante O(1)

## 1. Paper di Riferimento
- **Autori**: Simon Perreault, Patrick Hébert
- **Titolo**: *Median Filtering in Constant Time*
- **Pubblicazione**: IEEE Transactions on Image Processing (TIP), Vol. 16, No. 9, Settembre 2007, pp. 2389–2394.
- **DOI**: [10.1109/TIP.2007.902329](https://doi.org/10.1109/TIP.2007.902329)

---

## 2. Formulazione Matematica

Dato un kernel quadrato di lato $2r + 1$ contenente $N = (2r + 1)^2$ pixel, il filtro mediano estrae il valore $m$ tale che:
$$\sum_{i=0}^{m-1} H(i) \le \frac{N}{2} < \sum_{i=0}^{m} H(i)$$
dove $H$ è l'istogramma dei valori nella finestra.

L'innovazione di Perreault & Hébert consiste nell'utilizzare:
1. Un istogramma locale $H_{col}[x]$ per ciascuna colonna di altezza $2r+1$.
2. Quando la finestra scorre di una riga verso il basso, ogni istogramma colonna viene aggiornato in $\mathcal{O}(1)$ togliendo il pixel superiore e aggiungendo quello inferiore.
3. Quando la finestra scorre orizzontalmente di un pixel, l'istogramma totale della finestra $H_{win}$ viene aggiornato sottraendo l'istogramma colonna uscente e sommando quello entrante.

---

## 3. Note Implementative
- **Collocazione**: `crates/raster/src/median.rs`.
- La complessità computazionale è rigorosamente **indipendente dal raggio $r$** del filtro.

---

## 4. Complessità Computazionale
- **Complessità Temporale per pixel**: $\mathcal{O}(1)$ rispetto a $r$ (invece di $\mathcal{O}(r^2)$ dell'algoritmo ingenuo e $\mathcal{O}(r)$ dell'algoritmo di Huang).
