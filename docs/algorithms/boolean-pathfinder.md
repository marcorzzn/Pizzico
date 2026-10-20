<!--
Pizzico — docs/algorithms/boolean-pathfinder.md
Riferimento manifesto: §6.2
Licenza: MIT OR Apache-2.0
-->

# Operazioni Booleane Esatte (Pathfinder) — Conic Arrangements

## 1. Paper di Riferimento
- **Autori**: Eric Berberich, Arno Eigenwillig, Michael Hemmer, Susan Hert, Kurt Mehlhorn, Elmar Schömer
- **Titolo**: *A Complete, Exact and Efficient Implementation for Computing Arrangements of Conic Arcs*
- **Pubblicazione**: ESA 2002: Algorithms — ESA 2002, pp. 146–157.
- **Riferimento Classico**: Halperin, D. (Arrangements), CGAL Boolean Operations.

---

## 2. Formulazione Matematica

Le operazioni booleane 2D (Unione $A \cup B$, Intersezione $A \cap B$, Differenza $A \setminus B$, Esclusione $A \oplus B$) tra curve parametriche e archi conici richiedono la decomposizione del piano in celle connesse (Arrangement $\mathcal{A}(\mathcal{C})$):

$$\mathcal{A}(\mathcal{C}) = (V, E, F)$$
dove:
- $V$: vertici (punti di intersezione tra curve, radici di sistemi algebrici $f_1(x, y) = 0 \land f_2(x, y) = 0$)
- $E$: archi connessi privi di ulteriori intersezioni
- $F$: facce poligonali bidimensionali

Utilizzando predicati geometrici esatti basati su aritmetica a precisione arbitraria (o numeri razionali multiprecisione), l'algoritmo garantisce la totale assenza di crash numerici dovuti a errori di arrotondamento floating-point.

---

## 3. Note Implementative
- **Collocazione**: `crates/vector/src/boolean.rs`.
- Calcola in modo deterministico e pulito le combinazioni di sagome vettoriali per lo strumento Pathfinder.
