<!--
Pizzico — crates/io-native/README.md
Riferimento manifesto: §3.1, §4
Licenza: MIT OR Apache-2.0
-->

# pizzico-io-native

Gestione del formato di salvataggio nativo `.pizzico`:
Un archivio compresso containerizzante contenente:
- `manifest.json`: Versione del formato, generatore, metadati.
- `document.json`: Albero dei livelli, gerarchia, stili, parametri vettoriali.
- `blobs/`: File binari raw (bitmap raw per layer raster, curve, font incorporati).
- `preview.png`: Thumbnail composita per visualizzatori esterni.
