# Comportamenti interattivi — Pizzart UI

> Fonte: `app.rs` (gestione input), `state.rs` (semantica), `panels.rs`.

## Scorciatoie da tastiera (codificate)

| Tasto | Azione | Riga |
|---|---|---|
| `Ctrl+Z` | Annulla | `app.rs:210` |
| `Ctrl+Y` | Ripeti | `app.rs:211` |
| `Ctrl+Shift+Z` | Ripeti (alternativo) | `app.rs:212` |
| `Ctrl+S` | Salva | `app.rs:213` |
| `Ctrl+Shift+S` | Salva con nome | `app.rs:214` |
| `Ctrl+O` | Apri | `app.rs:215` |
| `Ctrl+E` | Esporta PNG | `app.rs:216` |
| `Ctrl+0` | Adatta | `app.rs:217` |
| `Ctrl+=` | Zoom avanti | `app.rs:218` |
| `Ctrl+-` | Zoom indietro | `app.rs:219` |
| `Enter` | Conferma (dialogo / operazione) | `app.rs:220` |
| `Escape` | Annulla operazione in corso | `app.rs:221` |
| `Spazio` (tenuto) | Pan del canvas | `app.rs:325` |

`Cmd` è mappato su `modifiers.command`, quindi su macOS funziona con `⌘`.

## Selezione del layer

- click su una riga del pannello Layer → `selected = Some(id)`
- l'elemento selezionato è evidenziato
- gli effetti agiscono **solo** sul layer selezionato (dichiarato nella UI)
- eliminare il layer selezionato lo rimuove e azzera la selezione

## Drag dell'opacità

Comportamento in Pizzart (`state.rs`, struct `OpacityDrag`):

1. `begin_opacity_drag(layer)` memorizza il valore originale
2. `update_opacity_drag(value)` modifica il layer **senza** toccare la history
3. `end_opacity_drag()` crea **un solo** comando con il valore finale

Questo è il comportamento corretto, ed è già riprodotto in `pizzico-session` con test
dedicati (`drag_di_opacita_produce_un_solo_comando`).

Attenzione: il report interno segnala BUG-003 — «Ctrl+Z durante il drag di opacità
desincronizza la storia». La causa è che l'undo può scattare mentre il drag è aperto.
In `pizzico-session` il drag è uno stato esplicito (`is_dragging_opacity`): l'host deve
**ignorare undo/redo finché il drag è aperto**, oppure chiamare `end_opacity_drag()`
prima. È una regola da rispettare nell'adattatore web.

## Effetti

- si applicano al layer selezionato
- nessuna anteprima (BUG-006: l'utente scopre il risultato solo dopo)
- ogni applicazione **duplica l'intero layer** (BUG-009): costo di memoria doppio
- sei effetti disponibili, uno slider ciascuno

In `pizzico-session` l'effetto crea un layer nuovo (non distruttivo) tramite
`EffectApplier`: l'host decide se usare la CPU (`pizzico-engine-render::cpu`) o la GPU.
Il costo "layer duplicato" resta: va affrontato in Fase 6.5 con un modello a parametri
non distruttivo (effetto come modificatore, non come copia).

## Selezione → maschera

- rettangolo tracciato sul canvas (`begin_selection` / `update_selection`)
- `apply_selection_as_mask` converte il rettangolo in `Mask` e la assegna al layer
- ellisse: `apply_ellipse_mask`
- rimozione: `clear_mask`

In Pizzart la selezione vive in `Editor.selection: Option<(f32, f32, f32, f32)>` e non
è nel documento: è uno stato di sessione. `pizzico-session` mantiene la stessa scelta.

## Disegno

- `begin_stroke` azzera i punti
- `push_point` accumula `(x, y, pressione, tilt)`
- `finish_stroke` rasterizza il tratto in un nuovo layer
- il pennello ha dimensione, colore, durezza, opacità, spaziatura, stabilizzazione

BUG-002 del report: cambiare strumento a metà tratto lasciava punti orfani.
In `pizzico-session` `begin_stroke` azzera sempre i punti, e `set_tool` **annulla la
selezione in corso**: i punti del tratto si azzerano al tratto successivo, non restano
appesi. Resta però possibile chiudere un tratto con `finish_stroke` anche dopo un
cambio strumento: l'host dovrebbe chiamarlo in `set_tool`. Regola annotata per Fase 4.

## Zoom e pan

- zoom fra 10% e 3200% (`set_zoom` limita)
- `fit_to(viewport)` calcola lo zoom dal lato limitante
- pan con barra spaziatrice tenuta premuta

## Cosa l'host deve fare (contratto per la Fase 4)

1. Chiamare `end_opacity_drag()` prima di qualunque `undo()`/`redo()`.
2. Chiamare `finish_stroke()` prima di cambiare strumento.
3. Non modificare il documento via `document_mut()` durante un'operazione interattiva.
4. Implementare `EffectApplier` con `pizzico-engine-render::cpu` sul web.
