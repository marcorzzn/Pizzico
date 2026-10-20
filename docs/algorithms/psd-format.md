<!--
Pizzico — docs/algorithms/psd-format.md
Riferimento manifesto: §6.5, §7
Licenza: MIT OR Apache-2.0
-->

# Specifica Formato Adobe Photoshop (PSD / PSB) e Composite Copy

## 1. Riferimenti Ufficiali
- **Documento Ufficiale**: *Adobe Photoshop File Formats Specification*
- **URL Pubblico**: [Adobe Developer Connection](https://www.adobe.com/devnet-apps/photoshop/fileformatashtml/)
- **Attribuzione Open Source**: PhotoCraft / PhotoSuite (`storytold/photocraft`, licenza MIT/Apache-2.0)

---

## 2. Struttura del Formato Binario

Un file PSD è suddiviso in 5 macro-sezioni consecutive con ordinamento dei byte Big-Endian:

1. **File Header (26 bytes)**:
   - Signature: `8BPS` (ASCII 4 bytes: `0x38 0x42 0x50 0x53`).
   - Version: `1` (PSD standard, max 30000×30000 px) o `2` (PSB Large Document Format, max 300000×300000 px).
   - Reserved: 6 bytes a zero.
   - Channels: da 1 a 56.
   - Height / Width: 4 bytes unsigned integer.
   - Depth: 1, 8, 16 o 32 bit per canale.
   - Color Mode: Bitmap (0), Grayscale (1), Indexed (2), RGB (3), CMYK (4), Multichannel (7), Duotone (8), Lab (9).
2. **Color Mode Data Section**: tavolozza colori per Indexed e curve per Duotone.
3. **Image Resources Section**: blocchi `8BIM` per risoluzione DPI, percorsi vettoriali, guide e metadati IPTC/XMP.
4. **Layer and Mask Information Section**:
   - Conteggio livelli (se negativo, valore assoluto = numero livelli, e il primo livello è il composite).
   - Struttura dei Layer Records: coordinate rettangolo di selezione $(top, left, bottom, right)$, numero canali, blend mode key (`norm`, `mul `, `scrn`, `over`, ecc.), opacità (0–255), clipping, flag di visibilità e nome stringa Pascal.
   - Canali compressi (Raw o RLE PackBits).
5. **Image Data Section**:
   - Immagine unita "Maximize Compatibility" generata dal software di origine per garantire anteprime rapide su visualizzatori terzi.

---

## 3. Note di Clean Room (§7)
- Il parser `crates/io-psd/` è implementato a partire dalla specifica Adobe formale e da test black-box sul corpus in `tests/psd-corpus/`.
