# Palette — Pizzart UI

> Fonte: ricerca di `Color32` in `pizzart/crates/ui/src/*.rs`, **verificata contro gli
> screenshot reali** in `docs/design-pizzart/screenshots/`.
>
> **Risultato onesto: Pizzart non ha una palette.** Usa il tema predefinito di egui e
> definisce **cinque** colori, tutti legati a funzioni specifiche.
>
> **Correzione rispetto alla prima stesura**: gli screenshot mostrano il tema
> **chiaro** di egui (pannelli grigio chiaro, widget di sistema). La stesura
> precedente diceva "tema scuro": era un'ipotesi sbagliata, smentita dall'evidenza.
> Il canvas invece è scuro per scelta (`#1c1e22`), e questo produce il contrasto
> chiaro/scuro visibile nelle schermate.

## Colori definiti nel codice

| Nome nel codice | RGB | Hex | Dove | Uso |
|---|---|---|---|---|
| *(letterale)* | 28, 30, 34 | `#1c1e22` | `app.rs:292` | sfondo dell'area canvas |
| `BORDO_SELEZIONE` | 255, 190, 60 | `#ffbe3c` | `canvas.rs:71` | bordo di una selezione confermata |
| `SELEZIONE_IN_CORSO` | 120, 200, 255 | `#78c8ff` | `canvas.rs:73` | bordo durante il trascinamento |
| *(letterale)* | 240, 120, 100 | `#f07864` | `dialogs.rs:103` | testo di errore |
| *(letterale)* | 160, 200, 160 | `#a0c8a0` | `panels.rs:376` | testo di stato positivo |

Tutto il resto (sfondo pannelli, testo, bordi, bottoni) viene dal tema scuro di egui:
non è codificato, quindi non è estraibile come token.

## Conseguenza per Pizzico

Non si può "replicare la palette di Pizzart" perché non esiste. Le opzioni sono:

1. **Usare egui-dark come riferimento** e ricavarne i valori (grigi caldi, accento
   blu tenue) — ma sono valori di una libreria, non del progetto.
2. **Definire i token in `packages/ui-kit`** partendo dai cinque colori qui sopra
   (che sono l'unica scelta autoriale) e completando il resto come decisione nuova.

Raccomandazione: opzione 2. I cinque colori hanno un senso preciso (canvas scuro,
selezione ambra, selezione in corso azzurra, errore corallo, ok verde) e vanno
conservati come **token semantici**, non come valori sparsi.

## Bozza di token CSS (dai soli colori autoriali)

```css
:root {
  /* Colori presenti nel codice di Pizzart */
  --pz-canvas-bg:          #1c1e22;
  --pz-selection-confirmed:#ffbe3c;
  --pz-selection-active:   #78c8ff;
  --pz-danger:             #f07864;
  --pz-success:            #a0c8a0;

  /* Da definire in Fase 6: superfici, testo, bordi, accento.
     Non esistono in Pizzart, quindi non vanno inventati qui fingendo
     di estrarli: sono una decisione di prodotto. */
  --pz-surface-0:  #1c1e22;   /* = canvas, riusato come fondo app */
  --pz-surface-1:  #24272c;   /* ipotesi, da validare */
  --pz-surface-2:  #2d3138;   /* ipotesi, da validare */
  --pz-border:     #3a3f47;   /* ipotesi, da validare */
  --pz-text:       #d8dbe0;   /* ipotesi, da validare */
  --pz-text-muted: #8b939e;   /* ipotesi, da validare */
  --pz-accent:     #78c8ff;   /* = selezione in corso, promosso ad accento */
}
```

Le voci marcate "ipotesi" **non sono estratte**: sono proposte. La Fase 6 deve
validarle a schermo, non ereditarle come se fossero misurate.
