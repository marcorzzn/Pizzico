<!--
Pizzico — docs/ui/principles.md
Riferimento manifesto: §5
Licenza: MIT OR Apache-2.0
-->

# Principi Scientifici di UI/UX — Progetto Pizzico

Pizzico non copia layout commerciali preesistenti né si basa su decisioni estetiche arbitrarie. L'interfaccia utente è interamente governata da principi accademici verificabili di **Human-Computer Interaction (HCI)** e psicologia cognitiva.

---

## 1. Fondamenti Scientifici di Interazione (§5.1)

| Principio | Fonte Accademica | Applicazione Diretta in Pizzico |
|---|---|---|
| **Cognitive Load Theory** | Sweller, J. (1988), *Cognitive load during problem solving: Effects on learning*, Cognitive Science. | Minimizzazione del carico cognitivo estraneo: nessuna barra degli strumenti infinita con centinaia di icone statiche. Solo strumenti pertinenti al contesto attivo. |
| **Legge di Hick-Hyman** | Hick, W. E. (1952) / Hyman, R. (1953) | Il tempo di decisione scala logaritmicamente: $T = b \cdot \log_2(n + 1)$. I sottomenu e gruppi di strumenti mostrano un massimo di 4–7 opzioni alla volta; il resto è accessibile tramite Command Palette (⌘K) o overflow semantico. |
| **Legge di Fitts** | Fitts, P. M. (1954), *The information capacity of the human motor system in controlling the amplitude of movement*. | Il tempo di puntamento $T = a + b \log_2(2D / W)$. I comandi critici globali sono posizionati sui bordi dello schermo (aree a dimensione virtuale infinita nei display); i controlli di rifinitura compaiono nell'HUD contestuale fluttuante adiacente al cursore. |
| **Progressive Disclosure** | Nielsen, J. (2006), *Progressive Disclosure*, Nielsen Norman Group. | Rivelazione progressiva a tre livelli (§5.2). Le complessità matematiche dei nodi Bézier o dei canali di colore non intralciano l'utente nelle azioni macro. |
| **Cost of Context Switching** | Ricerca su micro-interruzioni e memoria di lavoro (Altmann & Trafton, 2002). | Workspace Mode Switcher integrato per alternare flussi di fotoritocco, vettoriali e macro senza cambiare software. |
| **Chunking** | Miller, G. A. (1956), *The magical number seven, plus or minus two*. | Tutti i pannelli laterali e opzioni dei filtri sono raggruppati in chunk semantici (massimo 4 blocchi per visuale). |

---

## 2. Rivelazione Progressiva a Tre Livelli (§5.2)

1. **Livello 1 — Macro / Semantico (Picsart-like)**:
   - Slider unificati ad alto livello (es. "Luce", "Calore", "Contrasto automatico").
   - Azioni one-tap immediate (rimozione sfondo deterministica, auto-crop, filtri cromatici 3D LUT).
   - Nessuna richiesta preventiva di curve, canali o impostazioni spettrali.
2. **Livello 2 — Controllo Parametrico (Photoshop/Illustrator base)**:
   - Forme geometriche vettoriali, maschere di livello, blend modes, regolazioni numeriche HSL, curve RGB e istogrammi.
3. **Livello 3 — Ispezione Microscopica (Ingegneristico / Avanzato)**:
   - Manipolazione diretta dei punti di ancoraggio e tangenti Bézier cubiche, editor di κ-curves con continuità G2, separazione in frequenza, canali alfa/CMYK e tracciati composti.

---

## 3. Superficie Contestuale (Context-Aware Surface §5.3)

La barra delle proprietà e la barra di stato si adattano in tempo reale al contenuto della selezione:
- **Selezione raster attiva** $\to$ visualizza istogramma di luminanza, campionatore colori, filtri di disturbo e raggio pennello.
- **Selezione vettoriale attiva** $\to$ visualizza spessore del tratto (Euler spiral), raggio di curvatura, stile join/cap e pulsanti booleani Pathfinder.
- **Selezione testo attiva** $\to$ visualizza impostazioni di OpenType shaping (legature, kerning, font family).

---

## 4. Canvas Polimorfico Unificato (§5.4)

A differenza dei software tradizionali che separano rigidamente l'ambiente pixel da quello vettoriale, in Pizzico ogni livello può essere:
- Un buffer bitmap puro.
- Un tracciato vettoriale o forma geometrica analitica.
- Un gruppo ibrido.

Gli effetti e filtri di stile non distruttivi vengono valutati uniformemente all'interno della pipeline GPU unificata (WebGPU).

---

## 5. Linee Guida di Usabilità e Accessibilità (§5.6)
1. Massimo **2 livelli** di annidamento per qualsiasi sottomenu o popover.
2. Feedback visivo continuo: le anteprime di trasformazioni o filtri sono elaborate in streaming in background senza mai bloccare il thread di rendering a 60 FPS.
3. Astrazione totale dei dispositivi di input: le gesture touch, penna capacitiva con pressione e mouse tradizionale convergono in un'unica interfaccia unificata.
