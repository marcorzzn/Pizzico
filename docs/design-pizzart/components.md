# Componenti visuali — Pizzart UI

> Fonte: `app.rs`, `panels.rs`, `dialogs.rs`, `canvas.rs`, `tools.rs`.

## 1. Barra superiore (`menu`)

Comandi, nell'ordine in cui compaiono:

| # | Comando | Tipo |
|---|---|---|
| 1 | `Apri…` | bottone |
| 2 | `Salva` | bottone |
| 3 | `Salva con nome…` | bottone |
| 4 | `Esporta PNG…` | bottone |
| 5 | `Nuovo documento` | bottone |
| 6 | `Annulla  (Ctrl+Z)` | bottone, disabilitato se `!can_undo` |
| 7 | `Ripeti  (Ctrl+Y)` | bottone, disabilitato se `!can_redo` |
| 8 | `Elimina layer` | bottone |
| 9 | `Adatta` | bottone (fit-to-window) |
| 10 | selettore strumenti | `selectable_label` per ogni strumento, etichetta `"Nome (tasto)"` |

Nota: la scorciatoia è scritta **dentro l'etichetta** del bottone, non in un tooltip.
Su web conviene spostarla in un tooltip e lasciare l'etichetta pulita.

## 2. Pannello destro (`pannelli`, 280 px)

Quattro sezioni in sequenza, ciascuna con un titolo:

### Strumento
- titolo `Strumento` (`heading`)
- elenco strumenti come `selectable_label`
- suggerimento `small().weak()`
- palette di colori e dimensione pennello

### Layer
- titolo `Layer` (`heading`)
- per ogni layer: nome, indicatore di visibilità, opacità, blend mode
- seleziona il layer al click (evidenzia l'elemento attivo)

### Effetti
- titolo `Effetti`
- sottotitolo `applica al layer selezionato` (`small().weak()`)
- sei effetti: `Luminosità`, `Contrasto`, `Saturazione`, `Sfocatura`, `Nitidezza`, `Bagliore`
- uno slider per ciascuno
- nessuna anteprima prima dell'applicazione

### maschere
- titolo `maschere` (`small().strong()`)
- azioni: applica rettangolo, applica ellisse, rimuovi maschera

## 3. Canvas (centro)

- sfondo RGB `(28, 30, 34)`
- disegno del documento compositato
- bordo di selezione ambra, bordo di selezione in corso azzurro
- etichette di testo disegnate sul canvas (`TextStyle::new(dimensione)`)
- pan con barra spaziatrice premuta

## 4. Barra di stato (`stato`)

- messaggi testuali: `decodifica in corso...`, errori
- colore verde chiaro per lo stato positivo, corallo per l'errore

## 5. Dialoghi

- finestre non ridimensionabili (`resizable(false)`)
- contenuto: messaggio, eventuale errore, conferma/annulla

## 6. Cosa manca (e va progettato, non copiato)

| Componente | Stato in Pizzart |
|---|---|
| Tooltip | assenti |
| Menu a tendina | assenti (tutto in barra) |
| Icone | assenti: solo testo |
| Pannello proprietà | assente |
| Anteprima effetti | assente (BUG-006) |
| Selettore font / testo multi-riga | assente (BUG-008) |
| Albero dei gruppi | assente (BUG-010) |

Questi sei punti sono il lavoro reale della Fase 6: Pizzart dice *quali* comandi
servono e *dove* stanno, non *come* devono apparire.
