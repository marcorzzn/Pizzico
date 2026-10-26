# Layout — Pizzart UI

> Fonte: `pizzart/crates/ui/src/app.rs` e `panels.rs`. Tutte le misure sono quelle
> **codificate**, non stimate.

## Pannelli

| Pannello | Tipo egui | Posizione | Misura | Ridimensionabile |
|---|---|---|---|---|
| `menu` | `TopBottomPanel::top` | alto | altezza automatica | no |
| `pannelli` | `SidePanel::right` | destra | **280 px** (`default_width(280.0)`) | **sì** (`resizable(true)`) |
| `stato` | `TopBottomPanel::bottom` | basso | altezza automatica | no |
| canvas | `CentralPanel` | centro | occupa il resto | — |
| dialoghi | `egui::Window` | modale | automatica | no (`resizable(false)`) |

Citazioni dal codice:

```rust
egui::TopBottomPanel::top("menu").show(ctx, |ui| { ... });      // app.rs:100
egui::SidePanel::right("pannelli")
    .resizable(true)
    .default_width(280.0);                                       // app.rs:474-476
egui::TopBottomPanel::bottom("stato").show(ctx, |ui| { ... });   // app.rs:496
egui::CentralPanel::default().show(ctx, |ui| { ... });           // app.rs:275
```

## Schema

```
┌──────────────────────────────────────────────────────────────┐
│ menu: Apri · Salva · Salva con nome · Esporta PNG · Nuovo    │  alto, auto
│        Annulla (Ctrl+Z) · Ripeti (Ctrl+Y) · Elimina layer     │
│        Adatta · [Seleziona][Pennello][Testo][Rettangolo]      │
├───────────────────────────────────────────────┬──────────────┤
│                                               │  pannelli    │
│                                               │  280 px      │
│                 canvas                        │  ridimens.   │
│            (CentralPanel, sfondo             │              │
│             RGB 28,30,34)                     │  ▸ Strumento │
│                                               │  ▸ Layer     │
│                                               │  ▸ Effetti   │
│                                               │  ▸ maschere  │
├───────────────────────────────────────────────┴──────────────┤
│ stato: messaggi ("decodifica in corso...", errori)            │  basso, auto
└──────────────────────────────────────────────────────────────┘
```

## Note di struttura

- Il pannello destro è **uno solo** che contiene quattro sezioni in sequenza
  (`Strumento`, `Layer`, `Effetti`, `maschere`), non quattro pannelli separati.
- La sezione `Effetti` dichiara esplicitamente il proprio contesto:
  «applica al layer selezionato».
- La barra superiore mescola comandi di file, history, struttura layer e strumenti:
  nella UI web conviene separarli (menu File / toolbar strumenti), perché su mobile
  una riga con nove comandi non sta.
- Non esiste un pannello "colori": il colore del pennello viene da una palette fissa
  nel pannello strumento.
