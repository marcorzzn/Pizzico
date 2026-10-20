<!--
Pizzico — crates/core/README.md
Riferimento manifesto: §3.1, §4, §6.1
Licenza: MIT OR Apache-2.0
-->

# pizzico-core

Crate centrale di Pizzico per la gestione del documento, della gerarchia dei livelli polimorfici (raster e vettoriali), dello storico delle modifiche (undo/redo non lineare) e delle regole di alpha compositing e blend modes.

## Riferimenti Scientifici (§6.1)
- **Alpha Compositing**: Smith, Alvy Ray. *Alpha and the History of Digital Compositing*, Microsoft Research Memo 7, 1995.
- **Unblending & Non-linear Blend Modes**: Horita et al. *Unblending for Layered Image Decomposition*, WACV 2022.
- **Document Model**: Ispirazione da specifiche PSD ufficiali Adobe e astrazioni Clean Room.
