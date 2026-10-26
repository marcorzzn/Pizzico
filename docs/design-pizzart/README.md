# Design system di Pizzart — materiale per la Fase 6

> Estratto in sola lettura da `pizzart/crates/ui/src/*.rs` il 2026-10-26.
> **Non è una proposta di design**: è l'inventario di ciò che esiste, con la
> distinzione esplicita fra ciò che è codificato e ciò che va deciso.

## Sintesi in una riga

Pizzart ha una **struttura** e dei **comportamenti** ben definiti, ma non ha un
design system visivo: nessun font custom, nessuna scala tipografica, nessuna costante
di spaziatura, cinque colori in tutto. Chi cerca una palette da copiare non la troverà.

## 1. Layout

```
┌──────────────────────────────────────────────────────┐
│ menu (alto)                                          │
├──────────────────────────────────────┬───────────────┤
│                                      │ pannelli      │
│              canvas                  │ 280 px        │
│        sfondo #1c1e22                │ ridimens.     │
│                                      │ Strumento     │
│                                      │ Layer         │
│                                      │ Effetti       │
│                                      │ maschere      │
├──────────────────────────────────────┴───────────────┤
│ stato (basso)                                        │
└──────────────────────────────────────────────────────┘
```

Dettagli e citazioni delle righe in [layout.md](layout.md).

## 2. Palette

Cinque colori, tutti funzionali:

| Token | Hex | Uso |
|---|---|---|
| canvas | `#1c1e22` | fondo dell'area di disegno |
| selezione confermata | `#ffbe3c` | bordo ambra |
| selezione in corso | `#78c8ff` | bordo azzurro |
| errore | `#f07864` | testo corallo |
| ok | `#a0c8a0` | testo verde |

Il resto è il tema scuro predefinito di egui. Dettagli e CSS in [palette.md](palette.md).

## 3. Tipografia e spaziature

Nessuna delle due è definita: Pizzart usa i default di egui (`ui.heading`,
`RichText::small()`, `Spacing::default()`). Non c'è nulla da estrarre; c'è da
**decidere**. Bozze e soglie in [typography.md](typography.md).

## 4. Componenti

Barra superiore (10 comandi), pannello destro con 4 sezioni, canvas, barra di stato,
dialoghi non ridimensionabili. Elenco completo e cosa manca in
[components.md](components.md).

## 5. Comportamenti

13 scorciatoie, drag opacità a comando singolo, selezione→maschera, tratto con
pressione, zoom/pan. In [behavior.md](behavior.md), con il **contratto che l'host
della Fase 4 deve rispettare** (chiudere il drag prima di undo, chiudere il tratto
prima di cambiare strumento).

## 6. Screenshot

**Disponibili** in `screenshots/`, forniti dal committente il 2026-10-26:

| File | Cosa mostra |
|---|---|
| `01-pennello-e-pannelli.png` | strumento Pennello attivo, pannello destro completo (Strumento, Layer, Effetti, maschere), barra di stato |
| `02-strumento-selezione.png` | strumento Seleziona attivo, pannello Strumento contestuale |
| `03-menu-file.png` | menu `File` aperto (Apri, Salva, Salva con nome, Esporta PNG, Nuovo documento) |

### Cosa aggiungono rispetto alla lettura del codice

1. **Il tema è chiaro**, non scuro: pannelli grigio chiaro, widget di sistema, canvas
   scuro. Smentisce l'ipotesi iniziale ("tema scuro di egui").
2. Esiste una **barra dei menu** (`File`, `Modifica`, `Vista`) che nel codice si legge
   come `TopBottomPanel::top("menu")` con bottoni: a schermo è un menu vero, con
   tendina.
3. Il centro della barra superiore mostra un **suggerimento contestuale** che cambia
   con lo strumento («trascina per disegnare», «clicca un layer per selezionarlo»,
   «trascina per selezionare, invio applica la maschera»).
4. Gli strumenti hanno **lettere fra parentesi** (`Seleziona (S)`, `Pennello (B)`,
   `Testo (T)`, `Selezione (R)`) e quello attivo è un **rettangolo pieno azzurro**.
5. La barra di stato mostra **quattro informazioni** in fila: `1280×800`, `zoom 100%`,
   `nessun layer selezionato`, nome della GPU. In basso a destra: `documento nuovo`.
6. La sezione **Strumento** mostra una frase di stato incoerente con lo strumento
   attivo («Il pennello è attivo con lo strumento Pennello (B)» mentre è attiva la
   selezione): è un difetto reale, non un artefatto della cattura.
7. I controlli sono **widget di sistema** (slider grigi con pallino, tendina con
   freccia): non c'è styling proprio.

### Cattura futura

Serve ancora una schermata con un documento aperto e 3+ layer: le tre disponibili
mostrano tutte il documento vuoto (0 layer, 0 gruppi).

## 7. Discrepanze fra report e codice

`docs/pizzart/REPORT_UI_20261025.md` è un'**istantanea** del 2026-10-25. Il codice è
cambiato dopo. Verificato:

| Bug dichiarato | Stato nel codice attuale | Evidenza |
|---|---|---|
| BUG-001 · Il pennello non ha impostazioni | **Già risolto** | `panels.rs:128-131` ha slider `dimensione`, `opacita`, `durezza`, `stabilizza` |
| BUG-010 · I gruppi sono invisibili nella UI | **Parzialmente risolto** | `panels.rs:168` mostra «N layer · M gruppi» e filtra i nodi gruppo |
| BUG-003 · Ctrl+Z durante il drag opacità desincronizza | Da verificare a runtime | il codice usa `begin/update/end_opacity_drag`, ma l'undo può scattare a drag aperto |

Commento obsoleto trovato: `panels.rs:104` dice ancora «dimensione fissi, il che rende
inutilizzabile lo strumento principale», mentre le righe 128-131 aggiungono proprio
quei controlli.

**Conseguenza**: i 10 bug del report non vanno usati come backlog così come sono.
Metà potrebbero essere già chiusi. Vanno ri-testati uno per uno prima della Fase 6, e
il risultato scritto qui.

## 8. Cosa prendere e cosa inventare (Fase 6)

| Prendere da Pizzart | Inventare ex novo |
|---|---|
| Skeletro dei pannelli (top / destra 280 / basso / centro) | Tipografia e scala |
| I 5 colori semantici | Superfici, bordi, elevazione |
| Le 13 scorciatoie | Icone (Pizzart non ne ha) |
| Il contratto di comportamento (drag, selezione, tratto) | Tooltip, menu, pannello proprietà |
| La regola "un comando per drag" | Anteprima effetti, modello non distruttivo |
| La separazione sessione/UI (già in `pizzico-session`) | Layout mobile e aree di tocco |

## 9. Avvertenza per chi implementa

La tentazione sarà di "replicare Pizzart in CSS". Non funziona: egui non è il DOM.
Le altezze dei widget, il padding e il comportamento dei pannelli ridimensionabili
seguono regole diverse. Va replicato **l'ordine delle informazioni e la densità
percepita**, misurando a schermo, non la geometria esatta.
